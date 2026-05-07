import { api } from '@service-ops/convex/api'
import type { Id } from '@service-ops/convex/dataModel'
import { useNavigate } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { Loader2, Mic, Square } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { SummaryPanel } from '@/components/SummaryPanel'
import { cn } from '@/lib/cn'
import { useRecorder } from './useRecorder'
import { useVoiceContext } from './VoiceContext'

const MAX_RECORDING_MS = 30_000

type Role = 'client' | 'worker' | 'manager'

type AskAnythingResponse =
  | {
      intent: 'create_service_request'
      transcription: string
      draft: {
        serviceType?: string
        date?: string
        time?: string
        notes?: string
      }
    }
  | {
      intent: 'draft_message'
      transcription: string
      chatRoomId: string
      draftText: string
    }
  | {
      intent: 'draft_message'
      transcription: string
      ambiguous: true
      candidates: Array<{ chatRoomId: string; label: string }>
      draftText: string
    }
  | {
      intent: 'summarize_request'
      transcription: string
      requestId: string
    }
  | {
      intent: 'summarize_request'
      transcription: string
      ambiguous: true
      candidates: Array<{ requestId: string; label: string }>
    }
  | { intent: 'unknown'; transcription: string; message: string }

type AmbiguousChat = {
  candidates: Array<{ chatRoomId: string; label: string }>
  draftText: string
}

type AmbiguousRequest = {
  candidates: Array<{ requestId: string; label: string }>
}

