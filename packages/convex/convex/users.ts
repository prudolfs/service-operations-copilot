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
 * Resolve the calling Better Auth identity to its app `users` row. Throws if
 * the request isn't authenticated or `ensureAppUser` hasn't run yet (the
 * mobile RoleRedirect runs it after sign-in and on every foreground).
 *
 * Used by every authenticated mutation/query to enforce role-based access.
 */
export const requireAppUser = async (
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<'users'>> => {
  const authUser = await authComponent.getAuthUser(ctx)
  if (!authUser) throw new Error('Not authenticated')
  const appUser = await findByAuthUserId(ctx, authUser._id)
  if (!appUser) throw new Error('App user not provisioned — call ensureAppUser')
  return appUser
}

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
    // safeGetAuthUser returns undefined for unauthenticated callers; the
    // throwing variant (`getAuthUser`) logs every signed-out caller as a
    // Convex error, which spams the dev console after sign-out and on every
    // unauthenticated mount of /redirect or /dashboard.
    const authUser = await authComponent.safeGetAuthUser(ctx)
    if (!authUser) return null
    return findByAuthUserId(ctx, authUser._id)
  },
})

export const getById = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }): Promise<Doc<'users'> | null> => {
    const caller = await requireAppUser(ctx)
    if (caller.role !== 'manager') {
      throw new Error('Only managers can look up users by id')
    }
    return ctx.db.get(userId as Id<'users'>)
  },
})

/**
 * Manager-only roster query the Phase 3 manager request-detail screen uses to
 * populate the assignWorker picker. Phase 5 adds a richer variant with active
 * assignment counts; this stays minimal for now.
 */
export const listWorkers = query({
  args: {},
  handler: async (ctx): Promise<Doc<'users'>[]> => {
    const caller = await requireAppUser(ctx)
    if (caller.role !== 'manager') {
      throw new Error('Only managers can list workers')
    }
    const all = await ctx.db.query('users').collect()
    return all.filter((u) => u.role === 'worker')
  },
})
