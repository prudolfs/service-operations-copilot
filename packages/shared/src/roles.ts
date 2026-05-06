import { z } from 'zod'

export const RoleSchema = z.enum(['client', 'worker', 'manager'])
export type Role = z.infer<typeof RoleSchema>

export const isClient = (role: Role | null | undefined): role is 'client' =>
  role === 'client'

export const isWorker = (role: Role | null | undefined): role is 'worker' =>
  role === 'worker'

export const isManager = (role: Role | null | undefined): role is 'manager' =>
  role === 'manager'

/**
 * Route group root for a given role. Used by mobile RoleRedirect (Phase 1) and
 * web role redirect (Phase 7) so navigation stays in lockstep with backend role
 * resolution.
 */
export const getHomeRouteForRole = (role: Role): string => {
  switch (role) {
    case 'client':
      return '/(client)'
    case 'worker':
      return '/(worker)'
    case 'manager':
      return '/(manager)'
  }
}