export function MicButton({ userRole }: { userRole: Role }) {
  const navigate = useNavigate()
  const { context } = useVoiceContext()
  const { isRecording, durationMs, startRecording, stopRecording } =
    useRecorder()
  const generateUploadUrl = useAction(api.ai.transcribe.generateUploadUrl)
  const askAnything = useAction(api.ai.askAnything.askAnything)
  const summarize = useAction(api.ai.summary.summarizeRequest)

  const [isProcessing, setIsProcessing] = useState(false)
  const [ambiguousChat, setAmbiguousChat] = useState<AmbiguousChat | null>(null)
  const [ambiguousRequest, setAmbiguousRequest] =
    useState<AmbiguousRequest | null>(null)
  const [streamId, setStreamId] = useState<Id<'summaryStreams'> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goToCreateRequest = useCallback(
    (draft: {
      serviceType?: string
      date?: string
      time?: string
      notes?: string
    }) => {
      void navigate({
        to: '/client/requests/new',
        search: {
          serviceType: draft.serviceType,
          date: draft.date,
          time: draft.time,
          notes: draft.notes,
        },
      })
    },
    [navigate],
  )

  const goToChat = useCallback(
    (chatRoomId: string, draftText: string) => {
      const path =
        userRole === 'client'
          ? '/client/messages/$chatRoomId'
          : '/dashboard/messages/$chatRoomId'
      void navigate({
        to: path,
        params: { chatRoomId },
        search: { draft: draftText },
      })
    },
    [navigate, userRole],
  )

  const triggerSummary = useCallback(
    async (requestId: string) => {
      try {
        const { streamId: sid } = await summarize({
          requestId: requestId as Id<'serviceRequests'>,
        })
        setStreamId(sid)
      } catch (err) {
        alert((err as Error).message)
      }
    },
    [summarize],
  )

  const dispatchIntent = useCallback(
    async (response: AskAnythingResponse) => {
      switch (response.intent) {
        case 'create_service_request':
          goToCreateRequest(response.draft)
          return
        case 'draft_message':
          if ('ambiguous' in response && response.ambiguous) {
            setAmbiguousChat({
              candidates: response.candidates,
              draftText: response.draftText,
            })
          } else if ('chatRoomId' in response) {
            goToChat(response.chatRoomId, response.draftText)
          }
          return
        case 'summarize_request':
          if ('ambiguous' in response && response.ambiguous) {
            setAmbiguousRequest({ candidates: response.candidates })
          } else if ('requestId' in response) {
            await triggerSummary(response.requestId)
          }
          return
        case 'unknown':
          alert(response.message)
          return
      }
    },
    [goToCreateRequest, goToChat, triggerSummary],
  )

  const sendAudio = useCallback(
    async (blob: Blob, mimeType: string) => {
      setIsProcessing(true)
      try {
        const uploadUrl = await generateUploadUrl({})
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': mimeType },
          body: blob,
        })
        if (!uploadRes.ok)
          throw new Error(`Upload failed (${uploadRes.status})`)
        const { storageId } = (await uploadRes.json()) as {
          storageId: Id<'_storage'>
        }
        const response = await askAnything({
          audioStorageId: storageId,
          context: {
            screen: context.screen,
            role: userRole,
            currentChatRoomId: context.currentChatRoomId,
            currentRequestId: context.currentRequestId,
            draftFormState: context.draftFormState,
          },
        })
        await dispatchIntent(response as AskAnythingResponse)
      } catch (err) {
        console.error('[MicButton] failed', err)
        alert("Sorry, I didn't catch that.")
      } finally {
        setIsProcessing(false)
      }
    },
    [generateUploadUrl, askAnything, context, userRole, dispatchIntent],
  )

  const onPointerDown = useCallback(async () => {
    if (isProcessing || isRecording) return
    const ok = await startRecording()
    if (!ok) return
    timeoutRef.current = setTimeout(async () => {
      timeoutRef.current = null
      const result = await stopRecording()
      if (result) await sendAudio(result.blob, result.mimeType)
    }, MAX_RECORDING_MS)
  }, [isProcessing, isRecording, startRecording, stopRecording, sendAudio])

  const onPointerUp = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (!isRecording) return
    const result = await stopRecording()
    if (result) await sendAudio(result.blob, result.mimeType)
  }, [isRecording, stopRecording, sendAudio])

  // Suppress on chat detail — chat composer handles voice in-place.
  if (context.screen === 'chat') return null

  const seconds = Math.floor(durationMs / 1000)

  return (
    <>
      <div className="fixed right-6 bottom-24 z-30 md:bottom-6">
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          disabled={isProcessing}
          aria-label={isRecording ? 'Stop recording' : 'Hold to speak'}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition',
            isRecording
              ? 'bg-status-progress'
              : isProcessing
                ? 'bg-surface-3'
                : 'bg-brand-500 hover:bg-brand-600',
          )}
        >
          {isProcessing ? (
            <Loader2 size={22} className="animate-spin" />
          ) : isRecording ? (
            <Square size={20} fill="currentColor" />
          ) : (
            <Mic size={24} />
          )}
        </button>
        {isRecording ? (
          <p className="mt-2 text-center text-surface-text text-xs">
            {seconds}s
          </p>
        ) : null}
      </div>

      {ambiguousChat ? (
        <PickerModal
          title="Which chat?"
          subtitle={`Draft: "${ambiguousChat.draftText}"`}
          options={ambiguousChat.candidates.map((c) => ({
            id: c.chatRoomId,
            label: c.label,
          }))}
          onPick={(id) => {
            const draft = ambiguousChat.draftText
            setAmbiguousChat(null)
            goToChat(id, draft)
          }}
          onClose={() => setAmbiguousChat(null)}
        />
      ) : null}

      {ambiguousRequest ? (
        <PickerModal
          title="Which request?"
          options={ambiguousRequest.candidates.map((c) => ({
            id: c.requestId,
            label: c.label,
          }))}
          onPick={async (id) => {
            setAmbiguousRequest(null)
            await triggerSummary(id)
          }}
          onClose={() => setAmbiguousRequest(null)}
        />
      ) : null}

      <SummaryPanel streamId={streamId} onClose={() => setStreamId(null)} />
    </>
  )
}

function PickerModal({
  title,
  subtitle,
  options,
  onPick,
  onClose,
}: {
  title: string
  subtitle?: string
  options: Array<{ id: string; label: string }>
  onPick: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-surface-0 p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-base text-surface-text">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface-2 px-3 py-1 text-sm text-surface-text hover:bg-surface-3"
          >
            Close
          </button>
        </div>
        {subtitle ? (
          <p className="mt-1 text-sm text-surface-text-muted">{subtitle}</p>
        ) : null}
        <ul className="mt-4 grid gap-2">
          {options.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => onPick(opt.id)}
                className="block w-full rounded-2xl border border-surface-3 bg-surface-1 px-4 py-3 text-left text-base text-surface-text hover:bg-surface-2"
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
