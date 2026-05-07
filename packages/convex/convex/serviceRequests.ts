import {
  CreateServiceRequestSchema,
  ServiceRequestStatusSchema,
} from '@service-ops/shared'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { ensureRoomForRequest } from './chat'
import { requireAppUser } from './users'

const labelForServiceType = (raw: string): string =>
  raw
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'Service request'

const StatusValidator = v.union(
  v.literal('OPEN'),
  v.literal('ASSIGNED'),
  v.literal('IN_PROGRESS'),
  v.literal('COMPLETED'),
  v.literal('CANCELLED'),
)

const getOrThrow = async (
  ctx: QueryCtx | MutationCtx,
  id: Id<'serviceRequests'>,
): Promise<Doc<'serviceRequests'>> => {
  const doc = await ctx.db.get(id)
  if (!doc) throw new Error('Request not found')
  return doc
}

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers — every transition takes the actor explicitly so convex-test
// can drive them via `t.run(...)` without standing up Better Auth.
// ────────────────────────────────────────────────────────────────────────────

export const createServiceRequestFor = async (
  ctx: MutationCtx,
  client: Doc<'users'>,
  input: { serviceType: string; date: string; time: string; notes?: string },
): Promise<Id<'serviceRequests'>> => {
  if (client.role !== 'client') {
    throw new Error('Only clients can create requests')
  }
  const parsed = CreateServiceRequestSchema.parse(input)
  const now = Date.now()
  return ctx.db.insert('serviceRequests', {
    clientId: client._id,
    serviceType: parsed.serviceType,
    date: parsed.date,
    time: parsed.time,
    notes: parsed.notes || undefined,
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
  })
}

export const acceptServiceRequestBy = async (
  ctx: MutationCtx,
  requestId: Id<'serviceRequests'>,
  worker: Doc<'users'>,
): Promise<Doc<'serviceRequests'>> => {
  if (worker.role !== 'worker') {
    throw new Error('Only workers can accept requests')
  }
  const req = await getOrThrow(ctx, requestId)
  if (req.status !== 'OPEN') {
    throw new Error(`Cannot accept request in ${req.status} state`)
  }
  if (req.clientId === worker._id) {
    throw new Error('Cannot accept your own request')
  }
  await ctx.db.patch(requestId, {
    status: 'ASSIGNED',
    assignedWorkerId: worker._id,
    updatedAt: Date.now(),
  })
  await ensureRoomForRequest(ctx, requestId)
  const updated = await ctx.db.get(requestId)
  if (!updated) throw new Error('Request vanished after patch')
  return updated
}

export const startServiceRequestBy = async (
  ctx: MutationCtx,
  requestId: Id<'serviceRequests'>,
  worker: Doc<'users'>,
): Promise<Doc<'serviceRequests'>> => {
  const req = await getOrThrow(ctx, requestId)
  if (req.status !== 'ASSIGNED') {
    throw new Error(`Cannot start request in ${req.status} state`)
  }
  if (req.assignedWorkerId !== worker._id) {
    throw new Error('Only the assigned worker can start this request')
  }
  await ctx.db.patch(requestId, {
    status: 'IN_PROGRESS',
    updatedAt: Date.now(),
  })
  const updated = await ctx.db.get(requestId)
  if (!updated) throw new Error('Request vanished after patch')
  return updated
}

