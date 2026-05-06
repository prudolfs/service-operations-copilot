/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import type { Doc, Id } from './_generated/dataModel'
import {
  canParticipateInRoom,
  ensureRoomForRequest,
  sendMessageBy,
} from './chat'
import schema from './schema'
import {
  acceptServiceRequestBy,
  createServiceRequestFor,
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

describe('ensureRoomForRequest', () => {
  test('creates a single room and is idempotent', async () => {
    const t = convexTest(schema, modules)
    const { firstId, secondId } = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'c')
      const worker = await insertUser(ctx, 'worker', 'w')
      const requestId = await createServiceRequestFor(ctx, client, sampleInput)
      await acceptServiceRequestBy(ctx, requestId, worker)
      // accept already created the room — call ensureRoomForRequest again
      // and confirm it returns the same id rather than inserting a duplicate.
      const firstId = (
        await ctx.db
          .query('chatRooms')
          .withIndex('by_service_request', (q) =>
            q.eq('serviceRequestId', requestId),
          )
          .unique()
      )?._id
      const secondId = await ensureRoomForRequest(ctx, requestId)
      return { firstId, secondId }
    })
    expect(firstId).toBeDefined()
    expect(secondId).toBe(firstId)
  })
})

describe('sendMessageBy authorization', () => {
  const setup = async () => {
    const t = convexTest(schema, modules)
    const ids = await t.run(async (ctx) => {
      const client = await insertUser(ctx, 'client', 'c')
      const otherClient = await insertUser(ctx, 'client', 'c2')
      const worker = await insertUser(ctx, 'worker', 'w')
      const otherWorker = await insertUser(ctx, 'worker', 'w2')
      const manager = await insertUser(ctx, 'manager', 'm')
      const requestId = await createServiceRequestFor(ctx, client, sampleInput)
      await acceptServiceRequestBy(ctx, requestId, worker)
      const room = await ctx.db
        .query('chatRooms')
        .withIndex('by_service_request', (q) =>
          q.eq('serviceRequestId', requestId),
        )
        .unique()
      if (!room) throw new Error('expected room to exist')
      return {
        roomId: room._id,
        clientId: client._id,
        otherClientId: otherClient._id,
        workerId: worker._id,
        otherWorkerId: otherWorker._id,
        managerId: manager._id,
      }
    })
    return { t, ...ids }
  }

  test('owning client can send messages', async () => {
    const { t, roomId, clientId } = await setup()
    const msgId = await t.run(async (ctx) => {
      const client = (await ctx.db.get(clientId)) as Doc<'users'>
      return sendMessageBy(ctx, client, roomId, 'Hello from client')
    })
    expect(msgId).toBeDefined()
  })

  test('assigned worker can send messages', async () => {
    const { t, roomId, workerId } = await setup()
    const msgId = await t.run(async (ctx) => {
      const worker = (await ctx.db.get(workerId)) as Doc<'users'>
      return sendMessageBy(ctx, worker, roomId, 'On my way')
    })
    expect(msgId).toBeDefined()
  })

  test('manager can send messages in any room', async () => {
    const { t, roomId, managerId } = await setup()
    const msgId = await t.run(async (ctx) => {
      const manager = (await ctx.db.get(managerId)) as Doc<'users'>
      return sendMessageBy(ctx, manager, roomId, 'Just checking in')
    })
    expect(msgId).toBeDefined()
  })

  test('a different client cannot post into a room they do not own', async () => {
    const { t, roomId, otherClientId } = await setup()
    await expect(
      t.run(async (ctx) => {
        const stranger = (await ctx.db.get(otherClientId)) as Doc<'users'>
        return sendMessageBy(ctx, stranger, roomId, 'sneaking in')
      }),
    ).rejects.toThrow(/Not authorized/)
  })

  test('a non-assigned worker cannot post', async () => {
    const { t, roomId, otherWorkerId } = await setup()
    await expect(
      t.run(async (ctx) => {
        const worker = (await ctx.db.get(otherWorkerId)) as Doc<'users'>
        return sendMessageBy(ctx, worker, roomId, 'sneaking in')
      }),
    ).rejects.toThrow(/Not authorized/)
  })

  test('rejects empty messages via shared zod schema', async () => {
    const { t, roomId, clientId } = await setup()
    await expect(
      t.run(async (ctx) => {
        const client = (await ctx.db.get(clientId)) as Doc<'users'>
        return sendMessageBy(ctx, client, roomId, '   ')
      }),
    ).rejects.toThrow()
  })

  test('lastMessageText + time updated on the room', async () => {
    const { t, roomId, clientId } = await setup()
    const before = await t.run(async (ctx) => ctx.db.get(roomId))
    await new Promise((r) => setTimeout(r, 2))
    await t.run(async (ctx) => {
      const client = (await ctx.db.get(clientId)) as Doc<'users'>
      return sendMessageBy(ctx, client, roomId, 'newest message text')
    })
    const after = await t.run(async (ctx) => ctx.db.get(roomId))
    expect(after?.lastMessageText).toBe('newest message text')
    expect(after?.lastMessageTime).toBeGreaterThan(before?.lastMessageTime ?? 0)
  })
})

describe('canParticipateInRoom', () => {
  test('mirrors canViewRequest semantics', async () => {
    const t = convexTest(schema, modules)
    const result = await t.run(async (ctx) => {
      const owner = await insertUser(ctx, 'client', 'owner')
      const stranger = await insertUser(ctx, 'client', 'stranger')
      const worker = await insertUser(ctx, 'worker', 'w')
      const manager = await insertUser(ctx, 'manager', 'm')
      const requestId = await createServiceRequestFor(ctx, owner, sampleInput)
      await acceptServiceRequestBy(ctx, requestId, worker)
      const req = (await ctx.db.get(requestId)) as Doc<'serviceRequests'>
      return {
        owner: canParticipateInRoom(owner, req),
        worker: canParticipateInRoom(worker, req),
        manager: canParticipateInRoom(manager, req),
        stranger: canParticipateInRoom(stranger, req),
      }
    })
    expect(result.owner).toBe(true)
    expect(result.worker).toBe(true)
    expect(result.manager).toBe(true)
    expect(result.stranger).toBe(false)
  })
})

// Type-only sanity probe.
const _typeProbe = (id: Id<'chatRooms'>) => id
void _typeProbe
