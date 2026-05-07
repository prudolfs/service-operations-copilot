import { api } from '@service-ops/convex/api'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { GlassCard } from '@/components/glass'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

export const Route = createFileRoute('/client/requests/')({
  component: ClientRequestsList,
})

function ClientRequestsList() {
  const requests = useQuery(api.serviceRequests.listMyRequests)

  return (
    <div className="px-6 py-10 lg:px-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
            Client · Requests
          </p>
          <h1 className="mt-2 font-black text-4xl text-surface-text">
            Your requests
          </h1>
        </div>
        <Link
          to="/client/requests/new"
          className="rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-base text-white hover:bg-brand-600"
        >
          + New request
        </Link>
      </header>

      <section className="mt-8">
        {requests === undefined ? (
          <p className="text-surface-text-muted">Loading…</p>
        ) : requests.length === 0 ? (
          <GlassCard>
            <p className="text-base text-surface-text-muted">
              No requests yet. Tap "New request" to create your first one.
            </p>
          </GlassCard>
        ) : (
          <ul className="grid gap-3">
            {requests.map((item) => (
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
                  {item.notes ? (
                    <p className="mt-2 line-clamp-2 text-sm text-surface-text-muted">
                      {item.notes}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
