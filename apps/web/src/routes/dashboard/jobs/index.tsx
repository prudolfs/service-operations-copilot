import { api } from '@service-ops/convex/api'
import type { Doc } from '@service-ops/convex/dataModel'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { GlassCard } from '@/components/glass'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'

export const Route = createFileRoute('/dashboard/jobs/')({
  component: WorkerJobsList,
})

function WorkerJobsList() {
  const open = useQuery(api.serviceRequests.listOpen)
  const mine = useQuery(api.serviceRequests.listMyJobs)

  return (
    <div className="px-6 py-10 lg:px-12">
      <header>
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          Worker · Jobs
        </p>
        <h1 className="mt-2 font-black text-4xl text-surface-text">
          Your work
        </h1>
      </header>

      <Section title="My jobs" jobs={mine} emptyHint="No active assignments." />
      <Section
        title="Open jobs"
        jobs={open}
        emptyHint="No open requests right now."
      />
    </div>
  )
}

function Section({
  title,
  jobs,
  emptyHint,
}: {
  title: string
  jobs: Doc<'serviceRequests'>[] | undefined
  emptyHint: string
}) {
  return (
    <section className="mt-8">
      <p className="text-surface-text-muted text-xs uppercase tracking-widest">
        {title}
      </p>
      {jobs === undefined ? (
        <p className="mt-3 text-surface-text-muted">Loading…</p>
      ) : jobs.length === 0 ? (
        <GlassCard className="mt-3">
          <p className="text-base text-surface-text-muted">{emptyHint}</p>
        </GlassCard>
      ) : (
        <ul className="mt-3 grid gap-3">
          {jobs.map((job) => (
            <li key={job._id}>
              <Link
                to="/dashboard/jobs/$jobId"
                params={{ jobId: job._id }}
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
                {job.notes ? (
                  <p className="mt-2 line-clamp-2 text-sm text-surface-text-muted">
                    {job.notes}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
