import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { authComponent } from './auth'

export type Role = 'client' | 'worker' | 'manager'

const parseEmailList = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

export const resolveRoleFromEnv = (email: string): Role => {
  const normalized = email.toLowerCase()
  const admins = parseEmailList(process.env.ADMIN_EMAILS)
  const workers = parseEmailList(process.env.WORKER_EMAILS)
  if (admins.includes(normalized)) return 'manager'
  if (workers.includes(normalized)) return 'worker'
  return 'client'
}

const findByAuthUserId = (
  ctx: QueryCtx | MutationCtx,
  authUserId: string,
): Promise<Doc<'users'> | null> =>
  ctx.db
    .query('users')
    .withIndex('by_auth_user_id', (q) => q.eq('authUserId', authUserId))
    .unique()

/**
 * Pure DB upsert logic, isolated from Better Auth so tests can drive it via
 * `t.run()` without standing up the full auth component.
 */
export const upsertAppUser = async (
  ctx: MutationCtx,
  authUser: { _id: string; email: string; name?: string | null | undefined },
): Promise<Doc<'users'>> => {
  const email = authUser.email.toLowerCase()
  const role = resolveRoleFromEnv(email)
  const now = Date.now()
  const existing = await findByAuthUserId(ctx, authUser._id)

  if (existing) {
    const next: Partial<Doc<'users'>> = { updatedAt: now }
    if (existing.email !== email) next.email = email
    if (existing.name !== authUser.name) next.name = authUser.name ?? undefined
    if (existing.role !== role) next.role = role
    await ctx.db.patch(existing._id, next)
    const updated = await ctx.db.get(existing._id)
    if (!updated) throw new Error('User vanished after patch')
    return updated
  }

  const insertedId = await ctx.db.insert('users', {
    authUserId: authUser._id,
    email,
    name: authUser.name ?? undefined,
    role,
    createdAt: now,
    updatedAt: now,
  })
  const inserted = await ctx.db.get(insertedId)
  if (!inserted) throw new Error('User vanished after insert')
  return inserted
}

/**
 * Idempotent. Called by mobile after sign-in and on app foreground/resume.
 * Role resolves from `ADMIN_EMAILS` / `WORKER_EMAILS` env vars on every call,
 * so moving an email between lists takes effect on the next call without
 * needing a manual data migration.
 */
export const ensureAppUser = mutation({
  args: {},
  handler: async (ctx): Promise<Doc<'users'>> => {
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) {
      throw new Error('Not authenticated')
    }
    if (!authUser.email) {
      throw new Error('Better Auth user is missing an email')
    }
    return upsertAppUser(ctx, {
      _id: authUser._id,
      email: authUser.email,
      name: authUser.name,
    })
  },
})

export const currentAppUser = query({
  args: {},
  handler: async (ctx): Promise<Doc<'users'> | null> => {
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) return null
    return findByAuthUserId(ctx, authUser._id)
  },
})

export const getById = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }): Promise<Doc<'users'> | null> => {
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) throw new Error('Not authenticated')
    const caller = await findByAuthUserId(ctx, authUser._id)
    if (!caller || caller.role !== 'manager') {
      throw new Error('Only managers can look up users by id')
    }
    return ctx.db.get(userId as Id<'users'>)
  },
})
