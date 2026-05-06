import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * Phase 1 introduces the `users` table — the app-level user record that
 * augments Better Auth's identity with our role concept (client/worker/manager).
 * Better Auth's own tables are managed by `@convex-dev/better-auth`'s
 * component and are NOT redeclared here. `authUserId` stores the Better Auth
 * user `_id` as a string foreign key.
 *
 * Future tables (`serviceRequests`, `chatRooms`, `chatMessages`) land in
 * Phases 3–4.
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
})
