import { View } from 'react-native'
import { useWizard } from './WizardProvider'

export function ProgressBar() {
  const { currentStep, totalSteps } = useWizard()

  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: static length array
          key={`step-${i}`}
          className={`h-2 w-2 rounded-full ${
            i <= currentStep ? 'bg-brand-400' : 'bg-surface-3'
          }`}
        />
      ))}
    </View>
  )
}
