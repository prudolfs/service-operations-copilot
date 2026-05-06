import { SendChatMessageSchema } from '@service-ops/shared'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { canViewRequest } from './serviceRequests'
import { requireAppUser } from './users'

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers — every transition takes the actor explicitly so convex-test
// can drive them via `t.run(...)` without standing up Better Auth.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Idempotent: returns the existing room if one already exists for this
 * request, otherwise creates a fresh `active` room. Called from
 * `serviceRequests.acceptServiceRequestBy` — the moment a request transitions
 * OPEN → ASSIGNED the chat room exists and the participants can talk.
 */
export const ensureRoomForRequest = async (
  ctx: MutationCtx,
  serviceRequestId: Id<'serviceRequests'>,
): Promise<Id<'chatRooms'>> => {
  const existing = await ctx.db
    .query('chatRooms')
    .withIndex('by_service_request', (q) =>
      q.eq('serviceRequestId', serviceRequestId),
    )
    .unique()
  if (existing) return existing._id
  const now = Date.now()
  return ctx.db.insert('chatRooms', {
    serviceRequestId,
    status: 'active',
    lastMessageTime: now,
    createdAt: now,
    updatedAt: now,
  })
}

/**
 * Authorization for chat membership. A user can read or post in a room iff
 * they could view the underlying service request: the owning client, the
 * assigned worker, or any manager.
 */
export const canParticipateInRoom = (
  caller: Doc<'users'>,
  request: Doc<'serviceRequests'>,
): boolean => canViewRequest(caller, request)

const requireRoomAccess = async (
  ctx: QueryCtx | MutationCtx,
  caller: Doc<'users'>,
  chatRoomId: Id<'chatRooms'>,
): Promise<{ room: Doc<'chatRooms'>; request: Doc<'serviceRequests'> }> => {
  const room = await ctx.db.get(chatRoomId)
  if (!room) throw new Error('Chat room not found')
  const request = await ctx.db.get(room.serviceRequestId)
  if (!request) throw new Error('Underlying request not found')
  if (!canParticipateInRoom(caller, request)) {
    throw new Error('Not authorized to access this chat')
  }
  return { room, request }
}

export const sendMessageBy = async (
  ctx: MutationCtx,
  caller: Doc<'users'>,
  chatRoomId: Id<'chatRooms'>,
  text: string,
): Promise<Id<'chatMessages'>> => {
  const parsed = SendChatMessageSchema.parse({ chatRoomId, text })
  await requireRoomAccess(ctx, caller, chatRoomId)
  const now = Date.now()
  const messageId = await ctx.db.insert('chatMessages', {
    chatRoomId,
    senderId: caller._id,
    text: parsed.text,
    createdAt: now,
  })
  await ctx.db.patch(chatRoomId, {
    lastMessageText: parsed.text.slice(0, 120),
    lastMessageTime: now,
    updatedAt: now,
  })
  return messageId
}

// ────────────────────────────────────────────────────────────────────────────
// Public mutations + queries.
// ────────────────────────────────────────────────────────────────────────────

export const sendMessage = mutation({
  args: {
    chatRoomId: v.id('chatRooms'),
    text: v.string(),
  },
  handler: async (ctx, { chatRoomId, text }) => {
    const caller = await requireAppUser(ctx)
    return sendMessageBy(ctx, caller, chatRoomId, text)
  },
})

type ChatRoomListItem = Doc<'chatRooms'> & {
  request: Doc<'serviceRequests'>
  client: Doc<'users'> | null
  assignedWorker: Doc<'users'> | null
}

const hydrateRoom = async (
  ctx: QueryCtx,
  room: Doc<'chatRooms'>,
): Promise<ChatRoomListItem | null> => {
  const request = await ctx.db.get(room.serviceRequestId)
  if (!request) return null
  const [client, assignedWorker] = await Promise.all([
    ctx.db.get(request.clientId),
    request.assignedWorkerId
      ? ctx.db.get(request.assignedWorkerId)
      : Promise.resolve(null),
  ])
  return { ...room, request, client, assignedWorker }
}

export const listForUser = query({
  args: {},
  handler: async (ctx): Promise<ChatRoomListItem[]> => {
    const caller = await requireAppUser(ctx)
    const rooms = await ctx.db.query('chatRooms').collect()
    const hydrated = await Promise.all(rooms.map((r) => hydrateRoom(ctx, r)))
    const visible = hydrated.filter(
      (r): r is ChatRoomListItem =>
        r !== null && canParticipateInRoom(caller, r.request),
    )
    visible.sort((a, b) => b.lastMessageTime - a.lastMessageTime)
    return visible
  },
})

export const getRoomForRequest = query({
  args: { serviceRequestId: v.id('serviceRequests') },
  handler: async (
    ctx,
    { serviceRequestId },
  ): Promise<ChatRoomListItem | null> => {
    const caller = await requireAppUser(ctx)
    const request = await ctx.db.get(serviceRequestId)
    if (!request) return null
    if (!canParticipateInRoom(caller, request)) {
      throw new Error('Not authorized to access this chat')
    }
    const room = await ctx.db
      .query('chatRooms')
      .withIndex('by_service_request', (q) =>
        q.eq('serviceRequestId', serviceRequestId),
      )
      .unique()
    if (!room) return null
    return hydrateRoom(ctx, room)
  },
})

type MessageWithSender = Doc<'chatMessages'> & {
  sender: Doc<'users'> | null
}

export const getMessages = query({
  args: {
    chatRoomId: v.id('chatRooms'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { chatRoomId, limit }): Promise<MessageWithSender[]> => {
    const caller = await requireAppUser(ctx)
    await requireRoomAccess(ctx, caller, chatRoomId)
    const cap = Math.min(Math.max(limit ?? 100, 1), 100)
    // Take the most-recent N (descending), then flip to ascending for display.
    const recent = await ctx.db
      .query('chatMessages')
      .withIndex('by_chat_room', (q) => q.eq('chatRoomId', chatRoomId))
      .order('desc')
      .take(cap)
    const ordered = recent.reverse()
    const senderIds = Array.from(new Set(ordered.map((m) => m.senderId)))
    const senders = await Promise.all(senderIds.map((id) => ctx.db.get(id)))
    const senderById = new Map<Id<'users'>, Doc<'users'> | null>()
    senderIds.forEach((id, i) => {
      senderById.set(id, senders[i] ?? null)
    })
    return ordered.map((m) => ({
      ...m,
      sender: senderById.get(m.senderId) ?? null,
    }))
  },
})
