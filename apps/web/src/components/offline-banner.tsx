import { WifiOff } from 'lucide-react'
import { useIsOnline } from '@/lib/use-is-online'

export function OfflineBanner() {
  const isOnline = useIsOnline()
  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-30 border-surface-3 border-b bg-surface-1/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-status-progress/15 text-status-progress">
          <WifiOff size={16} />
        </div>
        <p className="flex-1 text-sm text-surface-text">
          You're offline. Reconnect to continue.
        </p>
      </div>
    </div>
  )
}
