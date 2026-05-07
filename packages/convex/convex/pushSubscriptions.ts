import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation, internalQuery, mutation } from './_generated/server'
import { requireAppUser } from './users'

const KeysValidator = v.object({
  p256dh: v.string(),
  auth: v.string(),
})

/**
 * Idempotent: replaces any existing row for the same `endpoint` with a fresh
 * record so a re-grant from the same browser doesn't create duplicates and so
 * subscriptions can move between accounts on a shared device.
 */
export const subscribe = mutation({
  args: {
    endpoint: v.string(),
    keys: KeysValidator,
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<'pushSubscriptions'>> => {
    const caller = await requireAppUser(ctx)
    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
      .unique()
    if (existing) await ctx.db.delete(existing._id)
    return ctx.db.insert('pushSubscriptions', {
      userId: caller._id,
      endpoint: args.endpoint,
      keys: args.keys,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    })
  },
})

export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }): Promise<null> => {
    const caller = await requireAppUser(ctx)
    const row = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
      .unique()
    if (row && row.userId === caller._id) await ctx.db.delete(row._id)
    return null
  },
})

/**
 * Internal: read-side counterpart of `subscribe` — `pushSender.sendPushToUser`
 * fans out to every row returned here.
 */
export const listForUser = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }): Promise<Doc<'pushSubscriptions'>[]> => {
    return ctx.db
      .query('pushSubscriptions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
  },
})

/**
 * Internal: invoked by the push action when the push service responds with
 * 404/410 (subscription gone) so we don't keep retrying dead endpoints.
 */
export const deleteByEndpoint = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }): Promise<null> => {
    const row = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
      .unique()
    if (row) await ctx.db.delete(row._id)
    return null
  },
})
