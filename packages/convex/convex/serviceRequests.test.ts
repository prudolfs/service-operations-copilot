/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import type { Doc, Id } from './_generated/dataModel'
import schema from './schema'
import {
  acceptServiceRequestBy,
  assignWorkerByManager,
  cancelServiceRequestBy,
  canViewRequest,
  completeServiceRequestBy,
  createServiceRequestFor,
  setStatusByManager,
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

describe('createServiceRequestFor', () => {
  test('client creates an OPEN request', async () => {
    const t = convexTest(schema, modules)
    const id = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'client-1')
      return createServiceRequestFor(ctx, client, sampleInput)
    })
    const stored = await t.run((ctx) => ctx.db.get(id))
    expect(stored?.status).toBe('OPEN')
    expect(stored?.serviceType).toBe('cleaning')
  })

  test('rejects non-client roles', async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.run(async (ctx) => {
        const worker = await insertUser(ctx, 'worker', 'w')
        return createServiceRequestFor(ctx, worker, sampleInput)
      }),
    ).rejects.toThrow(/Only clients/)

    await expect(
      t.run(async (ctx) => {
        const manager = await insertUser(ctx, 'manager', 'm')
        return createServiceRequestFor(ctx, manager, sampleInput)
      }),
    ).rejects.toThrow(/Only clients/)
  })

  test('rejects malformed input via shared zod schema', async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.run(async (ctx) => {
        const client = await insertUser(ctx, 'client', 'c')
        return createServiceRequestFor(ctx, client, {
          ...sampleInput,
          date: 'not-a-date',
        })
      }),
    ).rejects.toThrow()
  })
})

describe('acceptServiceRequestBy', () => {
  test('worker transitions OPEN → ASSIGNED', async () => {
    const t = convexTest(schema, modules)
    const updated = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'c')
      const worker = await insertUser(ctx, 'worker', 'w')
      const id = await createServiceRequestFor(ctx, client, sampleInput)
      return acceptServiceRequestBy(ctx, id, worker)
    })
    expect(updated.status).toBe('ASSIGNED')
    expect(updated.assignedWorkerId).toBeDefined()
  })

  test('rejects non-worker callers', async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.run(async (ctx) => {
        const client = await insertUser(ctx, 'client', 'c')
        const otherClient = await insertUser(ctx, 'client', 'c2')
        const id = await createServiceRequestFor(ctx, client, sampleInput)
        return acceptServiceRequestBy(ctx, id, otherClient)
      }),
    ).rejects.toThrow(/Only workers/)
  })

  test('rejects re-accept of already-assigned request', async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.run(async (ctx) => {
        const client = await insertUser(ctx, 'client', 'c')
        const w1 = await insertUser(ctx, 'worker', 'w1')
        const w2 = await insertUser(ctx, 'worker', 'w2')
        const id = await createServiceRequestFor(ctx, client, sampleInput)
        await acceptServiceRequestBy(ctx, id, w1)
        return acceptServiceRequestBy(ctx, id, w2)
      }),
    ).rejects.toThrow(/Cannot accept/)
  })
})

describe('start + complete lifecycle', () => {
  test('assigned worker can start then complete', async () => {
    const t = convexTest(schema, modules)
    const final = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'c')
      const worker = await insertUser(ctx, 'worker', 'w')
      const id = await createServiceRequestFor(ctx, client, sampleInput)
      await acceptServiceRequestBy(ctx, id, worker)
      await startServiceRequestBy(ctx, id, worker)
      return completeServiceRequestBy(ctx, id, worker)
    })
    expect(final.status).toBe('COMPLETED')
  })

  test('non-assigned worker cannot start', async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.run(async (ctx) => {
        const client = await insertUser(ctx, 'client', 'c')
        const w1 = await insertUser(ctx, 'worker', 'w1')
        const w2 = await insertUser(ctx, 'worker', 'w2')
        const id = await createServiceRequestFor(ctx, client, sampleInput)
        await acceptServiceRequestBy(ctx, id, w1)
        return startServiceRequestBy(ctx, id, w2)
      }),
    ).rejects.toThrow(/assigned worker/)
  })

  test('cannot start a request still in OPEN', async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.run(async (ctx) => {
        const client = await insertUser(ctx, 'client', 'c')
        const worker = await insertUser(ctx, 'worker', 'w')
        const id = await createServiceRequestFor(ctx, client, sampleInput)
        return startServiceRequestBy(ctx, id, worker)
      }),
    ).rejects.toThrow(/Cannot start/)
  })

  test('cannot complete a request still in ASSIGNED', async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.run(async (ctx) => {
        const client = await insertUser(ctx, 'client', 'c')
        const worker = await insertUser(ctx, 'worker', 'w')
        const id = await createServiceRequestFor(ctx, client, sampleInput)
        await acceptServiceRequestBy(ctx, id, worker)
        return completeServiceRequestBy(ctx, id, worker)
      }),
    ).rejects.toThrow(/Cannot complete/)
  })
})

