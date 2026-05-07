import { Bell, BellOff, X } from 'lucide-react'
import { useState } from 'react'
import {
  type PushStatus,
  usePushSubscription,
} from '@/lib/use-push-subscription'

type Copy = {
  title: string
  body: string
  cta?: string
  ctaIcon?: 'bell' | 'off'
}

const copyFor = (
  status: PushStatus,
  isIOSPwaUnsupported: boolean,
): Copy | null => {
  if (status === 'granted') return null
  if (status === 'unsupported') {
    if (isIOSPwaUnsupported) {
      return {
        title: 'Notifications need the installed app',
        body: 'On iPhone, notifications require iOS 16.4+ and adding Service Ops to your home screen first.',
      }
    }
    return {
      title: 'Notifications unavailable',
      body: "This browser doesn't support push notifications.",
    }
  }
  if (status === 'denied') {
    return {
      title: 'Notifications are blocked',
      body: 'Enable notifications for this site in your browser settings to keep up with new jobs and updates.',
      ctaIcon: 'off',
    }
  }
  if (status === 'dismissed') {
    return {
      title: 'Get notified',
      body: 'Turn notifications back on to hear about updates the moment they happen.',
      cta: 'Turn on',
      ctaIcon: 'bell',
    }
  }
  return {
    title: 'Stay in the loop',
    body: 'Enable notifications to hear about updates the moment they happen.',
    cta: 'Enable',
    ctaIcon: 'bell',
  }
}

export function PushPermissionBanner({
  variant = 'inline',
}: {
  variant?: 'inline' | 'card'
}) {
  const { status, isIOSPwaUnsupported, request } = usePushSubscription()
  const [dismissed, setDismissed] = useState(false)

  const copy = copyFor(status, isIOSPwaUnsupported)
  if (!copy) return null
  if (dismissed) return null

  const onEnable = async () => {
    await request()
  }

  const Icon = copy.ctaIcon === 'off' ? BellOff : Bell

  if (variant === 'card') {
    return (
      <div className="rounded-2xl border border-surface-3 bg-surface-1 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
            <Icon size={18} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-sm text-surface-text">
              {copy.title}
            </p>
            <p className="mt-1 text-sm text-surface-text-muted">{copy.body}</p>
            {copy.cta ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onEnable}
                  className="rounded-xl bg-brand-500 px-3 py-1.5 font-semibold text-sm text-white hover:bg-brand-600"
                >
                  {copy.cta}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="rounded-xl border border-surface-3 px-3 py-1.5 font-semibold text-sm text-surface-text hover:bg-surface-2"
                >
                  Not now
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-surface-3 border-b bg-surface-1/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-sm text-surface-text">
            {copy.title}
          </p>
          <p className="truncate text-surface-text-muted text-xs">
            {copy.body}
          </p>
        </div>
        {copy.cta ? (
          <button
            type="button"
            onClick={onEnable}
            className="rounded-xl bg-brand-500 px-3 py-1.5 font-semibold text-sm text-white hover:bg-brand-600"
          >
            {copy.cta}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="rounded-full p-1.5 text-surface-text-muted hover:bg-surface-2"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
