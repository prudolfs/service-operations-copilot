import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * Phase 1: `users` — app-level identity + role layered over Better Auth.
 * Phase 3: `serviceRequests` — the request lifecycle table.
 * Phase 4: `chatRooms` + `chatMessages` — per-request realtime chat.
 *
 * Better Auth's own tables are managed by `@convex-dev/better-auth`'s
 * component and are NOT redeclared here. `authUserId` stores the Better Auth
 * user `_id` as a string foreign key.
 */
export default defineSchema({
  users: defineTable({
    authUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(
      v.literal('client'),
      v.literal('worker'),
      v.literal('manager'),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_auth_user_id', ['authUserId'])
    .index('by_email', ['email']),

  serviceRequests: defineTable({
    clientId: v.id('users'),
    assignedWorkerId: v.optional(v.id('users')),
    serviceType: v.string(),
    date: v.string(),
    time: v.string(),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal('OPEN'),
      v.literal('ASSIGNED'),
      v.literal('IN_PROGRESS'),
      v.literal('COMPLETED'),
      v.literal('CANCELLED'),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_client', ['clientId'])
    .index('by_worker', ['assignedWorkerId'])
    .index('by_status', ['status']),

  chatRooms: defineTable({
    serviceRequestId: v.id('serviceRequests'),
    status: v.union(v.literal('active'), v.literal('archived')),
    lastMessageText: v.optional(v.string()),
    lastMessageTime: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_service_request', ['serviceRequestId']),

  chatMessages: defineTable({
    chatRoomId: v.id('chatRooms'),
    senderId: v.id('users'),
    text: v.string(),
    createdAt: v.number(),
  }).index('by_chat_room', ['chatRoomId', 'createdAt']),
})
