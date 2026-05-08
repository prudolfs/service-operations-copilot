import type { CreateServiceRequestInput } from '@service-ops/shared'
import { useFormContext } from 'react-hook-form'

export default function NotesStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CreateServiceRequestInput>()

  return (
    <div className="grid gap-2">
      <label
        htmlFor="wizard-notes"
        className="text-surface-text-muted text-xs uppercase tracking-widest"
      >
        Notes (optional)
      </label>
      <textarea
        id="wizard-notes"
        {...register('notes')}
        placeholder="Anything the worker should know"
        className="glass-input min-h-[140px] w-full resize-y px-4 py-3 text-base text-surface-text outline-none placeholder:text-surface-text-muted focus:border-brand-400"
      />
      {errors.notes ? (
        <p className="text-status-progress text-xs">{errors.notes.message}</p>
      ) : null}
    </div>
  )
}
