import { api } from '@service-ops/convex/api'
import type { Doc } from '@service-ops/convex/dataModel'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { GlassCard } from '@/components/glass'

type RosterItem = {
  worker: Doc<'users'>
  activeAssignments: number
  inProgress: number
}

export const Route = createFileRoute('/dashboard/workers/')({
  component: WorkersList,
})

function WorkersList() {
  const roster = useQuery(api.manager.listWorkers) as RosterItem[] | undefined

  return (
    <div className="px-6 py-10 lg:px-12">
      <header>
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          Manager · Workers
        </p>
        <h1 className="mt-2 font-black text-4xl text-surface-text">Workers</h1>
      </header>

      <section className="mt-8">
        {roster === undefined ? (
          <p className="text-surface-text-muted">Loading…</p>
        ) : roster.length === 0 ? (
          <GlassCard>
            <p className="font-semibold text-base text-surface-text">
              No workers yet
            </p>
            <p className="mt-2 text-base text-surface-text-muted">
              Add an email to WORKER_EMAILS in Convex, then ask them to sign in.
            </p>
          </GlassCard>
        ) : (
          <ul className="grid gap-3">
            {roster.map((item) => {
              const initials = (item.worker.name ?? item.worker.email)
                .split(/\s+/)
                .map((p) => p[0]?.toUpperCase() ?? '')
                .slice(0, 2)
                .join('')
              return (
                <li key={item.worker._id}>
                  <Link
                    to="/dashboard/workers/$workerId"
                    params={{ workerId: item.worker._id }}
                    className="flex items-center gap-4 rounded-2xl border border-surface-3 bg-surface-1 p-4 hover:bg-surface-2"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/20">
                      <span className="font-semibold text-base text-brand-300">
                        {initials || '·'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-base text-surface-text">
                        {item.worker.name ?? item.worker.email}
                      </p>
                      <p className="text-sm text-surface-text-muted">
                        {item.worker.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-black text-2xl ${
                          item.activeAssignments > 0
                            ? 'text-surface-text'
                            : 'text-surface-text-muted'
                        }`}
                      >
                        {item.activeAssignments}
                      </p>
                      <p className="text-surface-text-muted text-xs uppercase tracking-widest">
                        {item.inProgress > 0
                          ? `${item.inProgress} live`
                          : 'active'}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
