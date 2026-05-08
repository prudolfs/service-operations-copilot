#!/usr/bin/env bun
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')
const usersPath = resolve(here, 'test-users.json')

if (!existsSync(usersPath)) {
  console.error(
    `Missing ${usersPath}.\n` +
      'Copy scripts/test-users.example.json → scripts/test-users.json and ' +
      'fill in real test accounts (which must already be signed up via the ' +
      'auth flow).',
  )
  process.exit(1)
}

type SeedUser = {
  email: string
  password: string
  role: 'client' | 'worker' | 'manager'
}

const raw = JSON.parse(readFileSync(usersPath, 'utf8')) as unknown
if (!Array.isArray(raw) || raw.length === 0) {
  console.error('test-users.json must be a non-empty array')
  process.exit(1)
}

for (const u of raw as SeedUser[]) {
  if (typeof u.email !== 'string' || typeof u.password !== 'string') {
    console.error('Each entry needs string email and password')
    process.exit(1)
  }
  if (u.role !== 'client' && u.role !== 'worker' && u.role !== 'manager') {
    console.error(`Invalid role for ${u.email}: ${u.role}`)
    process.exit(1)
  }
}

const args = JSON.stringify({
  users: (raw as SeedUser[]).map((u) => ({ email: u.email, role: u.role })),
})

const result = spawnSync('bunx', ['convex', 'run', 'seed:populate', args], {
  stdio: 'inherit',
  cwd: pkgRoot,
})
process.exit(result.status ?? 1)
