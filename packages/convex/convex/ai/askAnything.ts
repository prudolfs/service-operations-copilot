import { createGateway, generateObject } from 'ai'
import { v } from 'convex/values'
import { api } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'
import { action } from '../_generated/server'
import { type MergedIntentResult, MergedIntentSchema } from './intents'
import { transcribeAudioBlob } from './transcribe'

// Use the Vercel AI Gateway when AI_GATEWAY_API_KEY is set, falling back to a
// direct provider. The gateway lets us swap models without rebuilding clients
// — same pattern as seniory.
const gateway = createGateway()
const MODEL_ID = 'openai/gpt-4o-mini'

type ClientContextInput = {
  screen?: string
  role?: 'client' | 'worker' | 'manager'
  currentChatRoomId?: string
  currentRequestId?: string
  draftFormState?: Record<string, unknown>
}

type ChatRoomCtx = {
  chatRoomId: string
  participants: string[]
  serviceType: string
  status: string
  lastMessageText?: string
}

type RequestCtx = {
  requestId: string
  serviceType: string
  date: string
  time: string
  status: string
  clientName?: string
  workerName?: string
}

const formatUser = (u: Doc<'users'> | null | undefined): string => {
  if (!u) return 'Unknown'
  return u.name ?? u.email
}

const buildSystemPrompt = (
  context: ClientContextInput,
  rooms: ChatRoomCtx[],
  requests: RequestCtx[],
  today: string,
): string => {
  const roomList = rooms.length
    ? rooms
        .map(
          (r) =>
            `- chatRoomId: "${r.chatRoomId}", with: [${r.participants.join(', ')}], service: ${r.serviceType}, status: ${r.status}, lastMessage: "${r.lastMessageText ?? 'none'}"`,
        )
        .join('\n')
    : 'No active conversations.'

  const requestList = requests.length
    ? requests
        .map(
          (r) =>
            `- requestId: "${r.requestId}", ${r.serviceType} on ${r.date} ${r.time}, status: ${r.status}, client: ${r.clientName ?? '?'}, worker: ${r.workerName ?? 'unassigned'}`,
        )
        .join('\n')
    : 'No service requests visible.'

  const draftSection = context.draftFormState
    ? `\n\nThe user has a partially filled form: ${JSON.stringify(context.draftFormState)}\nPreserve existing values UNLESS voice input explicitly overrides them.`
    : ''

  const currentChatHint = context.currentChatRoomId
    ? `\nThe user is currently viewing chat "${context.currentChatRoomId}". Default to it for draft_message unless they refer to someone else.`
    : ''

  const currentRequestHint = context.currentRequestId
    ? `\nThe user is currently viewing request "${context.currentRequestId}". Default to it for summarize_request unless they refer to a different one.`
    : ''

  return `You classify a user's voice input for a service-operations app and extract structured data in a single step. Today is ${today}.

User context:
- Screen: ${context.screen ?? 'unknown'}
- Role: ${context.role ?? 'unknown'}

Visible service requests:
${requestList}

Visible chat rooms:
${roomList}
${currentChatHint}${currentRequestHint}${draftSection}

## Intent Classification

Classify into one of four intents (the screen is a hint, not a constraint):

1. "create_service_request" — wants to schedule/create a new service (cleaning, maintenance, delivery, repair, other). Only the client role can submit; for worker/manager voice still classify but expect the form pre-fill to be reviewed.
2. "draft_message" — wants to send/reply to a chat message ("tell the worker I'll be 10 min late", "reply that I'm on my way").
3. "summarize_request" — wants a recap of a service request's progress and chat ("what's happening with the cleaning?", "summarize this request").
4. "unknown" — does not match any of the above.

Rules:
- If user is on a chat screen and input sounds like a message instruction → prefer "draft_message".
- If user is on a request detail and asks "what's going on" → prefer "summarize_request".

## Extraction Rules (fill fields based on classified intent — leave others empty)

### create_service_request
- serviceType: cleaning | maintenance | delivery | repair | other
- date: ISO YYYY-MM-DD (relative to ${today}; past dates snap to today)
- time: HH:MM 24h. "morning"→09:00, "afternoon"→14:00, "evening"→18:00.
- notes: preserve user's original language; empty if not mentioned

### draft_message
- draftText: short, natural chat-style; not formal, not overly casual; match conversation language
- targetChatRoomId: must be one of the chatRoomIds above
- draftAmbiguous=true only if target is genuinely unclear; provide 2-3 candidateChatRoomIds in that case

### summarize_request
- targetRequestId: must be one of the requestIds above
- summarizeAmbiguous=true if unclear; provide 2-3 candidateRequestIds

### unknown
- message: helpful one-liner suggesting what the user can try (create a request, draft a message, summarize a request).`
}

