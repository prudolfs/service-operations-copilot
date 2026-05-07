import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { ProgressBar } from './ProgressBar'
import { useWizard } from './WizardProvider'

type WizardShellProps = {
  /** Optional eyebrow shown above the step title. */
  eyebrow?: string
  /** Label for the final-step submit button. Defaults to "Submit". */
  submitLabel?: string
}

export function WizardShell({
  eyebrow,
  submitLabel = 'Submit',
}: WizardShellProps) {
  const {
    stepDef,
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

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <View className="flex-row items-center justify-between px-3 pt-3 pb-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={isFirstStep ? () => router.back() : back}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <Ionicons name="chevron-back" size={26} color="#e5e9f2" />
        </Pressable>
        <ProgressBar />
        <View className="h-10 w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-6 pb-12"
          keyboardShouldPersistTaps="handled"
        >
          <View className="pt-6 pb-4">
            {eyebrow ? (
              <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
                {eyebrow}
              </Text>
            ) : null}
            <Text className="mt-2 font-black text-3xl text-surface-text">
              {stepDef.title}
            </Text>
          </View>

          <View className="mt-2">
            <StepComponent />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={primaryDisabled}
            onPress={isReviewStep ? submit : next}
            className={`mt-8 rounded-2xl px-5 py-4 will-change-pressable ${
              primaryDisabled
                ? 'bg-surface-2'
                : 'bg-brand-500 active:bg-brand-600'
            }`}
          >
            <Text
              className={`text-center font-semibold text-base ${
                primaryDisabled ? 'text-surface-text-muted' : 'text-white'
              }`}
            >
              {primaryLabel}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
