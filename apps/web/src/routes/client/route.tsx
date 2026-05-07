import { api } from '@service-ops/convex/api'
import { isClient } from '@service-ops/shared'
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
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

  if (isLoading) return null
  // Send signed-out users to welcome (not /login) so the post-signOut layout
  // re-render lands on the same destination as our manual nav — no flash.
  if (!user) return <Navigate to="/" />
  if (appUser === undefined) return null
  if (appUser === null) return <Navigate to="/redirect" />
  if (!isClient(appUser.role)) return <Navigate to="/redirect" />

  return (
    <VoiceProvider>
      <div className="min-h-screen bg-surface-0 md:pl-64">
        <Sidebar items={CLIENT_NAV} eyebrow="Client" />
        <main className="pb-20 md:pb-0">
          <Outlet />
        </main>
        <MobileTabBar items={CLIENT_NAV} />
        <MicButton userRole="client" />
      </div>
    </VoiceProvider>
  )
}
