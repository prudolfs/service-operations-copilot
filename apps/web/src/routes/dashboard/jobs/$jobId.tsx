import { api } from '@service-ops/convex/api'
import type { Id } from '@service-ops/convex/dataModel'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { GlassCard } from '@/components/glass'
import { RequestStatusTimeline } from '@/components/RequestStatusTimeline'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatServiceType } from '@/lib/format'
import { useIsOnline } from '@/lib/use-is-online'

export const Route = createFileRoute('/dashboard/jobs/$jobId')({
  component: WorkerJobDetail,
})

type Action = 'accept' | 'start' | 'complete' | null

function WorkerJobDetail() {
  const { jobId } = Route.useParams()
  const id = jobId as Id<'serviceRequests'>
  const navigate = useNavigate()
  const data = useQuery(api.serviceRequests.getById, { requestId: id })
  const room = useQuery(api.chat.getRoomForRequest, { serviceRequestId: id })
  const accept = useMutation(api.serviceRequests.accept)
  const start = useMutation(api.serviceRequests.start)
  const complete = useMutation(api.serviceRequests.complete)
  const [busy, setBusy] = useState<Action>(null)
  const [error, setError] = useState<string | null>(null)
  const isOnline = useIsOnline()

  if (data === undefined) {
    return <p className="px-6 py-10 text-surface-text-muted">Loading…</p>
  }
  if (data === null) {
    return <p className="px-6 py-10 text-surface-text-muted">Job not found.</p>
  }

  const { request, client, assignedWorker } = data

  const run = (action: Action, fn: () => Promise<unknown>) => async () => {
    setError(null)
    setBusy(action)
    try {
      await fn()
      if (action === 'complete') await navigate({ to: '/dashboard/jobs' })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="px-6 py-10 lg:px-12">
      <header>
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          Worker · Job
        </p>
        <h1 className="mt-2 font-black text-4xl text-surface-text">
          {formatServiceType(request.serviceType)}
        </h1>
      </header>

      <GlassCard className="mt-8 max-w-2xl">
        <StatusBadge status={request.status} />
        <RequestStatusTimeline className="mt-5" status={request.status} />
        <p className="mt-6 text-base text-surface-text">
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
          {assignedWorker ? (
            <>
              <p className="mt-3 text-surface-text-muted text-xs uppercase tracking-widest">
                Assigned worker
              </p>
              <p className="mt-1 text-base text-surface-text">
                {assignedWorker.name ?? assignedWorker.email}
              </p>
            </>
          ) : null}
        </div>
      </GlassCard>

      {room ? (
        <Link
          to="/dashboard/messages/$chatRoomId"
          params={{ chatRoomId: room._id }}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-brand-400 bg-surface-1 px-5 py-3 font-semibold text-base text-brand-300 hover:bg-surface-2"
        >
          <MessageSquare size={18} />
          Open chat
        </Link>
      ) : null}

      {error ? (
        <p className="mt-4 max-w-2xl rounded-xl bg-status-progress/20 px-4 py-2 text-sm text-status-progress">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid max-w-2xl gap-3">
        {request.status === 'OPEN' ? (
          <button
            type="button"
            disabled={busy !== null || !isOnline}
            onClick={run('accept', () => accept({ requestId: id }))}
            className="min-h-12 rounded-2xl bg-brand-500 px-5 py-3.5 font-semibold text-base text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {busy === 'accept' ? 'Accepting…' : 'Accept job'}
          </button>
        ) : null}
        {request.status === 'ASSIGNED' ? (
          <button
            type="button"
            disabled={busy !== null || !isOnline}
            onClick={run('start', () => start({ requestId: id }))}
            className="min-h-12 rounded-2xl bg-brand-500 px-5 py-3.5 font-semibold text-base text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {busy === 'start' ? 'Starting…' : 'Start job'}
          </button>
        ) : null}
        {request.status === 'IN_PROGRESS' ? (
          <button
            type="button"
            disabled={busy !== null || !isOnline}
            onClick={run('complete', () => complete({ requestId: id }))}
            className="min-h-12 rounded-2xl bg-status-completed px-5 py-3.5 font-semibold text-base text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy === 'complete' ? 'Completing…' : 'Mark complete'}
          </button>
        ) : null}
        {!isOnline &&
        (request.status === 'OPEN' ||
          request.status === 'ASSIGNED' ||
          request.status === 'IN_PROGRESS') ? (
          <p className="text-sm text-surface-text-muted">
            You're offline — reconnect to update this job.
          </p>
        ) : null}
      </div>
    </div>
  )
}
