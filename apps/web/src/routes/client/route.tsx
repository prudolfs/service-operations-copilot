import { api } from '@service-ops/convex/api'
import { isClient } from '@service-ops/shared'
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useRef } from 'react'
import { OfflineBanner } from '@/components/offline-banner'
import { CLIENT_NAV, MobileTabBar, Sidebar } from '@/components/Sidebar'
import { MicButton } from '@/components/voice/MicButton'
import { VoiceProvider } from '@/components/voice/VoiceContext'
import { useAuth } from '@/lib/useAuth'

export const Route = createFileRoute('/client')({
  component: ClientLayout,
})

function ClientLayout() {
  const { user, isLoading } = useAuth()
  const appUser = useQuery(api.users.currentAppUser)

  // See DashboardLayout for the full rationale: latch "seen authenticated"
  // so a transient null from the OAuth /get-session race doesn't bounce us
  // to `/` and flash Welcome on top of the destination route.
  const wasAuthRef = useRef(false)
  if (user) wasAuthRef.current = true

  if (isLoading) return null
  if (!user) {
    if (wasAuthRef.current) return null
    return <Navigate to="/" />
  }
  if (appUser === undefined) return null
  if (appUser === null) return <Navigate to="/redirect" />
  if (!isClient(appUser.role)) return <Navigate to="/redirect" />

  return (
    <VoiceProvider>
      <div className="min-h-dvh bg-surface-0 md:pl-64">
        <Sidebar items={CLIENT_NAV} eyebrow="Client" />
        <main className="pt-safe pb-24 md:pb-0">
          <OfflineBanner />
          <Outlet />
        </main>
        <MobileTabBar items={CLIENT_NAV} />
        <MicButton userRole="client" />
      </div>
    </VoiceProvider>
  )
}
