import { Download, X } from 'lucide-react'
import { useState } from 'react'
import { usePwaInstall } from '@/lib/use-pwa-install'
import { IosInstallInstructions } from './IosInstallInstructions'

export function InstallBanner() {
  const {
    canInstall,
    isInstalled,
    isIOS,
    isDismissed,
    promptInstall,
    dismiss,
  } = usePwaInstall()
  const [iosOpen, setIosOpen] = useState(false)

  if (isInstalled || isDismissed) return null
  // On non-iOS, don't show until the browser fires beforeinstallprompt.
  if (!isIOS && !canInstall) return null

  const onInstall = async () => {
    if (isIOS) {
      setIosOpen(true)
      return
    }
    const outcome = await promptInstall()
    if (outcome === 'dismissed') dismiss()
  }

  return (
    <>
      <div className="border-surface-3 border-b bg-surface-1/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
            <Download size={16} />
          </div>
          <p className="flex-1 text-sm text-surface-text">
            Install Service Ops for faster access.
          </p>
          <button
            type="button"
            onClick={onInstall}
            className="rounded-xl bg-brand-500 px-3 py-1.5 font-semibold text-sm text-white hover:bg-brand-600"
          >
            Install
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-full p-1.5 text-surface-text-muted hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <IosInstallInstructions
        open={iosOpen}
        onClose={() => setIosOpen(false)}
      />
    </>
  )
}
