import { v } from 'convex/values'
import {
  addDays,
  addMinutes,
  format,
  startOfHour,
  subDays,
  subMinutes,
} from 'date-fns'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { internalMutation } from './_generated/server'

/**
 * Local-only fixture scripts. Two entry points:
 *   • `seed:wipeData`  — drops every app table EXCEPT `users` and Better Auth.
 *   • `seed:populate`  — looks up users by email and writes a deterministic
 *     spread of requests + chat rooms + chat messages relative to `Date.now()`.
 *
 * Both refuse to run against a production deployment as a soft guard. Run via
 * the bun scripts in `packages/convex/scripts/`.
 */

const refuseProd = (): void => {
  const url = process.env.CONVEX_CLOUD_URL ?? ''
  if (url.includes('prod')) {
    throw new Error('Refusing to seed/wipe a production deployment')
  }
}

const fmtDate = (d: Date): string => format(d, 'yyyy-MM-dd')
const fmtTime = (d: Date): string => format(d, 'HH:mm')

// Tables that hold "content". `users` and Better Auth's component tables are
// intentionally excluded — wiping those would force every test user to sign up
// again on the next dev iteration.
const CONTENT_TABLES = [
  'chatMessages',
  'chatRooms',
  'serviceRequests',
  'pushSubscriptions',
  'summaryStreams',
] as const

export const wipeData = internalMutation({
  args: {},
  handler: async (ctx) => {
    refuseProd()
    const counts: Record<string, number> = {}
    for (const table of CONTENT_TABLES) {
      const docs = await ctx.db.query(table).collect()
      for (const d of docs) await ctx.db.delete(d._id)
      counts[table] = docs.length
    }
    return { deleted: counts }
  },
})

const SeedUserValidator = v.object({
  email: v.string(),
  role: v.union(v.literal('client'), v.literal('worker'), v.literal('manager')),
})

type LookedUpUser = {
  email: string
  role: 'client' | 'worker' | 'manager'
  doc: Doc<'users'>
}

const insertMessage = async (
  ctx: MutationCtx,
  chatRoomId: Id<'chatRooms'>,
  senderId: Id<'users'>,
  text: string,
  createdAt: number,
): Promise<void> => {
  await ctx.db.insert('chatMessages', {
    chatRoomId,
    senderId,
    text,
    createdAt,
  })
  await ctx.db.patch(chatRoomId, {
    lastMessageText: text.slice(0, 120),
    lastMessageTime: createdAt,
    updatedAt: createdAt,
  })
}

const createRoomWithMessages = async (
  ctx: MutationCtx,
  serviceRequestId: Id<'serviceRequests'>,
  baseTime: number,
  messages: Array<{ senderId: Id<'users'>; text: string; offsetMin: number }>,
): Promise<Id<'chatRooms'>> => {
  const firstAt = baseTime + messages[0]!.offsetMin * 60_000
  const roomId = await ctx.db.insert('chatRooms', {
    serviceRequestId,
    status: 'active',
    lastMessageTime: firstAt,
    createdAt: firstAt,
    updatedAt: firstAt,
  })
  for (const m of messages) {
    await insertMessage(
      ctx,
      roomId,
      m.senderId,
      m.text,
      baseTime + m.offsetMin * 60_000,
    )
  }
  return roomId
}

