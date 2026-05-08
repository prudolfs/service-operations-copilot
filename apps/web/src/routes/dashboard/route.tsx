import { api } from '@service-ops/convex/api'
import { isManager, isWorker } from '@service-ops/shared'
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useRef } from 'react'
import { InstallBanner } from '@/components/install/InstallBanner'
import { OfflineBanner } from '@/components/offline-banner'
import {
  MANAGER_NAV,
  MobileTabBar,
  Sidebar,
  WORKER_NAV,
} from '@/components/Sidebar'
import { MicButton } from '@/components/voice/MicButton'
import { VoiceProvider } from '@/components/voice/VoiceContext'
import { useAuth } from '@/lib/useAuth'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const { user, isLoading } = useAuth()
  const appUser = useQuery(api.users.currentAppUser)

  // Latch "seen authenticated" once. The cross-domain client races two
  // /get-session calls during the OAuth callback (initial mount fetch + the
  // post-OTT signal-triggered fetch); if the stale `data: null` response
  // lands last it overwrites the atom's user back to null *and* clears the
  // freshly-set session_token from localStorage. Bouncing to `/` on that
  // transient null causes a Welcome flash on top of the destination route.
  // SignOut handlers navigate manually, so this latch only suppresses the
  // race — real exits don't depend on the auth gate.
  const wasAuthRef = useRef(false)
  if (user) wasAuthRef.current = true

  if (isLoading) return null
  if (!user) {
    if (wasAuthRef.current) return null
    return <Navigate to="/" />
  }
  if (appUser === undefined) return null
  if (appUser === null) return <Navigate to="/redirect" />
  if (!isWorker(appUser.role) && !isManager(appUser.role)) {
    return <Navigate to="/redirect" />
  }

  const role = appUser.role as 'worker' | 'manager'
  const nav = role === 'manager' ? MANAGER_NAV : WORKER_NAV
  const eyebrow = role === 'manager' ? 'Manager' : 'Worker'

  return (
    <VoiceProvider>
      <div className="min-h-dvh bg-surface-0 md:pl-64">
        <Sidebar items={nav} eyebrow={eyebrow} />
        <main className="pt-safe pb-24 md:pb-0">
          <OfflineBanner />
          <InstallBanner />
          <Outlet />
        </main>
        <MobileTabBar items={nav} />
        <MicButton userRole={role} />
      </div>
    </VoiceProvider>
  )
}
