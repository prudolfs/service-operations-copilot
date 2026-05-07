'use node'

import { v } from 'convex/values'
import webpush from 'web-push'
import { internal } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { internalAction } from './_generated/server'

let vapidConfigured = false

const configureVapid = (): boolean => {
  if (vapidConfigured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:ops@service-ops.local'
  if (!publicKey || !privateKey) {
    console.warn(
      '[push] VAPID keys missing; skipping send. Set VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY in Convex env.',
    )
    return false
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

/**
 * Fan-out push delivery for one logical event to all of `userId`'s
 * subscriptions. Always called via `ctx.scheduler.runAfter(0, …)` from inside
 * a mutation so a delivery failure (network, 5xx, missing VAPID env) never
 * fails the parent business mutation. Subscriptions that the push service
 * reports as gone (404/410) are removed.
 */
export const sendPushToUser = internalAction({
  args: {
    userId: v.id('users'),
    title: v.string(),
    body: v.string(),
    url: v.string(),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title, body, url, tag }): Promise<null> => {
    if (!configureVapid()) return null

    const subs: Doc<'pushSubscriptions'>[] = await ctx.runQuery(
      internal.pushSubscriptions.listForUser,
      { userId },
    )
    if (subs.length === 0) return null

    const payload = JSON.stringify({ title, body, url, tag })

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload,
            { TTL: 60 },
          )
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) {
            await ctx.runMutation(internal.pushSubscriptions.deleteByEndpoint, {
              endpoint: sub.endpoint,
            })
          } else {
            console.warn('[push] send failed', status ?? '', err)
          }
        }
      }),
    )

    return null
  },
})
