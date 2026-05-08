import { api } from '@service-ops/convex/api'
import { isClient, isWorker } from '@service-ops/shared'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/useAuth'

export const Route = createFileRoute('/redirect')({
  component: RoleRedirect,
})

/**
 * Auth + role gate. After Better Auth completes, runs `ensureAppUser` once,
 * then re-renders into a `<Navigate>` to the role's home route. Mirrors the
 * mobile `/index` pattern — the redirect happens in the same render cycle as
 * the role resolution so the destination mounts cleanly.
 */
function RoleRedirect() {
  const { user, isLoading } = useAuth()
  const appUser = useQuery(api.users.currentAppUser)
  const ensureAppUser = useMutation(api.users.ensureAppUser)
  const provisionedRef = useRef(false)

  // Capture the cross-domain OAuth `?ott=` token presence on the first render
  // synchronously. `ConvexBetterAuthProvider`'s effect calls
  // `history.replaceState` to strip the token from the URL *before* it
  // awaits the verify call (this ordering changed in @convex-dev/better-auth
  // 0.10), so polling `window.location` from later renders sees a clean URL
  // and we'd bounce to `/` and flash Welcome. Capturing once via the
  // useState initializer keeps the "OAuth in flight" signal stable until
  // `useSession` resolves to a user.
  const [oauthInFlight] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).has('ott')
  })

  useEffect(() => {
    if (isLoading) return
    if (!user) return
    if (appUser !== null) return
    if (provisionedRef.current) return
    provisionedRef.current = true
    void ensureAppUser().catch((err) => {
      console.warn('redirect: ensureAppUser failed', err)
      provisionedRef.current = false
    })
  }, [isLoading, user, appUser, ensureAppUser])

  // Final state: have a user *and* a provisioned app-user row → redirect to
  // the role home. This is the only branch that navigates away on success;
  // every other branch holds a single neutral loading screen so the address
  // bar transitions only once (login → /redirect → role home).
  if (user && appUser) {
    if (isClient(appUser.role)) return <Navigate to="/client" />
    if (isWorker(appUser.role)) return <Navigate to="/dashboard/jobs" />
    return <Navigate to="/dashboard" />
  }

  // Logged-out and not in the middle of an OAuth callback → bounce to
  // Welcome. We avoid this branch while `isLoading` is true (initial session
  // resolution) and while `oauthInFlight` is set (the OTT verify hasn't
  // resolved a session yet) so we don't flash through `/`.
  if (!isLoading && !user && !oauthInFlight) {
    return <Navigate to="/" />
  }

  // Every intermediate state — initial session resolution, OAuth verify in
  // flight, awaiting `ensureAppUser`, awaiting the `currentAppUser` query —
  // renders the same screen so the user perceives a single transition.
  return <Centered>Signing in…</Centered>
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-surface-text-muted">
      {children}
    </div>
  )
}