const fetchContextForRole = async (
  ctx: import('../_generated/server').ActionCtx,
  context: ClientContextInput,
): Promise<{ rooms: ChatRoomCtx[]; requests: RequestCtx[] }> => {
  const role = context.role
  // listForUser is auth-aware and returns rooms the caller is in. Workers see
  // only assigned rooms; managers see all. Same realtime authorization model
  // that powers the chat list screens.
  const rooms = await ctx.runQuery(api.chat.listForUser, {})
  const roomCtx: ChatRoomCtx[] = (rooms ?? []).map((r) => ({
    chatRoomId: r._id,
    participants: [
      formatUser(r.client),
      r.assignedWorker ? formatUser(r.assignedWorker) : 'Unassigned',
    ].filter(Boolean),
    serviceType: r.request.serviceType,
    status: r.request.status,
    lastMessageText: r.lastMessageText,
  }))

  let requestCtx: RequestCtx[] = []
  if (role === 'manager') {
    const all = await ctx.runQuery(api.serviceRequests.listAll, {})
    requestCtx = all.slice(0, 30).map((r) => ({
      requestId: r._id,
      serviceType: r.serviceType,
      date: r.date,
      time: r.time,
      status: r.status,
    }))
  } else if (role === 'worker') {
    const jobs = await ctx.runQuery(api.serviceRequests.listMyJobs, {})
    requestCtx = jobs.slice(0, 30).map((r) => ({
      requestId: r._id,
      serviceType: r.serviceType,
      date: r.date,
      time: r.time,
      status: r.status,
    }))
  } else if (role === 'client') {
    const mine = await ctx.runQuery(api.serviceRequests.listMyRequests, {})
    requestCtx = mine.slice(0, 30).map((r) => ({
      requestId: r._id,
      serviceType: r.serviceType,
      date: r.date,
      time: r.time,
      status: r.status,
    }))
  }

  return { rooms: roomCtx, requests: requestCtx }
}

const classifyAndExtract = async (
  transcription: string,
  context: ClientContextInput,
  rooms: ChatRoomCtx[],
  requests: RequestCtx[],
): Promise<MergedIntentResult> => {
  const today = new Date().toISOString().slice(0, 10)
  const { object } = await generateObject({
    model: gateway(MODEL_ID),
    schema: MergedIntentSchema,
    system: buildSystemPrompt(context, rooms, requests, today),
    prompt: transcription,
  })
  return object
}

export type AskAnythingResponse =
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

