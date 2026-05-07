import { api } from '@service-ops/convex/api'
import type { ServiceRequestStatus } from '@service-ops/shared'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { GlassCard } from '@/components/glass'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/cn'
import { formatDateTime, formatServiceType } from '@/lib/format'

type StatusFilter = 'ALL' | ServiceRequestStatus
type AssigneeFilter = 'any' | 'assigned' | 'unassigned'
type SortOrder = 'newest' | 'oldest'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const ASSIGNEE_FILTERS: { value: AssigneeFilter; label: string }[] = [
  { value: 'any', label: 'Any assignee' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'assigned', label: 'Has worker' },
]

export const Route = createFileRoute('/dashboard/requests/')({
  component: ManagerRequestsList,
})

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs',
        selected
          ? 'bg-brand-500 font-semibold text-white'
          : 'border border-surface-3 bg-surface-1 text-surface-text-muted hover:bg-surface-2',
      )}
    >
      {label}
    </button>
  )
}

function ManagerRequestsList() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('any')
  const [sort, setSort] = useState<SortOrder>('newest')

  const requests = useQuery(
    api.serviceRequests.listAll,
    statusFilter === 'ALL' ? {} : { status: statusFilter },
  )

  const visible = useMemo(() => {
    if (!requests) return undefined
    const filtered = requests.filter((r) => {
      if (assigneeFilter === 'unassigned') return !r.assignedWorkerId
      if (assigneeFilter === 'assigned') return Boolean(r.assignedWorkerId)
      return true
    })
    return [...filtered].sort((a, b) =>
      sort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    )
  }, [requests, assigneeFilter, sort])

  return (
    <div className="px-6 py-10 lg:px-12">
      <header>
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          Manager · Requests
        </p>
        <h1 className="mt-2 font-black text-4xl text-surface-text">
          All requests
        </h1>
      </header>

      <div className="mt-6 grid gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              selected={statusFilter === f.value}
              onClick={() => setStatusFilter(f.value)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {ASSIGNEE_FILTERS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              selected={assigneeFilter === f.value}
              onClick={() => setAssigneeFilter(f.value)}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-surface-text-muted text-xs uppercase tracking-widest">
            Sort
          </span>
          <Chip
            label="Newest"
            selected={sort === 'newest'}
            onClick={() => setSort('newest')}
          />
          <Chip
            label="Oldest"
            selected={sort === 'oldest'}
            onClick={() => setSort('oldest')}
          />
        </div>
      </div>

      <section className="mt-6">
        {visible === undefined ? (
          <p className="text-surface-text-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <GlassCard>
            <p className="text-base text-surface-text-muted">
              Nothing matches the current filters.
            </p>
          </GlassCard>
        ) : (
          <ul className="grid gap-3">
            {visible.map((item) => (
              <li key={item._id}>
                <Link
                  to="/dashboard/requests/$requestId"
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
                  {!item.assignedWorkerId ? (
                    <p className="mt-1 text-status-open text-xs uppercase tracking-widest">
                      Unassigned
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
