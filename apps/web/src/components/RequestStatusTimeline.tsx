import type { ServiceRequestStatus } from '@service-ops/shared'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

type Step = {
  status: ServiceRequestStatus
  label: string
}

const STEPS: Step[] = [
  { status: 'OPEN', label: 'Open' },
  { status: 'ASSIGNED', label: 'Assigned' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'COMPLETED', label: 'Completed' },
]

const ORDER: Record<ServiceRequestStatus, number> = {
  OPEN: 0,
  ASSIGNED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CANCELLED: -1,
}

export function RequestStatusTimeline({
  status,
  className,
}: {
  status: ServiceRequestStatus
  className?: string
}) {
  if (status === 'CANCELLED') {
    return (
      <div
        className={cn(
          'rounded-2xl border border-status-cancelled/40 bg-status-cancelled/10 px-4 py-3',
          className,
        )}
      >
        <p className="font-semibold text-sm text-status-cancelled">
          Request cancelled
        </p>
        <p className="mt-1 text-surface-text-muted text-xs">
          This request is no longer active.
        </p>
      </div>
    )
  }

  const currentIndex = ORDER[status]

  return (
    <ol
      className={cn('flex items-start gap-2 sm:gap-3', className)}
      aria-label="Request progress"
    >
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex
        const isCurrent = i === currentIndex
        const isLast = i === STEPS.length - 1
        return (
          <li
            key={step.status}
            className="flex flex-1 flex-col items-stretch gap-1.5"
            aria-current={isCurrent ? 'step' : undefined}
          >
            <div className="flex items-center">
              <div
                className={cn(
                  'flex h-7 w-7 flex-none items-center justify-center rounded-full border text-xs',
                  isComplete &&
                    'border-status-completed bg-status-completed/20 text-status-completed',
                  isCurrent && 'border-brand-400 bg-brand-500 text-white',
                  !isComplete &&
                    !isCurrent &&
                    'border-surface-3 bg-surface-1 text-surface-text-muted',
                )}
              >
                {isComplete ? <Check size={14} /> : i + 1}
              </div>
              {!isLast ? (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1 rounded',
                    isComplete ? 'bg-status-completed/60' : 'bg-surface-3',
                  )}
                />
              ) : null}
            </div>
            <p
              className={cn(
                'text-xs leading-tight',
                isCurrent && 'font-semibold text-surface-text',
                isComplete && 'text-surface-text',
                !isComplete && !isCurrent && 'text-surface-text-muted',
              )}
            >
              {step.label}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
