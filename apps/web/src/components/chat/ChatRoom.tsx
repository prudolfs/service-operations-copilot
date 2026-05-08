import { api } from '@service-ops/convex/api'
import type { Doc, Id } from '@service-ops/convex/dataModel'
import type { ReplyTone } from '@service-ops/shared'
import { useRouter } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { ArrowLeft, Loader2, Mic, Sparkles, Square, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import { useRecorder } from '@/components/voice/useRecorder'
import { useVoiceContext } from '@/components/voice/VoiceContext'
import { cn } from '@/lib/cn'
import { formatServiceType, formatStamp } from '@/lib/format'
import { useIsOnline } from '@/lib/use-is-online'

const MAX_RECORDING_MS = 30_000

type Message = Doc<'chatMessages'> & { sender: Doc<'users'> | null }
type Pending = { key: string; text: string; createdAt: number }

const TONES: ReadonlyArray<{ value: ReplyTone; label: string }> = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'supportive', label: 'Supportive' },
  { value: 'funny', label: 'Funny' },
]

export function ChatRoom({
  chatRoomId,
  initialDraft,
}: {
  chatRoomId: Id<'chatRooms'>
  initialDraft?: string
}) {
  const router = useRouter()
  const room = useQuery(api.chat.listForUser)?.find((r) => r._id === chatRoomId)
  const messages = useQuery(api.chat.getMessages, { chatRoomId })
  const me = useQuery(api.users.currentAppUser)
  const send = useMutation(api.chat.sendMessage)
  const suggestReplies = useAction(api.ai.replySuggestions.suggestReplies)
  const generateUploadUrl = useAction(api.ai.transcribe.generateUploadUrl)
  const askAnything = useAction(api.ai.askAnything.askAnything)

  const [draft, setDraft] = useState(initialDraft ?? '')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<Pending[]>([])
  const [tone, setTone] = useState<ReplyTone>('friendly')
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestPanel, setShowSuggestPanel] = useState(false)
  const [voiceProcessing, setVoiceProcessing] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOnline = useIsOnline()

  const { isRecording, durationMs, startRecording, stopRecording } =
    useRecorder()

  const { setContext } = useVoiceContext()
  useEffect(() => {
    setContext({ screen: 'chat', currentChatRoomId: chatRoomId })
    return () => setContext({})
  }, [chatRoomId, setContext])

  // Drop optimistic entries once their text appears in the server-side list.
  useEffect(() => {
    if (!messages || pending.length === 0) return
    setPending((prev) =>
      prev.filter(
        (p) =>
          !messages.some((m) => m.senderId === me?._id && m.text === p.text),
      ),
    )
  }, [messages, me?._id, pending.length])

  const combined = useMemo<Array<Message | { _pending: Pending }>>(() => {
    const base: Array<Message | { _pending: Pending }> = (messages ?? []).map(
      (m) => m,
    )
    for (const p of pending) base.push({ _pending: p })
    return base
  }, [messages, pending])

  useEffect(() => {
    if (combined.length === 0) return
    const id = setTimeout(() => {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 50)
    return () => clearTimeout(id)
  }, [combined.length])

  const onSend = async () => {
    const text = draft.trim()
    if (!text || sending) return
    if (!isOnline) return
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setPending((prev) => [...prev, { key, text, createdAt: Date.now() }])
    setDraft('')
    setSuggestions([])
    setShowSuggestPanel(false)
    setSending(true)
    try {
      await send({ chatRoomId, text })
    } catch (err) {
      setPending((prev) => prev.filter((p) => p.key !== key))
      setDraft(text)
      alert((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  const onSuggest = async (toneOverride?: ReplyTone) => {
    if (suggesting) return
    setShowSuggestPanel(true)
    setSuggesting(true)
    try {
      const result = await suggestReplies({
        chatRoomId,
        composerText: draft.trim() || undefined,
        tone: toneOverride ?? tone,
      })
      setSuggestions(result.suggestions)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setSuggesting(false)
    }
  }

  // Voice → draft_message in this chat. Press-and-hold the inline mic.
  const sendVoiceClip = async (blob: Blob, mimeType: string) => {
    setVoiceProcessing(true)
    try {
      const uploadUrl = await generateUploadUrl({})
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': mimeType },
        body: blob,
      })
      if (!uploadRes.ok) throw new Error(`Upload failed (${uploadRes.status})`)
      const { storageId } = (await uploadRes.json()) as {
        storageId: Id<'_storage'>
      }
      const response = await askAnything({
        audioStorageId: storageId,
        context: {
          screen: 'chat',
          role: me?.role,
          currentChatRoomId: chatRoomId,
        },
      })
      // In-chat we always treat the result as a message draft. Even if the
      // intent comes back as something else, surface the transcription so the
      // user can edit and send.
      if (response.intent === 'draft_message' && 'draftText' in response) {
        setDraft(response.draftText)
      } else if (response.intent === 'unknown') {
        alert(response.message)
      } else if ('transcription' in response && response.transcription) {
        setDraft(response.transcription)
      }
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setVoiceProcessing(false)
    }
  }

  const onMicPointerDown = async () => {
    if (voiceProcessing || isRecording) return
    const ok = await startRecording()
    if (!ok) return
    recordTimeoutRef.current = setTimeout(async () => {
      recordTimeoutRef.current = null
      const r = await stopRecording()
      if (r) await sendVoiceClip(r.blob, r.mimeType)
    }, MAX_RECORDING_MS)
  }

  const onMicPointerUp = async () => {
    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current)
      recordTimeoutRef.current = null
    }
    if (!isRecording) return
    const r = await stopRecording()
    if (r) await sendVoiceClip(r.blob, r.mimeType)
  }

  const otherName =
    room?.client && me?._id !== room.client._id
      ? (room.client.name ?? room.client.email)
      : (room?.assignedWorker?.name ??
        room?.assignedWorker?.email ??
        'Unassigned')

  return (
    // `fixed inset-0` (with sidebar/tab-bar offsets) gives the chat a known
    // viewport-relative box without depending on flex height resolution from
    // the layout. The composer reliably pins to the bottom and the message
    // list claims the space between header and composer.
    <div className="fixed inset-0 z-10 flex flex-col bg-surface-0 md:left-64">
      <header className="border-surface-3 border-b bg-surface-1 pt-safe">
        <div className="flex items-center gap-3 px-4 py-4 md:px-6">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-surface-text-muted hover:bg-surface-2 hover:text-surface-text md:hidden"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-base text-surface-text">
              {room ? formatServiceType(room.request.serviceType) : 'Chat'}
            </p>
            <p className="truncate text-sm text-surface-text-muted">
              {room ? otherName : 'Loading…'}
            </p>
          </div>
          {room ? <StatusBadge status={room.request.status} /> : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {messages === undefined ? (
          <p className="text-surface-text-muted">Loading messages…</p>
        ) : combined.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-surface-text-muted">
            <p className="text-lg">No messages yet</p>
            <p className="mt-1 text-sm">
              Say hi to get the conversation started.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2">
            {combined.map((item) => {
              if ('_pending' in item) {
                return (
                  <li
                    key={`pending-${item._pending.key}`}
                    className="flex justify-end"
                  >
                    <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-brand-500/70 px-3 py-2">
                      <p className="text-base text-white">
                        {item._pending.text}
                      </p>
                      <p className="mt-1 text-right text-white/70 text-xs">
                        sending…
                      </p>
                    </div>
                  </li>
                )
              }
              const own = item.senderId === me?._id
              return (
                <li
                  key={item._id}
                  className={cn('flex', own ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[70%] px-3 py-2',
                      own
                        ? 'rounded-2xl rounded-br-sm bg-brand-500'
                        : 'rounded-2xl rounded-bl-sm bg-surface-2',
                    )}
                  >
                    {!own && item.sender ? (
                      <p className="text-surface-text-muted text-xs">
                        {item.sender.name ?? item.sender.email}
                      </p>
                    ) : null}
                    <p
                      className={cn(
                        'text-base',
                        own ? 'text-white' : 'text-surface-text',
                      )}
                    >
                      {item.text}
                    </p>
                    <p
                      className={cn(
                        'mt-1 text-right text-xs',
                        own ? 'text-white/70' : 'text-surface-text-muted',
                      )}
                    >
                      {formatStamp(item.createdAt)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div ref={listEndRef} />
      </div>

      {showSuggestPanel ? (
        <div className="border-surface-3 border-t bg-surface-1 px-6 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-surface-text-muted text-xs uppercase tracking-widest">
              Suggest a reply
            </p>
            <button
              type="button"
              onClick={() => setShowSuggestPanel(false)}
              className="rounded-full p-1 text-surface-text-muted hover:bg-surface-2"
              aria-label="Close suggestions"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setTone(t.value)
                  void onSuggest(t.value)
                }}
                className={cn(
                  'rounded-full px-3 py-1 text-xs',
                  tone === t.value
                    ? 'bg-brand-500 font-semibold text-white'
                    : 'border border-surface-3 bg-surface-2 text-surface-text',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {suggesting ? (
            <p className="mt-3 text-sm text-surface-text-muted">
              Drafting suggestions…
            </p>
          ) : suggestions.length === 0 ? (
            <p className="mt-3 text-sm text-surface-text-muted">
              Pick a tone — I'll suggest 3 replies.
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setDraft(s)
                    setSuggestions([])
                    setShowSuggestPanel(false)
                  }}
                  className="rounded-2xl border border-surface-3 bg-surface-0 px-3 py-2 text-left text-sm text-surface-text hover:bg-surface-2"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {!isOnline ? (
        <p className="border-surface-3 border-t bg-surface-1 px-6 py-2 text-center text-sm text-surface-text-muted">
          You're offline — messages can't be sent right now.
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void onSend()
        }}
        className="flex items-end gap-2 border-surface-3 border-t bg-surface-1 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:px-6"
      >
        <button
          type="button"
          onClick={() => {
            if (showSuggestPanel) {
              setShowSuggestPanel(false)
            } else {
              void onSuggest()
            }
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full text-brand-300 hover:bg-surface-2"
          aria-label="Suggest replies"
        >
          <Sparkles size={20} />
        </button>
        {isRecording || voiceProcessing ? (
          <div className="flex max-h-32 min-h-[40px] flex-1 items-center gap-2 rounded-2xl bg-surface-2 px-4 py-2 text-base">
            {voiceProcessing ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin text-brand-300"
                  aria-hidden="true"
                />
                <span className="text-surface-text-muted">Transcribing…</span>
              </>
            ) : (
              <>
                <span
                  className="h-2 w-2 animate-pulse rounded-full bg-status-progress"
                  aria-hidden="true"
                />
                <span className="text-surface-text-muted">
                  Recording {Math.floor(durationMs / 1000)}s…
                </span>
              </>
            )}
          </div>
        ) : (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void onSend()
              }
            }}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl bg-surface-2 px-4 py-2 text-base text-surface-text outline-none placeholder:text-surface-text-muted"
          />
        )}
        <button
          type="button"
          onPointerDown={onMicPointerDown}
          onPointerUp={onMicPointerUp}
          onPointerLeave={onMicPointerUp}
          disabled={voiceProcessing}
          aria-label={isRecording ? 'Release to send' : 'Hold to dictate'}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            isRecording
              ? 'bg-status-progress text-white'
              : 'text-surface-text-muted hover:bg-surface-2 disabled:opacity-50',
          )}
        >
          {isRecording ? (
            <Square size={18} fill="currentColor" />
          ) : (
            <Mic size={20} />
          )}
        </button>
        <button
          type="submit"
          disabled={
            !draft.trim() ||
            sending ||
            !isOnline ||
            isRecording ||
            voiceProcessing
          }
          className="rounded-2xl bg-brand-500 px-4 py-2 font-semibold text-base text-white hover:bg-brand-600 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  )
}
