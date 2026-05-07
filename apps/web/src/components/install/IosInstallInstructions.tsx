import { Plus, Share, X } from 'lucide-react'
import { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

export function IosInstallInstructions({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md rounded-t-3xl bg-surface-1 p-6 pb-8 sm:rounded-3xl sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
              Install on iPhone
            </p>
            <h2
              id="ios-install-title"
              className="mt-2 font-black text-2xl text-surface-text"
            >
              Add to Home Screen
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-surface-text-muted hover:bg-surface-2"
          >
            <X size={18} />
          </button>
        </div>

        <ol className="mt-6 space-y-4 text-surface-text">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-surface-2 font-semibold text-sm">
              1
            </span>
            <span className="flex flex-1 items-center gap-2 pt-1.5">
              <span>Tap the</span>
              <Share size={18} className="text-brand-400" aria-label="Share" />
              <span>Share button.</span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-surface-2 font-semibold text-sm">
              2
            </span>
            <span className="flex flex-1 items-center gap-2 pt-1.5">
              <span>Scroll and choose</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 font-medium text-sm">
                <Plus size={14} />
                Add to Home Screen
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-surface-2 font-semibold text-sm">
              3
            </span>
            <span className="flex-1 pt-1.5">
              Tap <span className="font-semibold">Add</span>. Service Ops will
              open from your home screen.
            </span>
          </li>
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-base text-white hover:bg-brand-600"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
