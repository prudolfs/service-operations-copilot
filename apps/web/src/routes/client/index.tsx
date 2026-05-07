import { api } from '@service-ops/convex/api'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Plus } from 'lucide-react'
import { PushPermissionBanner } from '@/components/push-permission-banner'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

export const Route = createFileRoute('/client/')({
  component: ClientHome,
})

function ClientHome() {
  const requests = useQuery(api.serviceRequests.listMyRequests)
  const recent = (requests ?? []).slice(0, 3)
  // Surface the push CTA only after the client has at least one request — the
  // "post-first-request" trigger from the PRD. Mirrors the install prompt's
  // logic of waiting for engagement before asking for permissions.
  const hasAnyRequest = (requests?.length ?? 0) > 0

  return (
    <div className="px-6 py-10 lg:px-12">
      <header>
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          Client · Home
        </p>
        <h1 className="mt-2 font-black text-4xl text-surface-text">
          Your dashboard
        </h1>
      </header>

      <Link
        to="/client/requests/new"
        className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-3xl bg-brand-500 px-6 py-4 font-semibold text-base text-white shadow-brand-500/20 shadow-lg hover:bg-brand-600 sm:w-auto sm:self-start"
      >
        <Plus size={20} />
        Create new request
      </Link>

      {hasAnyRequest ? (
        <div className="mt-6">
          <PushPermissionBanner variant="card" />
        </div>
      ) : null}

      <section className="mt-10">
        <p className="text-surface-text-muted text-xs uppercase tracking-widest">
          Recent requests
        </p>
        {requests === undefined ? (
          <p className="mt-3 text-surface-text-muted">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="mt-3 text-base text-surface-text-muted">
            No requests yet.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {recent.map((item) => (
              <li key={item._id}>
                <Link
                  to="/client/requests/$requestId"
                  params={{ requestId: item._id }}
                  className="block rounded-2xl border border-surface-3 bg-surface-1 p-4 hover:bg-surface-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-base text-surface-text">
                      {formatServiceType(item.serviceType)}
                    </p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-surface-text-muted">
                    {formatDateTime(item.date, item.time)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