export const completeServiceRequestBy = async (
  ctx: MutationCtx,
  requestId: Id<'serviceRequests'>,
  worker: Doc<'users'>,
): Promise<Doc<'serviceRequests'>> => {
  const req = await getOrThrow(ctx, requestId)
  if (req.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot complete request in ${req.status} state`)
  }
  if (req.assignedWorkerId !== worker._id) {
    throw new Error('Only the assigned worker can complete this request')
  }
  await ctx.db.patch(requestId, {
    status: 'COMPLETED',
    updatedAt: Date.now(),
  })
  const updated = await ctx.db.get(requestId)
  if (!updated) throw new Error('Request vanished after patch')
  return updated
}

export const cancelServiceRequestBy = async (
  ctx: MutationCtx,
  requestId: Id<'serviceRequests'>,
  caller: Doc<'users'>,
): Promise<Doc<'serviceRequests'>> => {
  const req = await getOrThrow(ctx, requestId)
  const isOwner = req.clientId === caller._id && caller.role === 'client'
  const isManager = caller.role === 'manager'
  if (!isOwner && !isManager) {
    throw new Error('Only the request owner or a manager can cancel')
  }
  if (req.status === 'COMPLETED') {
    throw new Error('Cannot cancel a completed request')
  }
  if (req.status === 'CANCELLED') return req
  await ctx.db.patch(requestId, {
    status: 'CANCELLED',
    updatedAt: Date.now(),
  })
  const updated = await ctx.db.get(requestId)
  if (!updated) throw new Error('Request vanished after patch')
  return updated
}

export const assignWorkerByManager = async (
  ctx: MutationCtx,
  requestId: Id<'serviceRequests'>,
  workerId: Id<'users'>,
  manager: Doc<'users'>,
): Promise<Doc<'serviceRequests'>> => {
  if (manager.role !== 'manager') {
    throw new Error('Only managers can assign workers')
  }
  const req = await getOrThrow(ctx, requestId)
  if (req.status === 'COMPLETED' || req.status === 'CANCELLED') {
    throw new Error(`Cannot reassign a ${req.status} request`)
  }
  const target = await ctx.db.get(workerId)
  if (!target || target.role !== 'worker') {
    throw new Error('Target user is not a worker')
  }
  await ctx.db.patch(requestId, {
    assignedWorkerId: workerId,
    status: 'ASSIGNED',
    updatedAt: Date.now(),
  })
  await ensureRoomForRequest(ctx, requestId)
  const updated = await ctx.db.get(requestId)
  if (!updated) throw new Error('Request vanished after patch')
  return updated
}

export const setStatusByManager = async (
  ctx: MutationCtx,
  requestId: Id<'serviceRequests'>,
  status: Doc<'serviceRequests'>['status'],
  manager: Doc<'users'>,
): Promise<Doc<'serviceRequests'>> => {
  if (manager.role !== 'manager') {
    throw new Error('Only managers can override status')
  }
  await getOrThrow(ctx, requestId)
  await ctx.db.patch(requestId, { status, updatedAt: Date.now() })
  const updated = await ctx.db.get(requestId)
  if (!updated) throw new Error('Request vanished after patch')
  return updated
}

export const canViewRequest = (
  caller: Doc<'users'>,
  req: Doc<'serviceRequests'>,
): boolean => {
  if (caller.role === 'manager') return true
  if (caller.role === 'client') return req.clientId === caller._id
  if (caller.role === 'worker') {
    if (req.assignedWorkerId === caller._id) return true
    if (req.status === 'OPEN') return true
  }
  return false
}

// ────────────────────────────────────────────────────────────────────────────
// Public mutations + queries — auth-wrapped facades over the helpers above.
// ────────────────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    serviceType: v.string(),
    date: v.string(),
    time: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<'serviceRequests'>> => {
    const caller = await requireAppUser(ctx)
    return createServiceRequestFor(ctx, caller, args)
  },
})

export const accept = mutation({
  args: { requestId: v.id('serviceRequests') },
  handler: async (ctx, { requestId }) => {
    const caller = await requireAppUser(ctx)
    const updated = await acceptServiceRequestBy(ctx, requestId, caller)
    // Fail-soft push: client sees that a worker accepted their request.
    // Scheduled rather than awaited at the helper layer so test code that
    // drives the helper directly via `t.run` stays free of scheduler effects.
    await ctx.scheduler.runAfter(0, internal.pushSender.sendPushToUser, {
      userId: updated.clientId,
      title: 'Worker accepted your request',
      body: `${labelForServiceType(updated.serviceType)} — ${caller.name ?? caller.email} is on it.`,
      url: `/client/requests/${requestId}`,
      tag: `request-${requestId}-accepted`,
    })
    return updated
  },
})

export const start = mutation({
  args: { requestId: v.id('serviceRequests') },
  handler: async (ctx, { requestId }) => {
    const caller = await requireAppUser(ctx)
    return startServiceRequestBy(ctx, requestId, caller)
  },
})

export const complete = mutation({
  args: { requestId: v.id('serviceRequests') },
  handler: async (ctx, { requestId }) => {
    const caller = await requireAppUser(ctx)
    const updated = await completeServiceRequestBy(ctx, requestId, caller)
    // Fail-soft push: client sees their request was completed.
    await ctx.scheduler.runAfter(0, internal.pushSender.sendPushToUser, {
      userId: updated.clientId,
      title: 'Request completed',
      body: `${labelForServiceType(updated.serviceType)} is done.`,
      url: `/client/requests/${requestId}`,
      tag: `request-${requestId}-completed`,
    })
    return updated
  },
})

export const cancel = mutation({
  args: { requestId: v.id('serviceRequests') },
  handler: async (ctx, { requestId }) => {
    const caller = await requireAppUser(ctx)
    return cancelServiceRequestBy(ctx, requestId, caller)
  },
})

export const assignWorker = mutation({
  args: {
    requestId: v.id('serviceRequests'),
    workerId: v.id('users'),
  },
  handler: async (ctx, { requestId, workerId }) => {
    const caller = await requireAppUser(ctx)
    const updated = await assignWorkerByManager(
      ctx,
      requestId,
      workerId,
      caller,
    )
    // Fail-soft push: worker sees they were assigned.
    await ctx.scheduler.runAfter(0, internal.pushSender.sendPushToUser, {
      userId: workerId,
      title: 'New job assigned to you',
      body: `${labelForServiceType(updated.serviceType)} — ${updated.date} at ${updated.time}.`,
      url: `/dashboard/jobs/${requestId}`,
      tag: `request-${requestId}-assigned`,
    })
    return updated
  },
})

export const setStatus = mutation({
  args: {
    requestId: v.id('serviceRequests'),
    status: StatusValidator,
  },
  handler: async (ctx, { requestId, status }) => {
    const caller = await requireAppUser(ctx)
    // Validate the status value via the shared schema as a defense-in-depth.
    ServiceRequestStatusSchema.parse(status)
    return setStatusByManager(ctx, requestId, status, caller)
  },
})

export const listMyRequests = query({
  args: {},
  handler: async (ctx): Promise<Doc<'serviceRequests'>[]> => {
    const caller = await requireAppUser(ctx)
    if (caller.role !== 'client') {
      throw new Error('Only clients can list their own requests')
    }
    return ctx.db
      .query('serviceRequests')
      .withIndex('by_client', (q) => q.eq('clientId', caller._id))
      .order('desc')
      .collect()
  },
})

export const listOpen = query({
  args: {},
  handler: async (ctx): Promise<Doc<'serviceRequests'>[]> => {
    const caller = await requireAppUser(ctx)
    if (caller.role !== 'worker') {
      throw new Error('Only workers can list open requests')
    }
    return ctx.db
      .query('serviceRequests')
      .withIndex('by_status', (q) => q.eq('status', 'OPEN'))
      .order('desc')
      .collect()
  },
})

export const listMyJobs = query({
  args: {},
  handler: async (ctx): Promise<Doc<'serviceRequests'>[]> => {
    const caller = await requireAppUser(ctx)
    if (caller.role !== 'worker') {
      throw new Error('Only workers can list their jobs')
    }
    const all = await ctx.db
      .query('serviceRequests')
      .withIndex('by_worker', (q) => q.eq('assignedWorkerId', caller._id))
      .order('desc')
      .collect()
    return all.filter((r) => r.status !== 'CANCELLED')
  },
})

export const listAll = query({
  args: {
    status: v.optional(StatusValidator),
  },
  handler: async (ctx, { status }): Promise<Doc<'serviceRequests'>[]> => {
    const caller = await requireAppUser(ctx)
    if (caller.role !== 'manager') {
      throw new Error('Only managers can list all requests')
    }
    if (status) {
      return ctx.db
        .query('serviceRequests')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .collect()
    }
    return ctx.db.query('serviceRequests').order('desc').collect()
  },
})

export const getById = query({
  args: { requestId: v.id('serviceRequests') },
  handler: async (
    ctx,
    { requestId },
  ): Promise<{
    request: Doc<'serviceRequests'>
    client: Doc<'users'> | null
    assignedWorker: Doc<'users'> | null
  } | null> => {
    const caller = await requireAppUser(ctx)
    const req = await ctx.db.get(requestId)
    if (!req) return null
    if (!canViewRequest(caller, req)) {
      throw new Error('Not authorized to view this request')
    }
    const [client, assignedWorker] = await Promise.all([
      ctx.db.get(req.clientId),
      req.assignedWorkerId
        ? ctx.db.get(req.assignedWorkerId)
        : Promise.resolve(null),
    ])
    return { request: req, client, assignedWorker }
  },
})
