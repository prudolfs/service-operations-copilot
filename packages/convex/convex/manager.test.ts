/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import type { Doc } from './_generated/dataModel'
import {
  computeOverviewFor,
  computeWorkerDetail,
  computeWorkerRoster,
} from './manager'
import schema from './schema'
import {
  acceptServiceRequestBy,
  completeServiceRequestBy,
  createServiceRequestFor,
  startServiceRequestBy,
} from './serviceRequests'

const modules = import.meta.glob('./**/*.ts')

type Role = Doc<'users'>['role']

const insertUser = async (
  ctx: Parameters<Parameters<ReturnType<typeof convexTest>['run']>[0]>[0],
  role: Role,
  tag: string,
): Promise<Doc<'users'>> => {
  const now = Date.now()
  const id = await ctx.db.insert('users', {
    authUserId: `auth-${tag}`,
    email: `${tag}@example.com`,
    name: tag,
    role,
    createdAt: now,
    updatedAt: now,
  })
  const doc = await ctx.db.get(id)
  if (!doc) throw new Error('user not inserted')
  return doc
}

const sampleInput = {
  serviceType: 'cleaning',
  date: '2026-05-08',
  time: '09:00',
  notes: 'Test request',
}

describe('computeOverviewFor', () => {
  test('counts each bucket and returns aged-first unassigned list', async () => {
    const t = convexTest(schema, modules)
    const result = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'oc')
      const w1 = await insertUser(ctx, 'worker', 'ow1')
      const w2 = await insertUser(ctx, 'worker', 'ow2')

      // 2 OPEN (unassigned)
      await createServiceRequestFor(ctx, client, sampleInput)
      await createServiceRequestFor(ctx, client, sampleInput)
      // 1 ASSIGNED
      const a = await createServiceRequestFor(ctx, client, sampleInput)
      await acceptServiceRequestBy(ctx, a, w1)
      // 1 IN_PROGRESS
      const ip = await createServiceRequestFor(ctx, client, sampleInput)
      await acceptServiceRequestBy(ctx, ip, w2)
      await startServiceRequestBy(ctx, ip, w2)
      // 1 COMPLETED today
      const done = await createServiceRequestFor(ctx, client, sampleInput)
      await acceptServiceRequestBy(ctx, done, w1)
      await startServiceRequestBy(ctx, done, w1)
      await completeServiceRequestBy(ctx, done, w1)

      return computeOverviewFor(ctx)
    })
    expect(result.totalActive).toBe(4)
    expect(result.inProgress).toBe(1)
    expect(result.unassignedOpen).toBe(2)
    expect(result.completedToday).toBe(1)
    expect(result.needsAttention).toHaveLength(2)
    for (const r of result.needsAttention) {
      expect(r.status).toBe('OPEN')
    }
  })

  test('completedToday excludes completions from earlier days', async () => {
    const t = convexTest(schema, modules)
    const result = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'oc2')
      const w = await insertUser(ctx, 'worker', 'ow')
      const id = await createServiceRequestFor(ctx, client, sampleInput)
      await acceptServiceRequestBy(ctx, id, w)
      await startServiceRequestBy(ctx, id, w)
      await completeServiceRequestBy(ctx, id, w)

      // Backdate the completion to two days ago.
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
      await ctx.db.patch(id, { updatedAt: twoDaysAgo })

      return computeOverviewFor(ctx)
    })
    expect(result.completedToday).toBe(0)
  })
})

describe('computeWorkerRoster', () => {
  test('orders by active load and reports per-worker counts', async () => {
    const t = convexTest(schema, modules)
    const roster = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'rc')
      const wBusy = await insertUser(ctx, 'worker', 'busy')
      const wIdle = await insertUser(ctx, 'worker', 'idle')

      // Busy: 2 ASSIGNED + 1 IN_PROGRESS
      for (let i = 0; i < 2; i++) {
        const id = await createServiceRequestFor(ctx, client, sampleInput)
        await acceptServiceRequestBy(ctx, id, wBusy)
      }
      const ip = await createServiceRequestFor(ctx, client, sampleInput)
      await acceptServiceRequestBy(ctx, ip, wBusy)
      await startServiceRequestBy(ctx, ip, wBusy)
      // Idle: 1 completed (no active load)
      const done = await createServiceRequestFor(ctx, client, sampleInput)
      await acceptServiceRequestBy(ctx, done, wIdle)
      await startServiceRequestBy(ctx, done, wIdle)
      await completeServiceRequestBy(ctx, done, wIdle)

      return computeWorkerRoster(ctx)
    })
    expect(roster).toHaveLength(2)
    expect(roster[0]?.worker.email).toBe('busy@example.com')
    expect(roster[0]?.activeAssignments).toBe(3)
    expect(roster[0]?.inProgress).toBe(1)
    expect(roster[1]?.worker.email).toBe('idle@example.com')
    expect(roster[1]?.activeAssignments).toBe(0)
  })

  test('filters non-worker users out of the roster', async () => {
    const t = convexTest(schema, modules)
    const roster = await t.run(async (ctx) => {
      await insertUser(ctx, 'client', 'rfc')
      await insertUser(ctx, 'manager', 'rfm')
      await insertUser(ctx, 'worker', 'rfw')
      return computeWorkerRoster(ctx)
    })
    expect(roster).toHaveLength(1)
    expect(roster[0]?.worker.role).toBe('worker')
  })
})

describe('computeWorkerDetail', () => {
  test('returns recent jobs and counts', async () => {
    const t = convexTest(schema, modules)
    const result = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'wdc')
      const worker = await insertUser(ctx, 'worker', 'wdw')

      const a = await createServiceRequestFor(ctx, client, sampleInput)
      await acceptServiceRequestBy(ctx, a, worker)
      const done = await createServiceRequestFor(ctx, client, sampleInput)
      await acceptServiceRequestBy(ctx, done, worker)
      await startServiceRequestBy(ctx, done, worker)
      await completeServiceRequestBy(ctx, done, worker)

      return computeWorkerDetail(ctx, worker._id)
    })
    expect(result).not.toBeNull()
    expect(result?.activeAssignments).toBe(1)
    expect(result?.completedAllTime).toBe(1)
    expect(result?.recentJobs).toHaveLength(2)
  })

  test('returns null when the target user is not a worker', async () => {
    const t = convexTest(schema, modules)
    const result = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'wdnotworker')
      return computeWorkerDetail(ctx, client._id)
    })
    expect(result).toBeNull()
  })
})
