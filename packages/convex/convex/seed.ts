import { internalMutation } from './_generated/server'

/**
 * Dev-only fixture: 1 client, 2 workers, 1 manager, 3 requests in mixed
 * states. Wipes the relevant tables first so it's idempotent — safe to run
 * repeatedly while iterating.
 *
 * Run via: `bunx convex run seed:dev` against a dev deployment.
 */
export const dev = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.CONVEX_CLOUD_URL?.includes('prod')) {
      throw new Error('Refusing to seed a production deployment')
    }

    // Wipe — order matters for FK-like consistency even though Convex doesn't
    // enforce it.
    for (const table of ['serviceRequests', 'users'] as const) {
      const docs = await ctx.db.query(table).collect()
      for (const d of docs) await ctx.db.delete(d._id)
    }

    const now = Date.now()

    const clientId = await ctx.db.insert('users', {
      authUserId: 'seed:client-1',
      email: 'client@dev.local',
      name: 'Dev Client',
      role: 'client',
      createdAt: now,
      updatedAt: now,
    })

    const workerAId = await ctx.db.insert('users', {
      authUserId: 'seed:worker-1',
      email: 'worker.a@dev.local',
      name: 'Worker Ada',
      role: 'worker',
      createdAt: now,
      updatedAt: now,
    })

    const workerBId = await ctx.db.insert('users', {
      authUserId: 'seed:worker-2',
      email: 'worker.b@dev.local',
      name: 'Worker Beren',
      role: 'worker',
      createdAt: now,
      updatedAt: now,
    })

    const managerId = await ctx.db.insert('users', {
      authUserId: 'seed:manager-1',
      email: 'manager@dev.local',
      name: 'Dev Manager',
      role: 'manager',
      createdAt: now,
      updatedAt: now,
    })

    const openId = await ctx.db.insert('serviceRequests', {
      clientId,
      serviceType: 'cleaning',
      date: '2026-05-08',
      time: '09:00',
      notes: 'Two-bedroom flat, biweekly.',
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
    })

    const assignedId = await ctx.db.insert('serviceRequests', {
      clientId,
      assignedWorkerId: workerAId,
      serviceType: 'repair',
      date: '2026-05-09',
      time: '14:30',
      notes: 'Leaky kitchen faucet.',
      status: 'ASSIGNED',
      createdAt: now,
      updatedAt: now,
    })

    const inProgressId = await ctx.db.insert('serviceRequests', {
      clientId,
      assignedWorkerId: workerBId,
      serviceType: 'delivery',
      date: '2026-05-07',
      time: '11:00',
      notes: 'Pick up package from depot.',
      status: 'IN_PROGRESS',
      createdAt: now,
      updatedAt: now,
    })

    return {
      users: { clientId, workerAId, workerBId, managerId },
      requests: { openId, assignedId, inProgressId },
    }
  },
})
