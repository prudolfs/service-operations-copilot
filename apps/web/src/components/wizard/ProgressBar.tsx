import { useWizard } from './WizardProvider'

export function ProgressBar() {
  const { currentStep, totalSteps } = useWizard()

  return (
    <div
      className="flex items-center justify-center gap-2"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={currentStep + 1}
    >
      {Array.from({ length: totalSteps }).map((_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: static length array
          key={`step-${i}`}
          className={`h-2 w-2 rounded-full ${
            i <= currentStep ? 'bg-brand-400' : 'bg-surface-3'
          }`}
        />
      ))}
    </div>
  )
}
