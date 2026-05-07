import { api } from '@service-ops/convex/api'
import { isClient, isWorker } from '@service-ops/shared'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useRef } from 'react'
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

  if (isLoading) return <Centered>Loading…</Centered>
  if (!user) return <Navigate to="/" />
  if (appUser === undefined || appUser === null) {
    return <Centered>Setting up your account…</Centered>
  }

  if (isClient(appUser.role)) return <Navigate to="/client" />
  if (isWorker(appUser.role)) return <Navigate to="/dashboard/jobs" />
  return <Navigate to="/dashboard" />
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-surface-text-muted">
      {children}
    </div>
  )
}