describe('cancelServiceRequestBy', () => {
  test('owning client can cancel an OPEN request', async () => {
    const t = convexTest(schema, modules)
    const cancelled = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'c')
      const id = await createServiceRequestFor(ctx, client, sampleInput)
      return cancelServiceRequestBy(ctx, id, client)
    })
    expect(cancelled.status).toBe('CANCELLED')
  })

  test('manager can cancel any non-completed request', async () => {
    const t = convexTest(schema, modules)
    const cancelled = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'c')
      const manager = await insertUser(ctx, 'manager', 'm')
      const id = await createServiceRequestFor(ctx, client, sampleInput)
      return cancelServiceRequestBy(ctx, id, manager)
    })
    expect(cancelled.status).toBe('CANCELLED')
  })

  test('a different client cannot cancel another client’s request', async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.run(async (ctx) => {
        const owner = await insertUser(ctx, 'client', 'c1')
        const stranger = await insertUser(ctx, 'client', 'c2')
        const id = await createServiceRequestFor(ctx, owner, sampleInput)
        return cancelServiceRequestBy(ctx, id, stranger)
      }),
    ).rejects.toThrow(/owner or a manager/)
  })

  test('cannot cancel a COMPLETED request', async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.run(async (ctx) => {
        const client = await insertUser(ctx, 'client', 'c')
        const worker = await insertUser(ctx, 'worker', 'w')
        const id = await createServiceRequestFor(ctx, client, sampleInput)
        await acceptServiceRequestBy(ctx, id, worker)
        await startServiceRequestBy(ctx, id, worker)
        await completeServiceRequestBy(ctx, id, worker)
        return cancelServiceRequestBy(ctx, id, client)
      }),
    ).rejects.toThrow(/completed/)
  })
})

describe('manager overrides', () => {
  test('assignWorker requires manager + worker target', async () => {
    const t = convexTest(schema, modules)
    const updated = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'c')
      const worker = await insertUser(ctx, 'worker', 'w')
      const manager = await insertUser(ctx, 'manager', 'm')
      const id = await createServiceRequestFor(ctx, client, sampleInput)
      return assignWorkerByManager(ctx, id, worker._id, manager)
    })
    expect(updated.status).toBe('ASSIGNED')

    // Non-manager rejected
    await expect(
      t.run(async (ctx) => {
        const client = await insertUser(ctx, 'client', 'c2')
        const worker = await insertUser(ctx, 'worker', 'w2')
        const id = await createServiceRequestFor(ctx, client, sampleInput)
        return assignWorkerByManager(ctx, id, worker._id, client)
      }),
    ).rejects.toThrow(/Only managers/)

    // Target must be a worker
    await expect(
      t.run(async (ctx) => {
        const client = await insertUser(ctx, 'client', 'c3')
        const otherClient = await insertUser(ctx, 'client', 'c4')
        const manager = await insertUser(ctx, 'manager', 'm2')
        const id = await createServiceRequestFor(ctx, client, sampleInput)
        return assignWorkerByManager(ctx, id, otherClient._id, manager)
      }),
    ).rejects.toThrow(/not a worker/)
  })

  test('setStatus is manager-only', async () => {
    const t = convexTest(schema, modules)
    const forced = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'c')
      const manager = await insertUser(ctx, 'manager', 'm')
      const id = await createServiceRequestFor(ctx, client, sampleInput)
      return setStatusByManager(ctx, id, 'COMPLETED', manager)
    })
    expect(forced.status).toBe('COMPLETED')

    await expect(
      t.run(async (ctx) => {
        const client = await insertUser(ctx, 'client', 'c2')
        const id = await createServiceRequestFor(ctx, client, sampleInput)
        return setStatusByManager(ctx, id, 'COMPLETED', client)
      }),
    ).rejects.toThrow(/Only managers/)
  })
})

describe('canViewRequest', () => {
  test('manager sees everything', async () => {
    const t = convexTest(schema, modules)
    const result = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'c')
      const manager = await insertUser(ctx, 'manager', 'm')
      const id = await createServiceRequestFor(ctx, client, sampleInput)
      const req = (await ctx.db.get(id)) as Doc<'serviceRequests'>
      return canViewRequest(manager, req)
    })
    expect(result).toBe(true)
  })

  test('client sees own only', async () => {
    const t = convexTest(schema, modules)
    const { ownerView, strangerView } = await t.run(async (ctx) => {
      const owner = await insertUser(ctx, 'client', 'c1')
      const stranger = await insertUser(ctx, 'client', 'c2')
      const id = await createServiceRequestFor(ctx, owner, sampleInput)
      const req = (await ctx.db.get(id)) as Doc<'serviceRequests'>
      return {
        ownerView: canViewRequest(owner, req),
        strangerView: canViewRequest(stranger, req),
      }
    })
    expect(ownerView).toBe(true)
    expect(strangerView).toBe(false)
  })

  test('worker sees OPEN + own assigned, not other workers’ jobs', async () => {
    const t = convexTest(schema, modules)
    const { openVisible, ownAssigned, otherAssigned } = await t.run(
      async (ctx) => {
        const client = await insertUser(ctx, 'client', 'c')
        const wMine = await insertUser(ctx, 'worker', 'wm')
        const wOther = await insertUser(ctx, 'worker', 'wo')
        const openId = await createServiceRequestFor(ctx, client, sampleInput)

        const assignedId = await createServiceRequestFor(
          ctx,
          client,
          sampleInput,
        )
        await acceptServiceRequestBy(ctx, assignedId, wMine)

        const otherId = await createServiceRequestFor(ctx, client, sampleInput)
        await acceptServiceRequestBy(ctx, otherId, wOther)

        const openReq = (await ctx.db.get(openId)) as Doc<'serviceRequests'>
        const ownReq = (await ctx.db.get(assignedId)) as Doc<'serviceRequests'>
        const otherReq = (await ctx.db.get(otherId)) as Doc<'serviceRequests'>

        return {
          openVisible: canViewRequest(wMine, openReq),
          ownAssigned: canViewRequest(wMine, ownReq),
          otherAssigned: canViewRequest(wMine, otherReq),
        }
      },
    )
    expect(openVisible).toBe(true)
    expect(ownAssigned).toBe(true)
    expect(otherAssigned).toBe(false)
  })
})

// Type-only sanity: make sure the helpers are wired against generated ids.
const _typeProbe = (id: Id<'serviceRequests'>) => id
void _typeProbe
