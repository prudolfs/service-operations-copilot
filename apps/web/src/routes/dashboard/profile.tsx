import { api } from '@service-ops/convex/api'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { GlassCard } from '@/components/glass'
import { InstallSettingsRow } from '@/components/install/InstallSettingsRow'
import { PushNotificationsRow } from '@/components/push-notifications-row'
import { useAuth } from '@/lib/useAuth'

export const Route = createFileRoute('/dashboard/profile')({
  component: DashboardProfile,
})

function DashboardProfile() {
  const { user, signOut } = useAuth()
  const appUser = useQuery(api.users.currentAppUser)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  // The role layout no longer bounces to `/` on null user (it latches past
  // the OAuth /get-session race), so signOut needs to navigate manually.
  // Fire-and-forget the HTTP call — the cross-domain client's init() hook
  // clears localStorage and atom-resets the session synchronously, so we
  // can navigate immediately without waiting for the round-trip.
  const onSignOut = () => {
    setBusy(true)
    void signOut()
    void navigate({ to: '/' })
  }

  return (
    <div className="px-6 py-10 lg:px-12">
      <header>
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          {appUser?.role === 'manager' ? 'Manager' : 'Worker'} · Profile
        </p>
        <h1 className="mt-2 font-black text-4xl text-surface-text">You</h1>
      </header>

      <GlassCard className="mt-8 max-w-xl">
        <p className="text-surface-text-muted text-xs uppercase tracking-widest">
          Name
        </p>
        <p className="mt-1 text-lg text-surface-text">
          {user?.name ?? 'Unnamed'}
        </p>

        <p className="mt-5 text-surface-text-muted text-xs uppercase tracking-widest">
          Email
        </p>
        <p className="mt-1 text-lg text-surface-text">{user?.email}</p>

        <p className="mt-5 text-surface-text-muted text-xs uppercase tracking-widest">
          Role
        </p>
        <p className="mt-1 text-lg text-surface-text">{appUser?.role ?? '—'}</p>

        <InstallSettingsRow />
        <PushNotificationsRow />

        <button
          type="button"
          disabled={busy}
          onClick={onSignOut}
          className="mt-8 rounded-2xl border border-surface-3 px-5 py-3 font-semibold text-base text-surface-text hover:bg-surface-2 disabled:opacity-60"
        >
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </GlassCard>
    </div>
  )
}
