import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { api } from '@service-ops/convex/api'
import type { Id } from '@service-ops/convex/dataModel'
import { useAction } from 'convex/react'
import { useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  type GestureResponderEvent,
  Pressable,
  View,
} from 'react-native'
import { AmbiguousChatSheet } from './AmbiguousChatSheet'
import { AmbiguousRequestSheet } from './AmbiguousRequestSheet'
import { SummarySheet } from './SummarySheet'
import { useAudioRecording } from './useAudioRecording'
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

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Floating press-and-hold microphone. Mounted once per role layout. Recording
 * → upload to Convex storage → `ai.askAnything` action → route on intent.
 *
 * AI never silently submits, sends, or assigns. Every intent funnels into a
 * UI state where the user reviews and confirms.
 */
export function MicButton({ userRole }: { userRole: Role }) {
  const router = useRouter()
  const { context } = useVoiceContext()
  const { isRecording, durationMs, startRecording, stopRecording } =
    useAudioRecording()
  const generateUploadUrl = useAction(api.ai.transcribe.generateUploadUrl)
  const askAnything = useAction(api.ai.askAnything.askAnything)
  const summarize = useAction(api.ai.summary.summarizeRequest)

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Routed intent state — shown via the Ambiguous*/Summary sheets.
  const [ambiguousChat, setAmbiguousChat] = useState<{
    candidates: Array<{ chatRoomId: string; label: string }>
    draftText: string
  } | null>(null)
  const [ambiguousRequest, setAmbiguousRequest] = useState<{
    candidates: Array<{ requestId: string; label: string }>
  } | null>(null)
  const [summaryStreamId, setSummaryStreamId] =
    useState<Id<'summaryStreams'> | null>(null)

  const navigateToCreateRequest = useCallback(
    (draft: {
      serviceType?: string
      date?: string
      time?: string
      notes?: string
    }) => {
      const params: Record<string, string> = {}
      if (draft.serviceType) params.serviceType = draft.serviceType
      if (draft.date) params.date = draft.date
      if (draft.time) params.time = draft.time
      if (draft.notes) params.notes = draft.notes
      router.push({
        pathname: '/(client)/requests/new',
        params,
      })
    },
    [router],
  )

  const navigateToChatWithDraft = useCallback(
    (chatRoomId: string, draft: string) => {
      const path =
        userRole === 'client'
          ? '/(client)/messages/[chatRoomId]'
          : userRole === 'worker'
            ? '/(worker)/messages/[chatRoomId]'
            : '/(manager)/messages/[chatRoomId]'
      router.push({
        pathname: path,
        params: { chatRoomId, draft },
      })
    },
    [userRole, router],
  )

  const triggerSummary = useCallback(
    async (requestId: string) => {
      try {
        const { streamId } = await summarize({
          requestId: requestId as Id<'serviceRequests'>,
        })
        setSummaryStreamId(streamId)
      } catch (err) {
        Alert.alert('Could not summarize', (err as Error).message)
      }
    },
    [summarize],
  )

  const dispatchIntent = useCallback(
    async (response: AskAnythingResponse) => {
      switch (response.intent) {
        case 'create_service_request':
          navigateToCreateRequest(response.draft)
          return
        case 'draft_message':
          if ('ambiguous' in response && response.ambiguous) {
            setAmbiguousChat({
              candidates: response.candidates,
              draftText: response.draftText,
            })
          } else if ('chatRoomId' in response) {
            navigateToChatWithDraft(response.chatRoomId, response.draftText)
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
          Alert.alert('Got it', response.message)
          return
      }
    },
    [navigateToCreateRequest, navigateToChatWithDraft, triggerSummary],
  )

  const sendAudio = useCallback(
    async (uri: string) => {
      setIsProcessing(true)
      setError(null)
      try {
        const uploadUrl = await generateUploadUrl({})
        const audioRes = await fetch(uri)
        const blob = await audioRes.blob()
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'audio/m4a' },
          body: blob,
        })
        if (!uploadRes.ok) {
          throw new Error(`Upload failed (${uploadRes.status})`)
        }
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
        console.error('[MicButton] send failed', err)
        setError("Sorry, I didn't catch that.")
      } finally {
        setIsProcessing(false)
      }
    },
    [generateUploadUrl, askAnything, context, userRole, dispatchIntent],
  )

  const onPressIn = useCallback(
    async (_e: GestureResponderEvent) => {
      if (isProcessing) return
      setError(null)
      const ok = await startRecording()
      if (!ok) {
        Alert.alert(
          'Microphone permission needed',
          'Allow microphone access in Settings to use voice.',
        )
        return
      }
      timeoutRef.current = setTimeout(async () => {
        timeoutRef.current = null
        const uri = await stopRecording()
        setError('That was a bit long — try a shorter request.')
        if (uri) await sendAudio(uri)
      }, MAX_RECORDING_MS)
    },
    [isProcessing, startRecording, stopRecording, sendAudio],
  )

  const onPressOut = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (!isRecording) return
    const uri = await stopRecording()
    if (uri) await sendAudio(uri)
  }, [isRecording, stopRecording, sendAudio])

  // The chat detail screen has its own inline mic in the composer — hide the
  // global floater there so the two don't compete for the same gesture area.
  if (context.screen === 'chat') {
    return null
  }

  // Reads but doesn't render the unused durationMs/error/formatDuration —
  // intentionally suppressed; the recording duration is communicated by the
  // pulsing button color, and errors surface as Alerts.
  void durationMs
  void error
  void formatDuration

  const buttonClass = isRecording
    ? 'h-14 w-14 items-center justify-center rounded-full bg-status-progress shadow-lg'
    : isProcessing
      ? 'h-14 w-14 items-center justify-center rounded-full bg-surface-3 shadow-lg'
      : 'h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg'

  return (
    <>
      <View
        pointerEvents="box-none"
        className="absolute right-4 bottom-24 items-end"
      >
        <Pressable
          accessibilityRole="button"
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isProcessing}
          className={buttonClass}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : isRecording ? (
            <Ionicons name="stop" size={22} color="#fff" />
          ) : (
            <MaterialCommunityIcons name="waveform" size={28} color="#fff" />
          )}
        </Pressable>
      </View>

      <AmbiguousChatSheet
        visible={ambiguousChat !== null}
        draftText={ambiguousChat?.draftText ?? ''}
        candidates={ambiguousChat?.candidates ?? []}
        onPick={(chatRoomId) => {
          const draft = ambiguousChat?.draftText ?? ''
          setAmbiguousChat(null)
          navigateToChatWithDraft(chatRoomId, draft)
        }}
        onClose={() => setAmbiguousChat(null)}
      />
      <AmbiguousRequestSheet
        visible={ambiguousRequest !== null}
        candidates={ambiguousRequest?.candidates ?? []}
        onPick={async (requestId) => {
          setAmbiguousRequest(null)
          await triggerSummary(requestId)
        }}
        onClose={() => setAmbiguousRequest(null)}
      />
      <SummarySheet
        streamId={summaryStreamId}
        onClose={() => setSummaryStreamId(null)}
      />
    </>
  )
}
