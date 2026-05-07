import { api } from '@service-ops/convex/api'
import type { Doc } from '@service-ops/convex/dataModel'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { GlassCard, GlassSurface } from '@/components/glass'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

type Overview = {
  totalActive: number
  inProgress: number
  unassignedOpen: number
  completedToday: number
  needsAttention: Doc<'serviceRequests'>[]
}

export const Route = createFileRoute('/dashboard/')({
  component: DashboardOverview,
})

function DashboardOverview() {
  const data = useQuery(api.manager.overview) as Overview | undefined

  if (data === undefined) {
    return <p className="px-6 py-10 text-surface-text-muted">Loading…</p>
  }

  return (
    <div className="px-6 py-10 lg:px-12">
      <header>
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          Manager · Overview
        </p>
        <h1 className="mt-2 font-black text-4xl text-surface-text">
          Operations
        </h1>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Active"
          value={data.totalActive}
          hint="Open + assigned + in progress"
        />
        <Metric
          label="In progress"
          value={data.inProgress}
          hint="Workers on the clock"
        />
        <Metric
          label="Unassigned"
          value={data.unassignedOpen}
          hint="Need a worker"
          warn={data.unassignedOpen > 0}
        />
        <Metric
          label="Done today"
          value={data.completedToday}
          hint="Completed since midnight"
        />
      </section>

      <section className="mt-10">
        <p className="text-surface-text-muted text-xs uppercase tracking-widest">
          Needs attention
        </p>
        {data.needsAttention.length === 0 ? (
          <GlassCard className="mt-3">
            <p className="font-semibold text-base text-surface-text">
              Inbox zero
            </p>
            <p className="mt-2 text-base text-surface-text-muted">
              Every open request has a worker. Nothing needs your attention
              right now.
            </p>
          </GlassCard>
        ) : (
          <ul className="mt-3 grid gap-3">
            {data.needsAttention.map((req) => (
              <li key={req._id}>
                <Link
                  to="/dashboard/requests/$requestId"
                  params={{ requestId: req._id }}
                  className="block rounded-2xl border border-surface-3 bg-surface-1 p-4 hover:bg-surface-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-base text-surface-text">
                      {formatServiceType(req.serviceType)}
                    </p>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="mt-2 text-sm text-surface-text-muted">
                    {formatDateTime(req.date, req.time)}
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

function Metric({
  label,
  value,
  hint,
  warn,
}: {
  label: string
  value: number
  hint?: string
  warn?: boolean
}) {
  return (
    <GlassSurface>
      <p className="text-surface-text-muted text-xs uppercase tracking-widest">
        {label}
      </p>
      <p
        className={`mt-2 font-black text-4xl ${warn ? 'text-status-open' : 'text-surface-text'}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-sm text-surface-text-muted">{hint}</p>
      ) : null}
    </GlassSurface>
  )
}
