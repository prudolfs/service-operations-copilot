import { Check, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ProgressBar } from './ProgressBar'
import { useWizard } from './WizardProvider'

type WizardShellProps = {
  /** Optional eyebrow shown above the step title. */
  eyebrow?: string
  /** Label for the final-step submit button. Defaults to "Submit". */
  submitLabel?: string
  /** Called when the user presses Back on the first step (close the wizard). */
  onExit: () => void
}

export function WizardShell({
  eyebrow,
  submitLabel = 'Submit',
  onExit,
}: WizardShellProps) {
  const {
    stepDef,
    currentStep,
    isFirstStep,
    isReviewStep,
    next,
    back,
    submit,
    isSubmitting,
    canProceed,
  } = useWizard()

  const StepComponent = stepDef.component
  const primaryDisabled = isSubmitting || (!isReviewStep && !canProceed)
  const primaryLabel = isSubmitting
    ? 'Submitting…'
    : isReviewStep
      ? submitLabel
      : 'Next'

  const handlePrimary = () => {
    if (isReviewStep) void submit()
    else void next()
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-0 pt-safe">
      <div className="flex items-center justify-between px-3 pt-3 pb-2 md:hidden">
        <BackButton
          onClick={isFirstStep ? onExit : back}
          label={isFirstStep ? 'Close' : 'Back'}
        />
        <ProgressBar />
        <div className="h-10 w-10" />
      </div>

      <div className="hidden px-6 pt-6 md:flex md:items-center md:gap-3">
        <BackButton
          onClick={isFirstStep ? onExit : back}
          label={isFirstStep ? 'Close' : 'Back'}
        />
        {eyebrow ? (
          <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
            {eyebrow}
          </p>
        ) : null}
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-12 md:flex-row md:gap-10 md:px-12 md:pt-6">
        <SideStepper className="hidden md:block" />

        <div className="flex flex-1 flex-col">
          <div className="pt-6 pb-4 md:pt-2">
            {eyebrow ? (
              <p className="text-brand-300 text-sm uppercase tracking-[0.32em] md:hidden">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-2 font-black text-3xl text-surface-text md:mt-0 md:text-4xl">
              {stepDef.title}
            </h1>
          </div>

          <div className="mt-2">
            <StepComponent />
          </div>

          <button
            type="button"
            disabled={primaryDisabled}
            onClick={handlePrimary}
            className={cn(
              'mt-8 w-full rounded-2xl px-5 py-4 font-semibold text-base transition-colors',
              primaryDisabled
                ? 'bg-surface-2 text-surface-text-muted'
                : 'bg-brand-500 text-white hover:bg-brand-600',
            )}
            aria-label={primaryLabel}
          >
            {primaryLabel}
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Step {currentStep + 1}: {stepDef.title}
      </p>
    </div>
  )
}

function BackButton({
  onClick,
  label,
}: {
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full text-surface-text hover:bg-white/5"
    >
      <ChevronLeft size={26} />
    </button>
  )
}

function SideStepper({ className }: { className?: string }) {
  const { steps, currentStep, goToStep } = useWizard()

  return (
    <aside className={cn('w-56 shrink-0 pt-6', className)}>
      <ol className="flex flex-col gap-1">
        {steps.map((step, index) => {
          const state =
            index < currentStep
              ? 'done'
              : index === currentStep
                ? 'current'
                : 'upcoming'
          const isClickable = state !== 'upcoming'
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => goToStep(index)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                  state === 'current'
                    ? 'bg-white/5 text-surface-text'
                    : state === 'done'
                      ? 'text-surface-text-muted hover:bg-white/[0.03]'
                      : 'cursor-not-allowed text-surface-text-muted/60',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-semibold text-xs',
                    state === 'done' && 'bg-brand-500 text-white',
                    state === 'current' &&
                      'border border-brand-400 bg-brand-500/20 text-brand-100',
                    state === 'upcoming' &&
                      'border border-surface-3 text-surface-text-muted',
                  )}
                >
                  {state === 'done' ? <Check size={14} /> : index + 1}
                </span>
                <span className="text-sm">{step.title}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