export const populate = internalMutation({
  args: { users: v.array(SeedUserValidator) },
  handler: async (ctx, { users }) => {
    refuseProd()

    const lookups: LookedUpUser[] = []
    const missing: string[] = []
    for (const u of users) {
      const email = u.email.toLowerCase()
      const doc = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', email))
        .unique()
      if (!doc) {
        missing.push(email)
        continue
      }
      lookups.push({ email, role: u.role, doc })
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing app users for: ${missing.join(', ')}. ` +
          'Sign up these accounts via the auth flow first, then re-run seed.',
      )
    }

    // The role in test-users.json is the source of truth for the seed; if the
    // app row drifted (e.g. ADMIN_EMAILS env was different at signup), realign
    // it here so the fixture data matches the JSON.
    const now = Date.now()
    for (const l of lookups) {
      if (l.doc.role !== l.role) {
        await ctx.db.patch(l.doc._id, { role: l.role, updatedAt: now })
        l.doc.role = l.role
      }
    }

    const clients = lookups.filter((l) => l.role === 'client').map((l) => l.doc)
    const workers = lookups.filter((l) => l.role === 'worker').map((l) => l.doc)
    const managers = lookups
      .filter((l) => l.role === 'manager')
      .map((l) => l.doc)

    if (clients.length === 0) {
      throw new Error('test-users.json must contain at least one client')
    }
    if (workers.length === 0) {
      throw new Error('test-users.json must contain at least one worker')
    }

    const c0 = clients[0]!
    const c1 = clients[1] ?? c0
    const w0 = workers[0]!
    const w1 = workers[1] ?? w0
    const mgr = managers[0] ?? null

    const today = startOfHour(new Date(now))
    const created: Record<string, Id<'serviceRequests'>> = {}

    // --- OPEN: client posts a fresh request, not yet picked up
    const openA = await ctx.db.insert('serviceRequests', {
      clientId: c0._id,
      serviceType: 'cleaning',
      date: fmtDate(addDays(today, 2)),
      time: fmtTime(addMinutes(today, 9 * 60)),
      notes: 'Two-bedroom flat, biweekly recurring.',
      status: 'OPEN',
      createdAt: subMinutes(today, 30).getTime(),
      updatedAt: subMinutes(today, 30).getTime(),
    })
    created.openA = openA

    const openB = await ctx.db.insert('serviceRequests', {
      clientId: c1._id,
      serviceType: 'gardening',
      date: fmtDate(addDays(today, 5)),
      time: fmtTime(addMinutes(today, 11 * 60)),
      notes: 'Hedge trim and lawn mow.',
      status: 'OPEN',
      createdAt: subMinutes(today, 90).getTime(),
      updatedAt: subMinutes(today, 90).getTime(),
    })
    created.openB = openB

    // --- ASSIGNED: worker accepted, chat exists with intro exchange
    const assignedAt = subMinutes(today, 120).getTime()
    const assigned = await ctx.db.insert('serviceRequests', {
      clientId: c0._id,
      assignedWorkerId: w0._id,
      serviceType: 'repair',
      date: fmtDate(addDays(today, 1)),
      time: fmtTime(addMinutes(today, 14 * 60 + 30)),
      notes: 'Leaky kitchen faucet, dripping into cabinet.',
      status: 'ASSIGNED',
      createdAt: subMinutes(today, 180).getTime(),
      updatedAt: assignedAt,
    })
    created.assigned = assigned
    await createRoomWithMessages(ctx, assigned, assignedAt, [
      {
        senderId: w0._id,
        text: 'Hi! I picked up your repair job. Confirming tomorrow 14:30?',
        offsetMin: 1,
      },
      {
        senderId: c0._id,
        text: 'Yes, that works. The kitchen is on the second floor.',
        offsetMin: 4,
      },
      {
        senderId: w0._id,
        text: "Got it — I'll bring a basin wrench and replacement washers.",
        offsetMin: 6,
      },
    ])

    // --- IN_PROGRESS: worker is on-site right now, active back-and-forth
    const inProgressStart = subMinutes(today, 30).getTime()
    const inProgress = await ctx.db.insert('serviceRequests', {
      clientId: c1._id,
      assignedWorkerId: w0._id,
      serviceType: 'delivery',
      date: fmtDate(today),
      time: fmtTime(today),
      notes: 'Pick up package from depot, drop at apartment.',
      status: 'IN_PROGRESS',
      createdAt: subMinutes(today, 240).getTime(),
      updatedAt: inProgressStart,
    })
    created.inProgress = inProgress
    await createRoomWithMessages(ctx, inProgress, inProgressStart, [
      {
        senderId: c1._id,
        text: 'On my way out — please leave the package with the doorman.',
        offsetMin: 0,
      },
      {
        senderId: w0._id,
        text: 'Heading to the depot now.',
        offsetMin: 3,
      },
      {
        senderId: w0._id,
        text: 'Picked up. ETA to your place ~25 min.',
        offsetMin: 18,
      },
      {
        senderId: c1._id,
        text: 'Thanks!',
        offsetMin: 19,
      },
      ...(mgr
        ? [
            {
              senderId: mgr._id,
              text: 'Looping in — let me know if there are any issues.',
              offsetMin: 22,
            },
          ]
        : []),
    ])

    // --- COMPLETED: finished yesterday, chat archived feel
    const completedDay = subDays(today, 1)
    const completedCreated = subMinutes(completedDay, 240).getTime()
    const completedAt = addMinutes(completedDay, 60).getTime()
    const completed = await ctx.db.insert('serviceRequests', {
      clientId: c0._id,
      assignedWorkerId: w1._id,
      serviceType: 'cleaning',
      date: fmtDate(completedDay),
      time: fmtTime(addMinutes(completedDay, 10 * 60)),
      notes: 'One-time deep clean before guests arrive.',
      status: 'COMPLETED',
      createdAt: completedCreated,
      updatedAt: completedAt,
    })
    created.completed = completed
    await createRoomWithMessages(ctx, completed, completedCreated, [
      {
        senderId: w1._id,
        text: 'Job accepted. See you at 10:00.',
        offsetMin: 5,
      },
      {
        senderId: c0._id,
        text: 'Door code is 4321. Cleaning supplies under the sink.',
        offsetMin: 12,
      },
      {
        senderId: w1._id,
        text: 'All done! Floors mopped and bathrooms scrubbed.',
        offsetMin: 240,
      },
      {
        senderId: c0._id,
        text: 'Looks great, thank you!',
        offsetMin: 245,
      },
    ])

    // --- CANCELLED: client backed out before assignment, no chat
    const cancelledCreated = subMinutes(today, 60).getTime()
    const cancelled = await ctx.db.insert('serviceRequests', {
      clientId: c1._id,
      serviceType: 'moving',
      date: fmtDate(addDays(today, 3)),
      time: fmtTime(addMinutes(today, 13 * 60)),
      notes: 'Studio apartment, two flights of stairs.',
      status: 'CANCELLED',
      createdAt: cancelledCreated,
      updatedAt: subMinutes(today, 15).getTime(),
    })
    created.cancelled = cancelled

    return {
      users: {
        clients: clients.map((c) => ({ id: c._id, email: c.email })),
        workers: workers.map((w) => ({ id: w._id, email: w.email })),
        managers: managers.map((m) => ({ id: m._id, email: m.email })),
      },
      requests: created,
    }
  },
})