export const askAnything = action({
  args: {
    audioStorageId: v.id('_storage'),
    context: v.object({
      screen: v.optional(v.string()),
      role: v.optional(
        v.union(v.literal('client'), v.literal('worker'), v.literal('manager')),
      ),
      currentChatRoomId: v.optional(v.string()),
      currentRequestId: v.optional(v.string()),
      draftFormState: v.optional(v.any()),
    }),
  },
  handler: async (
    ctx,
    { audioStorageId, context },
  ): Promise<AskAnythingResponse> => {
    const blob = await ctx.storage.get(audioStorageId)
    if (!blob) {
      return {
        intent: 'unknown',
        transcription: '',
        message: 'Audio recording is no longer available. Try again.',
      }
    }

    const [transcription, ctxData] = await Promise.all([
      transcribeAudioBlob(blob),
      fetchContextForRole(ctx, context),
    ])

    // Best-effort cleanup so storage doesn't accumulate one-shot recordings.
    try {
      await ctx.storage.delete(audioStorageId)
    } catch {
      // Non-fatal; storage will be GCed eventually.
    }

    if (!transcription) {
      return {
        intent: 'unknown',
        transcription: '',
        message: "I didn't catch that. Try speaking a bit longer.",
      }
    }

    const result = await classifyAndExtract(
      transcription,
      context,
      ctxData.rooms,
      ctxData.requests,
    )

    if (result.intent === 'create_service_request') {
      const hasData =
        result.serviceType || result.date || result.time || result.notes
      if (!hasData) {
        return {
          intent: 'unknown',
          transcription,
          message:
            'Try describing the service you need, e.g. "Book a cleaning tomorrow at 2pm".',
        }
      }
      return {
        intent: 'create_service_request',
        transcription,
        draft: {
          serviceType: result.serviceType || undefined,
          date: result.date || undefined,
          time: result.time || undefined,
          notes: result.notes || undefined,
        },
      }
    }

    if (result.intent === 'draft_message') {
      if (ctxData.rooms.length === 0) {
        return {
          intent: 'unknown',
          transcription,
          message:
            "You don't have any active conversations yet — accept or create a request first.",
        }
      }
      const knownRoom = ctxData.rooms.find(
        (r) => r.chatRoomId === result.targetChatRoomId,
      )

      if (result.draftAmbiguous || !knownRoom) {
        const candidateIds = result.candidateChatRoomIds.length
          ? result.candidateChatRoomIds
          : ctxData.rooms.slice(0, 3).map((r) => r.chatRoomId)
        const candidates = candidateIds
          .map((id) => ctxData.rooms.find((r) => r.chatRoomId === id))
          .filter((r): r is ChatRoomCtx => Boolean(r))
          .map((r) => ({
            chatRoomId: r.chatRoomId,
            label: `${r.participants.join(' · ')} — ${r.serviceType}`,
          }))
        return {
          intent: 'draft_message',
          transcription,
          ambiguous: true,
          candidates,
          draftText: result.draftText,
        }
      }

      return {
        intent: 'draft_message',
        transcription,
        chatRoomId: knownRoom.chatRoomId,
        draftText: result.draftText,
      }
    }

    if (result.intent === 'summarize_request') {
      const knownRequest = ctxData.requests.find(
        (r) => r.requestId === result.targetRequestId,
      )
      const fallbackId =
        context.currentRequestId &&
        ctxData.requests.some((r) => r.requestId === context.currentRequestId)
          ? context.currentRequestId
          : undefined

      if (knownRequest) {
        return {
          intent: 'summarize_request',
          transcription,
          requestId: knownRequest.requestId,
        }
      }
      if (fallbackId) {
        return {
          intent: 'summarize_request',
          transcription,
          requestId: fallbackId,
        }
      }
      const candidateIds = result.candidateRequestIds.length
        ? result.candidateRequestIds
        : ctxData.requests.slice(0, 3).map((r) => r.requestId)
      const candidates = candidateIds
        .map((id) => ctxData.requests.find((r) => r.requestId === id))
        .filter((r): r is RequestCtx => Boolean(r))
        .map((r) => ({
          requestId: r.requestId,
          label: `${r.serviceType} — ${r.date} ${r.time} (${r.status})`,
        }))
      if (candidates.length === 0) {
        return {
          intent: 'unknown',
          transcription,
          message:
            "I couldn't find a matching request. Open one and try again.",
        }
      }
      return {
        intent: 'summarize_request',
        transcription,
        ambiguous: true,
        candidates,
      }
    }

    return {
      intent: 'unknown',
      transcription,
      message:
        result.message ||
        'Try saying things like "Book a cleaning Monday at 10am", "Tell the worker I\'ll be late", or "Summarize this request".',
    }
  },
})

// Type alias used by Id casting in client-side code.
export type _DummyForId = Id<'_storage'>
