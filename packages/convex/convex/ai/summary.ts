import { createGateway, generateObject, streamText } from 'ai'
import { v } from 'convex/values'
import { api, internal } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'
import { action, internalMutation, query } from '../_generated/server'
import { canViewRequest } from '../serviceRequests'
import { requireAppUser } from '../users'
import { StatusLineSchema } from './intents'

const gateway = createGateway()
const MODEL_ID = 'openai/gpt-4o-mini'

// Patch the streaming row at most ~4×/sec so we don't spam the websocket with
// individual-token mutations. The user sees a smooth typewriter effect; the
// backend only writes when meaningfully more text accumulates.
const STREAM_FLUSH_MS = 250

type SummaryContext = {
  request: Doc<'serviceRequests'>
  client: Doc<'users'> | null
  worker: Doc<'users'> | null
  messages: Array<{ senderName: string; text: string }>
}

const buildContextPrompt = (ctx: SummaryContext): string => {
  const reqLine = `Service request: ${ctx.request.serviceType} on ${ctx.request.date} ${ctx.request.time}, status: ${ctx.request.status}.`
  const clientLine = `Client: ${ctx.client?.name ?? ctx.client?.email ?? 'Unknown'}.`
  const workerLine = `Worker: ${ctx.worker?.name ?? ctx.worker?.email ?? 'Unassigned'}.`
  const notesLine = ctx.request.notes
    ? `Notes from client: ${ctx.request.notes}`
    : 'No notes from client.'
  const transcript =
    ctx.messages.length > 0
      ? `Conversation:\n${ctx.messages.map((m) => `[${m.senderName}]: ${m.text}`).join('\n')}`
      : 'No chat messages yet.'
  return [reqLine, clientLine, workerLine, notesLine, '', transcript].join('\n')
}

const buildStatusLineSystem = (
  ctx: SummaryContext,
): string => `You generate a short one-line status summary for a service-operations request.

${buildContextPrompt(ctx)}

Rules:
- One short plain-text sentence (no markdown, no bullets, no dashes).
- Capture the key state: what's agreed, what's blocking, who's waiting on whom.
- Examples: "Confirmed: cleaning Monday 10:00", "Worker on the way", "Awaiting client confirmation".
- Match the conversation language; fall back to English if the chat is empty.`

const buildDetailsSystem = (
  ctx: SummaryContext,
  statusLine: string,
): string => `You generate a concise markdown summary of a service-operations request.

${buildContextPrompt(ctx)}

You already wrote this status line: "${statusLine}"

Now write the details body in markdown. Use ## headings and bullet lists for the relevant sections only. Cover (omit any that don't apply):

- Agreed items (time, place, scope)
- Open questions
- Current status / next step
- Who is waiting on whom

Rules:
- Do NOT repeat the status line.
- Do NOT include a top-level title — the UI already shows one.
- Start directly with the first heading.
- Use the conversation language; fall back to English if there are no messages.
- Keep it concise.`

