import { api } from '@service-ops/convex/api'
import type { Doc, Id } from '@service-ops/convex/dataModel'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { GlassCard, GlassSurface } from '@/components/glass'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

type Detail = {
  worker: Doc<'users'>
  recentJobs: Doc<'serviceRequests'>[]
  activeAssignments: number
  completedAllTime: number
}

export const Route = createFileRoute('/dashboard/workers/$workerId')({
  component: WorkerDetail,
})

function WorkerDetail() {
  const { workerId } = Route.useParams()
  const id = workerId as Id<'users'>
  const detail = useQuery(api.manager.workerDetail, { workerId: id }) as
    | Detail
    | null
    | undefined

  if (detail === undefined) {
    return <p className="px-6 py-10 text-surface-text-muted">Loading…</p>
  }
  if (detail === null) {
    return (
      <p className="px-6 py-10 text-surface-text-muted">Worker not found.</p>
    )
  }

  return (
    <div className="px-6 py-10 lg:px-12">
      <header>
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          Manager · Worker
        </p>
        <h1 className="mt-2 font-black text-4xl text-surface-text">
          {detail.worker.name ?? detail.worker.email}
        </h1>
        <p className="mt-1 text-base text-surface-text-muted">
          {detail.worker.email}
        </p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <GlassSurface>
          <p className="text-surface-text-muted text-xs uppercase tracking-widest">
            Active
          </p>
          <p className="mt-2 font-black text-3xl text-surface-text">
            {detail.activeAssignments}
          </p>
        </GlassSurface>
        <GlassSurface>
          <p className="text-surface-text-muted text-xs uppercase tracking-widest">
            Completed
          </p>
          <p className="mt-2 font-black text-3xl text-surface-text">
            {detail.completedAllTime}
          </p>
        </GlassSurface>
      </section>

      <section className="mt-10">
        <p className="text-surface-text-muted text-xs uppercase tracking-widest">
          Recent jobs
        </p>
        {detail.recentJobs.length === 0 ? (
          <GlassCard className="mt-3">
            <p className="text-base text-surface-text-muted">
              This worker hasn't picked up any jobs yet.
            </p>
          </GlassCard>
        ) : (
          <ul className="mt-3 grid gap-3">
            {detail.recentJobs.map((job) => (
              <li key={job._id}>
                <Link
                  to="/dashboard/requests/$requestId"
                  params={{ requestId: job._id }}
                  className="block rounded-2xl border border-surface-3 bg-surface-1 p-4 hover:bg-surface-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-base text-surface-text">
                      {formatServiceType(job.serviceType)}
                    </p>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="mt-2 text-sm text-surface-text-muted">
                    {formatDateTime(job.date, job.time)}
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
