type ReviewFieldProps = {
  label: string
  value: string
  onEdit: () => void
}

export function ReviewField({ label, value, onEdit }: ReviewFieldProps) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="glass-surface w-full rounded-2xl p-4 text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 pr-3">
          <div className="text-surface-text-muted text-xs uppercase tracking-widest">
            {label}
          </div>
          <div className="mt-1 line-clamp-2 font-medium text-base text-surface-text">
            {value || '—'}
          </div>
        </div>
        <span className="font-semibold text-brand-300 text-xs uppercase tracking-widest">
          Edit
        </span>
      </div>
    </button>
  )
}
