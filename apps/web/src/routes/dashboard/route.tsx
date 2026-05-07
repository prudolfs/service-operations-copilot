import { api } from '@service-ops/convex/api'
import { isManager, isWorker } from '@service-ops/shared'
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { InstallBanner } from '@/components/install/InstallBanner'
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

  if (isLoading) return null
  // Send signed-out users to welcome (not /login) so the post-signOut layout
  // re-render lands on the same destination as our manual nav — no flash.
  if (!user) return <Navigate to="/" />
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
      <div className="min-h-screen bg-surface-0 md:pl-64">
        <Sidebar items={nav} eyebrow={eyebrow} />
        <main className="pb-20 md:pb-0">
          <InstallBanner />
          <Outlet />
        </main>
        <MobileTabBar items={nav} />
        <MicButton userRole={role} />
      </div>
    </VoiceProvider>
  )
}