const fetchSummaryContext = async (
  ctx: import('../_generated/server').ActionCtx,
  requestId: Id<'serviceRequests'>,
): Promise<SummaryContext | null> => {
  const requestData = await ctx.runQuery(api.serviceRequests.getById, {
    requestId,
  })
  if (!requestData) return null

  // Try to fetch chat messages — may not exist yet if request is still OPEN.
  let messages: Array<{ senderName: string; text: string }> = []
  const room = await ctx.runQuery(api.chat.getRoomForRequest, {
    serviceRequestId: requestId,
  })
  if (room) {
    const msgs = await ctx.runQuery(api.chat.getMessages, {
      chatRoomId: room._id,
      limit: 100,
    })
    messages = (msgs ?? []).map((m) => ({
      senderName: m.sender?.name ?? m.sender?.email ?? 'Unknown',
      text: m.text,
    }))
  }
  return {
    request: requestData.request,
    client: requestData.client,
    worker: requestData.assignedWorker,
    messages,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Internal mutations the action uses to drive the summaryStreams row.
// ────────────────────────────────────────────────────────────────────────────

export const createSummaryStream = internalMutation({
  args: {
    serviceRequestId: v.id('serviceRequests'),
    requesterId: v.id('users'),
  },
  handler: async (
    ctx,
    { serviceRequestId, requesterId },
  ): Promise<Id<'summaryStreams'>> => {
    const now = Date.now()
    return ctx.db.insert('summaryStreams', {
      serviceRequestId,
      requesterId,
      details: '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const setSummaryStatusLine = internalMutation({
  args: {
    streamId: v.id('summaryStreams'),
    statusLine: v.string(),
  },
  handler: async (ctx, { streamId, statusLine }) => {
    await ctx.db.patch(streamId, {
      statusLine,
      status: 'streaming',
      updatedAt: Date.now(),
    })
  },
})

export const appendSummaryDetails = internalMutation({
  args: {
    streamId: v.id('summaryStreams'),
    details: v.string(),
  },
  handler: async (ctx, { streamId, details }) => {
    await ctx.db.patch(streamId, {
      details,
      updatedAt: Date.now(),
    })
  },
})

export const finalizeSummaryStream = internalMutation({
  args: {
    streamId: v.id('summaryStreams'),
    details: v.string(),
  },
  handler: async (ctx, { streamId, details }) => {
    await ctx.db.patch(streamId, {
      details,
      status: 'done',
      updatedAt: Date.now(),
    })
  },
})

export const errorSummaryStream = internalMutation({
  args: {
    streamId: v.id('summaryStreams'),
    errorMessage: v.string(),
  },
  handler: async (ctx, { streamId, errorMessage }) => {
    await ctx.db.patch(streamId, {
      status: 'error',
      errorMessage,
      updatedAt: Date.now(),
    })
  },
})

// ────────────────────────────────────────────────────────────────────────────
// Public surface.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Reactive query the mobile/web client subscribes to with `useQuery`. The
 * action below mutates the row as text streams in, so the UI re-renders as
 * details accumulate without any SSE plumbing.
 */
export const getSummaryStream = query({
  args: { streamId: v.id('summaryStreams') },
  handler: async (ctx, { streamId }): Promise<Doc<'summaryStreams'> | null> => {
    const caller = await requireAppUser(ctx)
    const row = await ctx.db.get(streamId)
    if (!row) return null
    // Only the requester or a manager can read the summary back.
    if (caller.role !== 'manager' && row.requesterId !== caller._id) {
      throw new Error('Not authorized to view this summary')
    }
    return row
  },
})

export const summarizeRequest = action({
  args: { requestId: v.id('serviceRequests') },
  handler: async (
    ctx,
    { requestId },
  ): Promise<{ streamId: Id<'summaryStreams'> }> => {
    // Authorization: must be allowed to view the request.
    const me = await ctx.runQuery(api.users.currentAppUser, {})
    if (!me) throw new Error('Not authenticated')
    const requestData = await ctx.runQuery(api.serviceRequests.getById, {
      requestId,
    })
    if (!requestData) throw new Error('Request not found')
    if (!canViewRequest(me, requestData.request)) {
      throw new Error('Not authorized to summarize this request')
    }

    const streamId: Id<'summaryStreams'> = await ctx.runMutation(
      internal.ai.summary.createSummaryStream,
      { serviceRequestId: requestId, requesterId: me._id },
    )

    // Run the LLM work in the background — the client already has the streamId
    // and is subscribed via useQuery. We don't await this so the caller gets
    // an immediate response and starts polling.
    void (async () => {
      try {
        const summaryCtx = await fetchSummaryContext(ctx, requestId)
        if (!summaryCtx) {
          await ctx.runMutation(internal.ai.summary.errorSummaryStream, {
            streamId,
            errorMessage: 'Request data is no longer available.',
          })
          return
        }

        const { object: statusObj } = await generateObject({
          model: gateway(MODEL_ID),
          schema: StatusLineSchema,
          system: buildStatusLineSystem(summaryCtx),
          prompt: 'Generate the one-line status summary now.',
        })

        await ctx.runMutation(internal.ai.summary.setSummaryStatusLine, {
          streamId,
          statusLine: statusObj.statusLine,
        })

        const result = streamText({
          model: gateway(MODEL_ID),
          system: buildDetailsSystem(summaryCtx, statusObj.statusLine),
          prompt: 'Write the details now.',
        })

        let buffer = ''
        let lastFlush = Date.now()
        let pendingFlush: Promise<unknown> | null = null

        for await (const chunk of result.textStream) {
          buffer += chunk
          if (Date.now() - lastFlush >= STREAM_FLUSH_MS) {
            lastFlush = Date.now()
            // Don't await — let the next chunks accumulate while the patch is
            // in flight. We always finalize with the full buffer at the end.
            pendingFlush = ctx.runMutation(
              internal.ai.summary.appendSummaryDetails,
              { streamId, details: buffer },
            )
          }
        }
        if (pendingFlush) {
          await pendingFlush
        }
        await ctx.runMutation(internal.ai.summary.finalizeSummaryStream, {
          streamId,
          details: buffer,
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown summarization error'
        await ctx.runMutation(internal.ai.summary.errorSummaryStream, {
          streamId,
          errorMessage: message,
        })
      }
    })()

    return { streamId }
  },
})
