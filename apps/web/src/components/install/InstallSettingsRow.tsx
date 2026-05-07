import { Check, Download } from 'lucide-react'
import { useState } from 'react'
import { usePwaInstall } from '@/lib/use-pwa-install'
import { IosInstallInstructions } from './IosInstallInstructions'

export function InstallSettingsRow() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwaInstall()
  const [iosOpen, setIosOpen] = useState(false)

  if (isInstalled) {
    return (
      <div className="mt-6 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-status-completed/10 text-status-completed">
          <Check size={18} />
        </span>
        <div>
          <p className="font-semibold text-sm text-surface-text">
            App installed
          </p>
          <p className="text-surface-text-muted text-xs">
            Service Ops is on your home screen.
          </p>
        </div>
      </div>
    )
  }

  if (!isIOS && !canInstall) return null

  const onInstall = async () => {
    if (isIOS) {
      setIosOpen(true)
      return
    }
    await promptInstall()
  }

  return (
    <>
      <button
        type="button"
        onClick={onInstall}
        className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-surface-3 px-4 py-3 text-left hover:bg-surface-2"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
          <Download size={18} />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-sm text-surface-text">Install app</p>
          <p className="text-surface-text-muted text-xs">
            {isIOS
              ? 'Add Service Ops to your iPhone home screen.'
              : 'One-tap access from your home screen.'}
          </p>
        </div>
      </button>

      <IosInstallInstructions
        open={iosOpen}
        onClose={() => setIosOpen(false)}
      />
    </>
  )
}
