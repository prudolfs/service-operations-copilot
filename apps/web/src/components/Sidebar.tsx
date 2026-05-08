import { api } from '@service-ops/convex/api'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import {
  Briefcase,
  ClipboardList,
  Home,
  type LucideIcon,
  MessageSquare,
  UserCircle,
  Users,
} from 'lucide-react'
import { useVoiceContext } from '@/components/voice/VoiceContext'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/useAuth'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

export const CLIENT_NAV: NavItem[] = [
  { to: '/client', label: 'Home', icon: Home },
  { to: '/client/requests', label: 'Requests', icon: ClipboardList },
  { to: '/client/messages', label: 'Messages', icon: MessageSquare },
  { to: '/client/profile', label: 'Profile', icon: UserCircle },
]

export const WORKER_NAV: NavItem[] = [
  { to: '/dashboard/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { to: '/dashboard/profile', label: 'Profile', icon: UserCircle },
]

export const MANAGER_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: Home },
  { to: '/dashboard/requests', label: 'Requests', icon: ClipboardList },
  { to: '/dashboard/workers', label: 'Workers', icon: Users },
  { to: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { to: '/dashboard/profile', label: 'Profile', icon: UserCircle },
]

export function Sidebar({
  items,
  eyebrow,
}: {
  items: NavItem[]
  eyebrow: string
}) {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-surface-3 border-r bg-surface-1 p-6 md:flex">
      <div className="mb-8">
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          {eyebrow}
        </p>
        <p className="mt-1 font-black text-2xl text-surface-text">
          Service Ops
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active =
            item.to === location.pathname ||
            (item.to !== '/client' &&
              item.to !== '/dashboard' &&
              location.pathname.startsWith(`${item.to}/`)) ||
            (item.to === '/client' && location.pathname === '/client') ||
            (item.to === '/dashboard' && location.pathname === '/dashboard')
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-base transition',
                active
                  ? 'bg-brand-500/20 font-semibold text-brand-200'
                  : 'text-surface-text-muted hover:bg-surface-2 hover:text-surface-text',
              )}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {user ? (
        <div className="mt-6 rounded-xl border border-surface-3 bg-surface-2/40 p-3">
          <p className="truncate text-sm text-surface-text">
            {user.name ?? user.email}
          </p>
          <p className="truncate text-surface-text-muted text-xs">
            {user.email}
          </p>
          <SignOutButton />
        </div>
      ) : null}
    </aside>
  )
}

function SignOutButton() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => {
        // Fire-and-forget the HTTP /sign-out call. The cross-domain
        // client's init() hook clears localStorage and atom-resets the
        // session synchronously inside the fetch lifecycle, so React
        // sees user=null right away — awaiting the round-trip just adds
        // visible latency before navigation.
        void signOut()
        void navigate({ to: '/' })
      }}
      className="mt-3 w-full rounded-lg border border-surface-3 bg-surface-1 px-3 py-2 text-left text-sm text-surface-text-muted hover:bg-surface-2 hover:text-surface-text"
    >
      Sign out
    </button>
  )
}

/**
 * Mobile bottom-bar fallback for screens narrower than `md`. Mirrors the
 * sidebar items so navigation remains accessible without scrolling.
 */
export function MobileTabBar({ items }: { items: NavItem[] }) {
  const location = useLocation()
  const { context } = useVoiceContext()
  // Chat detail is a full-screen takeover (`fixed inset-0`); the tab bar
  // covered the composer at z-30. Hide it there — the chat header has its
  // own back button for navigation on mobile.
  if (context.screen === 'chat') return null
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-surface-3 border-t bg-surface-1 px-2 pb-safe md:hidden">
      {items.map((item) => {
        const active =
          item.to === location.pathname ||
          (item.to !== '/client' &&
            item.to !== '/dashboard' &&
            location.pathname.startsWith(`${item.to}/`))
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 px-2 py-3 text-xs',
              active ? 'text-brand-200' : 'text-surface-text-muted',
            )}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function useEnsureAppUser() {
  return useMutation(api.users.ensureAppUser)
}
