import type { ServiceRequestStatus } from '@service-ops/shared'
import { cn } from '@/lib/cn'

const STYLE: Record<ServiceRequestStatus, { bg: string; fg: string }> = {
  OPEN: { bg: 'bg-status-open/20', fg: 'text-status-open' },
  ASSIGNED: { bg: 'bg-status-assigned/20', fg: 'text-status-assigned' },
  IN_PROGRESS: { bg: 'bg-status-progress/20', fg: 'text-status-progress' },
  COMPLETED: { bg: 'bg-status-completed/20', fg: 'text-status-completed' },
  CANCELLED: { bg: 'bg-status-cancelled/20', fg: 'text-status-cancelled' },
}

const LABEL: Record<ServiceRequestStatus, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export function StatusBadge({ status }: { status: ServiceRequestStatus }) {
  const tone = STYLE[status]
  return (
    <span
      className={cn(
        'inline-block self-start rounded-full px-3 py-1 font-semibold text-xs uppercase tracking-widest',
        tone.bg,
        tone.fg,
      )}
    >
      {LABEL[status]}
    </span>
  )
}
