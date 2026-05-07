import { Bell, BellOff } from 'lucide-react'
import { useState } from 'react'
import { usePushSubscription } from '@/lib/use-push-subscription'

export function PushNotificationsRow() {
  const { status, isIOSPwaUnsupported, request, unsubscribe } =
    usePushSubscription()
  const [busy, setBusy] = useState(false)

  const onToggle = async () => {
    setBusy(true)
    try {
      if (status === 'granted') await unsubscribe()
      else await request()
    } finally {
      setBusy(false)
    }
  }

  const subtitle = (() => {
    if (status === 'granted') return 'You will be alerted on this device.'
    if (status === 'denied') {
      return 'Blocked. Enable notifications for this site in your browser settings.'
    }
    if (status === 'unsupported') {
      if (isIOSPwaUnsupported) {
        return 'Notifications on iPhone require iOS 16.4+ and the installed app.'
      }
      return "This browser doesn't support push notifications."
    }
    return 'Hear about updates the moment they happen.'
  })()

  const Icon = status === 'granted' ? Bell : BellOff
  const canToggle = status !== 'denied' && status !== 'unsupported'

  return (
    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-surface-3 px-4 py-3">
      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm text-surface-text">Notifications</p>
        <p className="text-surface-text-muted text-xs">{subtitle}</p>
      </div>
      {canToggle ? (
        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          className="rounded-xl bg-brand-500 px-3 py-1.5 font-semibold text-sm text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy
            ? '…'
            : status === 'granted'
              ? 'Turn off'
              : status === 'dismissed'
                ? 'Turn on'
                : 'Enable'}
        </button>
      ) : null}
    </div>
  )
}
