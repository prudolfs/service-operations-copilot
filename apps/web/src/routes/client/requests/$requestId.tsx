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

export const Route = createFileRoute('/client/requests/$requestId')({
  component: ClientRequestDetail,
})

function ClientRequestDetail() {
  const { requestId } = Route.useParams()
  const id = requestId as Id<'serviceRequests'>
  const navigate = useNavigate()
  const data = useQuery(api.serviceRequests.getById, { requestId: id })
  const room = useQuery(api.chat.getRoomForRequest, { serviceRequestId: id })
  const cancel = useMutation(api.serviceRequests.cancel)
  const [busy, setBusy] = useState(false)

  if (data === undefined) {
    return <p className="px-6 py-10 text-surface-text-muted">Loading…</p>
  }
  if (data === null) {
    return (
      <p className="px-6 py-10 text-surface-text-muted">Request not found.</p>
    )
  }

  const { request, assignedWorker } = data
  const canCancel =
    request.status !== 'COMPLETED' && request.status !== 'CANCELLED'

  const onCancel = async () => {
    if (!confirm('Cancel this request? This action cannot be undone.')) return
    setBusy(true)
    try {
      await cancel({ requestId: id })
      await navigate({ to: '/client/requests' })
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-6 py-10 lg:px-12">
      <header>
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          Client · Request
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
            Assigned worker
          </p>
          <p className="mt-1 text-base text-surface-text">
            {assignedWorker?.name ??
              assignedWorker?.email ??
              'Awaiting acceptance'}
          </p>
        </div>
      </GlassCard>

      {room ? (
        <Link
          to="/client/messages/$chatRoomId"
          params={{ chatRoomId: room._id }}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-brand-400 bg-surface-1 px-5 py-3 font-semibold text-base text-brand-300 hover:bg-surface-2"
        >
          <MessageSquare size={18} />
          Open chat with worker
        </Link>
      ) : null}

      {canCancel ? (
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="mt-6 block min-h-11 rounded-2xl border border-surface-3 px-5 py-3 font-semibold text-base text-status-cancelled hover:bg-surface-1 disabled:opacity-60"
        >
          {busy ? 'Cancelling…' : 'Cancel request'}
        </button>
      ) : null}
    </div>
  )
}
