/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import schema from './schema'
import { resolveRoleFromEnv, upsertAppUser } from './users'

const modules = import.meta.glob('./**/*.ts')

const setEnv = (admins?: string, workers?: string) => {
  if (admins === undefined) delete process.env.ADMIN_EMAILS
  else process.env.ADMIN_EMAILS = admins
  if (workers === undefined) delete process.env.WORKER_EMAILS
  else process.env.WORKER_EMAILS = workers
}

beforeEach(() => setEnv())
afterEach(() => setEnv())

describe('resolveRoleFromEnv', () => {
  test('defaults to client when no env set', () => {
    expect(resolveRoleFromEnv('alice@example.com')).toBe('client')
  })

  test('promotes to manager when in ADMIN_EMAILS', () => {
    setEnv('admin@example.com,boss@example.com')
    expect(resolveRoleFromEnv('admin@example.com')).toBe('manager')
    expect(resolveRoleFromEnv('boss@example.com')).toBe('manager')
  })

  test('promotes to worker when in WORKER_EMAILS', () => {
    setEnv(undefined, 'worker@example.com')
    expect(resolveRoleFromEnv('worker@example.com')).toBe('worker')
  })

  test('admin list wins over worker list', () => {
    setEnv('shared@example.com', 'shared@example.com')
    expect(resolveRoleFromEnv('shared@example.com')).toBe('manager')
  })

  test('matches case-insensitively and trims whitespace', () => {
    setEnv('  Admin@Example.com  , boss@example.com')
    expect(resolveRoleFromEnv('admin@example.com')).toBe('manager')
    expect(resolveRoleFromEnv('ADMIN@EXAMPLE.COM')).toBe('manager')
  })
})

describe('upsertAppUser', () => {
  test('creates a client by default', async () => {
    const t = convexTest(schema, modules)
    const result = await t.run((ctx) =>
      upsertAppUser(ctx, {
        _id: 'auth-1',
        email: 'alice@example.com',
        name: 'Alice',
      }),
    )
    expect(result.role).toBe('client')
    expect(result.email).toBe('alice@example.com')
    expect(result.name).toBe('Alice')
    expect(result.authUserId).toBe('auth-1')
  })

  test('creates a manager when email matches ADMIN_EMAILS', async () => {
    setEnv('admin@example.com')
    const t = convexTest(schema, modules)
    const result = await t.run((ctx) =>
      upsertAppUser(ctx, {
        _id: 'auth-2',
        email: 'admin@example.com',
        name: 'Admin',
      }),
    )
    expect(result.role).toBe('manager')
  })

  test('creates a worker when email matches WORKER_EMAILS', async () => {
    setEnv(undefined, 'worker@example.com')
    const t = convexTest(schema, modules)
    const result = await t.run((ctx) =>
      upsertAppUser(ctx, {
        _id: 'auth-3',
        email: 'worker@example.com',
        name: 'Worker',
      }),
    )
    expect(result.role).toBe('worker')
  })

  test('lowercases incoming email', async () => {
    const t = convexTest(schema, modules)
    const result = await t.run((ctx) =>
      upsertAppUser(ctx, {
        _id: 'auth-4',
        email: 'CamelCase@Example.COM',
        name: 'Camel',
      }),
    )
    expect(result.email).toBe('camelcase@example.com')
  })

  test('is idempotent — repeat calls return the same row', async () => {
    const t = convexTest(schema, modules)
    const first = await t.run((ctx) =>
      upsertAppUser(ctx, {
        _id: 'auth-5',
        email: 'repeat@example.com',
        name: 'Repeat',
      }),
    )
    const second = await t.run((ctx) =>
      upsertAppUser(ctx, {
        _id: 'auth-5',
        email: 'repeat@example.com',
        name: 'Repeat',
      }),
    )
    expect(second._id).toBe(first._id)

    const all = await t.run((ctx) => ctx.db.query('users').collect())
    expect(all).toHaveLength(1)
  })

  test('re-resolves role when env changes between calls', async () => {
    const t = convexTest(schema, modules)
    const first = await t.run((ctx) =>
      upsertAppUser(ctx, {
        _id: 'auth-6',
        email: 'mover@example.com',
        name: 'Mover',
      }),
    )
    expect(first.role).toBe('client')

    setEnv(undefined, 'mover@example.com')
    const second = await t.run((ctx) =>
      upsertAppUser(ctx, {
        _id: 'auth-6',
        email: 'mover@example.com',
        name: 'Mover',
      }),
    )
    expect(second._id).toBe(first._id)
    expect(second.role).toBe('worker')

    setEnv('mover@example.com')
    const third = await t.run((ctx) =>
      upsertAppUser(ctx, {
        _id: 'auth-6',
        email: 'mover@example.com',
        name: 'Mover',
      }),
    )
    expect(third._id).toBe(first._id)
    expect(third.role).toBe('manager')
  })
})
