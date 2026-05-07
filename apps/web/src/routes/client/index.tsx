import { api } from '@service-ops/convex/api'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { GlassCard } from '@/components/glass'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

export const Route = createFileRoute('/client/')({
  component: ClientHome,
})

function ClientHome() {
  const requests = useQuery(api.serviceRequests.listMyRequests)
  const recent = (requests ?? []).slice(0, 3)

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

      <GlassCard className="mt-8">
        <h2 className="font-semibold text-lg text-surface-text">
          Need a hand?
        </h2>
        <p className="mt-2 text-base text-surface-text-muted">
          Create a service request and a worker will pick it up.
        </p>
        <Link
          to="/client/requests/new"
          className="mt-4 inline-block rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-base text-white hover:bg-brand-600"
        >
          + New request
        </Link>
      </GlassCard>

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
