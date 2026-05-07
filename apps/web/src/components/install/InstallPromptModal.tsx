import { Download, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { usePwaInstall } from '@/lib/use-pwa-install'
import { IosInstallInstructions } from './IosInstallInstructions'

type Props = {
  open: boolean
  onClose: () => void
}

export function InstallPromptModal({ open, onClose }: Props) {
  const { canInstall, isIOS, promptInstall, dismiss } = usePwaInstall()
  const [iosOpen, setIosOpen] = useState(false)

  const onLater = useCallback(() => {
    dismiss()
    onClose()
  }, [dismiss, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onLater()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onLater])

  if (!open) return null

  const onPrimary = async () => {
    if (isIOS) {
      setIosOpen(true)
      return
    }
    if (canInstall) {
      const outcome = await promptInstall()
      if (outcome === 'dismissed') dismiss()
      onClose()
      return
    }
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onLater}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <div className="relative w-full max-w-md rounded-t-3xl bg-surface-1 p-6 pb-8 sm:rounded-3xl sm:p-8">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400">
              <Download size={22} />
            </div>
            <button
              type="button"
              onClick={onLater}
              aria-label="Close"
              className="rounded-full p-2 text-surface-text-muted hover:bg-surface-2"
            >
              <X size={18} />
            </button>
          </div>

          <h2
            id="install-title"
            className="mt-5 font-black text-2xl text-surface-text"
          >
            Install Service Ops
          </h2>
          <p className="mt-2 text-surface-text-muted">
            Add the app to your home screen for one-tap access to your requests
            and chat with the team.
          </p>

          <div className="mt-7 grid gap-3">
            <button
              type="button"
              onClick={onPrimary}
              className="rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-base text-white hover:bg-brand-600"
            >
              {isIOS ? 'Show me how' : 'Install'}
            </button>
            <button
              type="button"
              onClick={onLater}
              className="rounded-2xl border border-surface-3 px-5 py-3 font-semibold text-base text-surface-text hover:bg-surface-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>

      <IosInstallInstructions
        open={iosOpen}
        onClose={() => {
          setIosOpen(false)
          onClose()
        }}
      />
    </>
  )
}
