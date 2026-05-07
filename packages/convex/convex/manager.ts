import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { query } from './_generated/server'
import { requireAppUser } from './users'

const requireManager = async (ctx: QueryCtx): Promise<Doc<'users'>> => {
  const caller = await requireAppUser(ctx)
  if (caller.role !== 'manager') {
    throw new Error('Manager role required')
  }
  return caller
}

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for convex-test).
// MVP: each manager screen scans the small set of currently-active requests.
// At scale, swap these for denormalized counters per the Convex guideline.
// ────────────────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] as const

const startOfTodayMs = (now: number): number => {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const requestsByStatus = (
  ctx: QueryCtx,
  status: Doc<'serviceRequests'>['status'],
): Promise<Doc<'serviceRequests'>[]> =>
  ctx.db
    .query('serviceRequests')
    .withIndex('by_status', (q) => q.eq('status', status))
    .collect()

export const computeOverviewFor = async (
  ctx: QueryCtx,
  now: number = Date.now(),
): Promise<{
  totalActive: number
  inProgress: number
  unassignedOpen: number
  completedToday: number
  needsAttention: Doc<'serviceRequests'>[]
}> => {
  const [open, assigned, inProgress, completed] = await Promise.all([
    requestsByStatus(ctx, 'OPEN'),
    requestsByStatus(ctx, 'ASSIGNED'),
    requestsByStatus(ctx, 'IN_PROGRESS'),
    requestsByStatus(ctx, 'COMPLETED'),
  ])

  const startOfToday = startOfTodayMs(now)
  const completedToday = completed.filter(
    (r) => r.updatedAt >= startOfToday,
  ).length

  // "Needs attention" = unassigned-open requests older than 24h, oldest first.
  const STALE_AFTER_MS = 24 * 60 * 60 * 1000
  const needsAttention = open
    .filter((r) => !r.assignedWorkerId && now - r.createdAt >= STALE_AFTER_MS)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 10)

  return {
    totalActive: open.length + assigned.length + inProgress.length,
    inProgress: inProgress.length,
    unassignedOpen: open.length,
    completedToday,
    needsAttention,
  }
}

export type WorkerRosterItem = {
  worker: Doc<'users'>
  activeAssignments: number
  inProgress: number
}

export const computeWorkerRoster = async (
  ctx: QueryCtx,
): Promise<WorkerRosterItem[]> => {
  const allUsers = await ctx.db.query('users').collect()
  const workers = allUsers.filter((u) => u.role === 'worker')

  const items = await Promise.all(
    workers.map(async (worker): Promise<WorkerRosterItem> => {
      const assigned = await ctx.db
        .query('serviceRequests')
        .withIndex('by_worker', (q) => q.eq('assignedWorkerId', worker._id))
        .collect()
      const active = assigned.filter((r) =>
        (ACTIVE_STATUSES as readonly string[]).includes(r.status),
      )
      const inProgress = assigned.filter((r) => r.status === 'IN_PROGRESS')
      return {
        worker,
        activeAssignments: active.length,
        inProgress: inProgress.length,
      }
    }),
  )

  // Workers with active load first, then alphabetical by name/email.
  items.sort((a, b) => {
    if (b.activeAssignments !== a.activeAssignments) {
      return b.activeAssignments - a.activeAssignments
    }
    const an = (a.worker.name ?? a.worker.email).toLowerCase()
    const bn = (b.worker.name ?? b.worker.email).toLowerCase()
    return an.localeCompare(bn)
  })

  return items
}

export type WorkerDetailResult = {
  worker: Doc<'users'>
  recentJobs: Doc<'serviceRequests'>[]
  activeAssignments: number
  completedAllTime: number
}

export const computeWorkerDetail = async (
  ctx: QueryCtx,
  workerId: Id<'users'>,
): Promise<WorkerDetailResult | null> => {
  const worker = await ctx.db.get(workerId)
  if (!worker || worker.role !== 'worker') return null
  const all = await ctx.db
    .query('serviceRequests')
    .withIndex('by_worker', (q) => q.eq('assignedWorkerId', workerId))
    .order('desc')
    .collect()
  const active = all.filter((r) =>
    (ACTIVE_STATUSES as readonly string[]).includes(r.status),
  )
  const completed = all.filter((r) => r.status === 'COMPLETED')
  return {
    worker,
    recentJobs: all.slice(0, 20),
    activeAssignments: active.length,
    completedAllTime: completed.length,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Public queries — manager-only.
// ────────────────────────────────────────────────────────────────────────────

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireManager(ctx)
    return computeOverviewFor(ctx)
  },
})

export const listWorkers = query({
  args: {},
  handler: async (ctx): Promise<WorkerRosterItem[]> => {
    await requireManager(ctx)
    return computeWorkerRoster(ctx)
  },
})

export const workerDetail = query({
  args: { workerId: v.id('users') },
  handler: async (ctx, { workerId }): Promise<WorkerDetailResult | null> => {
    await requireManager(ctx)
    return computeWorkerDetail(ctx, workerId)
  },
})
