import { api } from '@service-ops/convex/api'
import { getHomeRouteForRole } from '@service-ops/shared'
import { useMutation } from 'convex/react'
import { type Href, router } from 'expo-router'
import { useCallback, useEffect } from 'react'
import { ActiveAppState } from '@/auth/useActiveAppState'
import { useAuth } from '@/auth/useAuth'

/**
 * Side-effect component. While mounted:
 *   1. Waits for `useAuth` to resolve.
 *   2. Calls `ensureAppUser` once on sign-in and again on every app foreground,
 *      so role changes via env vars take effect on the next resume.
 *   3. Replaces the current route to the role's home group.
 *
 * Renders nothing.
 */
export function RoleRedirect() {
  const { user, isLoading } = useAuth()
  const ensureAppUser = useMutation(api.users.ensureAppUser)

  const sync = useCallback(async () => {
    if (!user) return
    try {
      const appUser = await ensureAppUser()
      router.replace(getHomeRouteForRole(appUser.role) as Href)
    } catch (err) {
      console.warn('RoleRedirect: ensureAppUser failed', err)
    }
  }, [user, ensureAppUser])

  // Initial sync once auth resolves.
  useEffect(() => {
    if (isLoading) return
    if (!user) return
    void sync()
  }, [isLoading, user, sync])

  // Re-sync when the app comes back to the foreground.
  ActiveAppState.useOnForeground(() => {
    if (!user) return
    void sync()
  })

  return null
}
