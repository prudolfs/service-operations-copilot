import { api } from '@service-ops/convex/api'
import type { Doc, Id } from '@service-ops/convex/dataModel'
import type { ServiceRequestStatus } from '@service-ops/shared'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/glass'
import { StatusBadge } from '@/components/StatusBadge'
import { SummaryPanel } from '@/components/SummaryPanel'
import { useVoiceContext } from '@/components/voice/VoiceContext'
import { cn } from '@/lib/cn'
import { formatDateTime, formatServiceType } from '@/lib/format'

const ALL_STATUSES: ServiceRequestStatus[] = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]

export const Route = createFileRoute('/dashboard/requests/$requestId')({
  component: ManagerRequestDetail,
})

function ManagerRequestDetail() {
  const { requestId } = Route.useParams()
  const id = requestId as Id<'serviceRequests'>
  const navigate = useNavigate()
  const data = useQuery(api.serviceRequests.getById, { requestId: id })
  const room = useQuery(api.chat.getRoomForRequest, { serviceRequestId: id })
  const workers = useQuery(api.users.listWorkers)
  const assignWorker = useMutation(api.serviceRequests.assignWorker)
  const setStatus = useMutation(api.serviceRequests.setStatus)
  const cancel = useMutation(api.serviceRequests.cancel)
  const summarize = useAction(api.ai.summary.summarizeRequest)

  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamId, setStreamId] = useState<Id<'summaryStreams'> | null>(null)
  const [summarizing, setSummarizing] = useState(false)

  const { setContext } = useVoiceContext()
  useEffect(() => {
    setContext({ screen: 'request-detail', currentRequestId: id })
    return () => setContext({})
  }, [id, setContext])

  if (data === undefined) {
    return <p className="px-6 py-10 text-surface-text-muted">Loading…</p>
  }
  if (data === null) {
    return (
      <p className="px-6 py-10 text-surface-text-muted">Request not found.</p>
    )
  }

  const { request, client, assignedWorker } = data

  const wrap = (key: string, fn: () => Promise<unknown>) => async () => {
    setError(null)
    setBusy(key)
    try {
      await fn()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const onAssign = (worker: Doc<'users'>) =>
    wrap(`assign-${worker._id}`, () =>
      assignWorker({ requestId: id, workerId: worker._id }),
    )

  const onSetStatus = (status: ServiceRequestStatus) =>
    wrap(`status-${status}`, () => setStatus({ requestId: id, status }))

  const onCancel = async () => {
    if (!confirm('Cancel this request?')) return
    await wrap('cancel', () => cancel({ requestId: id }))()
    await navigate({ to: '/dashboard/requests' })
  }

  const onSummarize = async () => {
    setError(null)
    setSummarizing(true)
    try {
      const { streamId: sid } = await summarize({ requestId: id })
      setStreamId(sid)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <div className="px-6 py-10 lg:px-12">
      <header>
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          Manager · Request
        </p>
        <h1 className="mt-2 font-black text-4xl text-surface-text">
          {formatServiceType(request.serviceType)}
        </h1>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="grid gap-4">
          <GlassCard>
            <StatusBadge status={request.status} />
            <p className="mt-4 text-base text-surface-text">
              {formatDateTime(request.date, request.time)}
            </p>
            {request.notes ? (
              <p className="mt-3 text-base text-surface-text-muted">
                {request.notes}
              </p>
            ) : null}
            <div className="mt-4 border-surface-3 border-t pt-4">
              <p className="text-surface-text-muted text-xs uppercase tracking-widest">
                Client
              </p>
              <p className="mt-1 text-base text-surface-text">
                {client?.name ?? client?.email ?? 'Unknown'}
              </p>
              <p className="mt-3 text-surface-text-muted text-xs uppercase tracking-widest">
                Assigned worker
              </p>
              <p className="mt-1 text-base text-surface-text">
                {assignedWorker?.name ?? assignedWorker?.email ?? 'Unassigned'}
              </p>
            </div>
          </GlassCard>

          {room ? (
            <Link
              to="/dashboard/messages/$chatRoomId"
              params={{ chatRoomId: room._id }}
              className="rounded-2xl border border-brand-400 bg-surface-1 px-5 py-3 text-center font-semibold text-base text-brand-300 hover:bg-surface-2"
            >
              Open chat
            </Link>
          ) : null}

          <button
            type="button"
            disabled={summarizing}
            onClick={onSummarize}
            className="flex items-center justify-center gap-2 rounded-2xl border border-brand-400 bg-surface-1 px-5 py-3 font-semibold text-base text-brand-300 hover:bg-surface-2 disabled:opacity-60"
          >
            <Sparkles size={16} />
            {summarizing ? 'Summarizing…' : 'Summarize this request'}
          </button>
        </div>

        <div className="grid gap-6">
          <section>
            <p className="text-surface-text-muted text-xs uppercase tracking-widest">
              Assign worker
            </p>
            {workers === undefined ? (
              <p className="mt-3 text-surface-text-muted">Loading workers…</p>
            ) : workers.length === 0 ? (
              <p className="mt-3 text-surface-text-muted">
                No workers in the roster yet.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {workers.map((w) => {
                  const isAssigned = assignedWorker?._id === w._id
                  const k = `assign-${w._id}`
                  return (
                    <li key={w._id}>
                      <button
                        type="button"
                        disabled={busy !== null || isAssigned}
                        onClick={onAssign(w)}
                        className={cn(
                          'block w-full rounded-2xl border px-4 py-3 text-left',
                          isAssigned
                            ? 'border-brand-500 bg-brand-500/10'
                            : 'border-surface-3 bg-surface-1 hover:bg-surface-2',
                        )}
                      >
                        <p className="text-base text-surface-text">
                          {w.name ?? w.email}
                        </p>
                        <p className="text-sm text-surface-text-muted">
                          {busy === k
                            ? 'Assigning…'
                            : isAssigned
                              ? 'Currently assigned'
                              : w.email}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section>
            <p className="text-surface-text-muted text-xs uppercase tracking-widest">
              Force status
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => {
                const k = `status-${s}`
                const selected = request.status === s
                return (
                  <button
                    type="button"
                    key={s}
                    disabled={busy !== null || selected}
                    onClick={onSetStatus(s)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs',
                      selected
                        ? 'bg-brand-500 font-semibold text-white'
                        : 'border border-surface-3 bg-surface-1 text-surface-text-muted hover:bg-surface-2',
                    )}
                  >
                    {busy === k ? '…' : s}
                  </button>
                )
              })}
            </div>
          </section>

          {error ? (
            <p className="rounded-xl bg-status-progress/20 px-4 py-2 text-sm text-status-progress">
              {error}
            </p>
          ) : null}

          {request.status !== 'COMPLETED' && request.status !== 'CANCELLED' ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={onCancel}
              className="rounded-2xl border border-surface-3 px-5 py-3 font-semibold text-base text-status-cancelled hover:bg-surface-1 disabled:opacity-60"
            >
              Cancel request
            </button>
          ) : null}
        </div>
      </div>

      <SummaryPanel streamId={streamId} onClose={() => setStreamId(null)} />
    </div>
  )
}
