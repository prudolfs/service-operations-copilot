import { api } from '@service-ops/convex/api'
import { getHomeRouteForRole } from '@service-ops/shared'
import { useMutation, useQuery } from 'convex/react'
import { type Href, Redirect } from 'expo-router'
import { useEffect, useRef } from 'react'
import { ActiveAppState } from '@/auth/useActiveAppState'
import { useAuth } from '@/auth/useAuth'
import { PageLoader } from '@/components/PageLoader'

/**
 * Auth + role gate. Decides which group root to land in, declaratively:
 *
 *   not-loaded → BootSplash
 *   not-signed-in → /(auth)/welcome
 *   signed-in, role unknown → BootSplash + ensureAppUser side effect
 *   signed-in, role known → <Redirect> to that role's home
 *
 * Using `<Redirect>` (instead of imperative `router.replace`) makes the hop
 * happen in the same render as the role resolution, so the destination route
 * mounts directly — no welcome → splash → destination slide chain.
 */
export default function Index() {
  const { user, isLoading } = useAuth()
  const appUser = useQuery(api.users.currentAppUser)
  const ensureAppUser = useMutation(api.users.ensureAppUser)
  const provisionedRef = useRef(false)

  // First-time login: app user row doesn't exist yet → run ensureAppUser
  // once. The `currentAppUser` query is reactive, so when ensureAppUser
  // commits the row this component re-renders with a non-null appUser and
  // the Redirect below fires.
  useEffect(() => {
    if (isLoading) return
    if (!user) return
    if (appUser !== null) return // either undefined (loading) or already there
    if (provisionedRef.current) return
    provisionedRef.current = true
    void ensureAppUser().catch((err) => {
      console.warn('Index: ensureAppUser failed', err)
      provisionedRef.current = false
    })
  }, [isLoading, user, appUser, ensureAppUser])

  // Re-resolve the role when the app comes back to the foreground so an
  // env-var role move (worker ↔ manager) takes effect on the next resume.
  ActiveAppState.useOnForeground(() => {
    if (!user) return
    void ensureAppUser().catch((err) => {
      console.warn('Index: ensureAppUser foreground sync failed', err)
    })
  })

  if (isLoading) return <PageLoader />
  if (!user) return <Redirect href="/(auth)/welcome" />
  if (!appUser) return <PageLoader />

  return <Redirect href={getHomeRouteForRole(appUser.role) as Href} />
}
