import { zodResolver } from '@hookform/resolvers/zod'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type FieldValues,
  FormProvider,
  useForm,
  useWatch,
} from 'react-hook-form'
import type { z } from 'zod'
import type { StepDefinition } from './types'

type WizardContextValue<TData extends FieldValues = FieldValues> = {
  currentStep: number
  totalSteps: number
  stepDef: StepDefinition<TData>
  steps: StepDefinition<TData>[]
  isFirstStep: boolean
  isLastStep: boolean
  isReviewStep: boolean
  next: () => Promise<void>
  back: () => void
  goToStep: (index: number) => void
  getValues: () => TData
  resetForm: (data: TData) => void
  submit: () => Promise<void>
  isSubmitting: boolean
  canProceed: boolean
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function useWizard<
  TData extends FieldValues = FieldValues,
>(): WizardContextValue<TData> {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used within WizardProvider')
  return ctx as WizardContextValue<TData>
}

type WizardProviderProps<TData extends FieldValues> = {
  steps: StepDefinition<TData>[]
  defaultValues: TData
  schema: z.ZodType
  onComplete: (data: TData) => void | Promise<void>
  initialDraft?: TData | null
  children: React.ReactNode
}

function findFirstMissingStep<TData extends FieldValues>(
  draft: TData,
  steps: StepDefinition<TData>[],
): number {
  const reviewIndex = steps.findIndex((s) => s.id === 'review')
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (step.id === 'review' || step.fields.length === 0) continue
    const data: Record<string, unknown> = {}
    for (const field of step.fields) {
      data[field as string] = draft[field as string]
    }
    if (!step.schema.safeParse(data).success) return i
  }
  return reviewIndex >= 0 ? reviewIndex : steps.length - 1
}

export function WizardProvider<TData extends FieldValues>({
  steps,
  defaultValues,
  schema,
  onComplete,
  initialDraft,
  children,
}: WizardProviderProps<TData>) {
  const [currentStep, setCurrentStep] = useState(() =>
    initialDraft ? findFirstMissingStep(initialDraft, steps) : 0,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TData>({
    // biome-ignore lint/suspicious/noExplicitAny: generic boundary between zod and react-hook-form
    resolver: zodResolver(schema as any) as any,
    // biome-ignore lint/suspicious/noExplicitAny: generic boundary between zod and react-hook-form
    defaultValues: (initialDraft ?? defaultValues) as any,
    mode: 'onTouched',
  })

  // Re-seed the form if the parent supplies a new draft after mount (e.g. the
  // user was already on the wizard screen and voiced another draft, so
  // useLocalSearchParams refreshed). The first render already consumed the
  // initial draft, so skip it.
  const lastAppliedDraft = useRef(initialDraft ?? null)
  useEffect(() => {
    if (!initialDraft) return
    if (initialDraft === lastAppliedDraft.current) return
    lastAppliedDraft.current = initialDraft
    // biome-ignore lint/suspicious/noExplicitAny: generic boundary between zod and react-hook-form
    form.reset(initialDraft as any)
    setCurrentStep(findFirstMissingStep(initialDraft, steps))
  }, [initialDraft, form, steps])

  const [canProceed, setCanProceed] = useState(false)

  const stepDef = steps[currentStep]
  const totalSteps = steps.length
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1
  const isReviewStep = stepDef.id === 'review'

  const stepFields = stepDef.fields as string[]
  const watchedValues = useWatch({
    control: form.control,
    // biome-ignore lint/suspicious/noExplicitAny: generic field names
    name: stepFields as any,
  })

  useEffect(() => {
    if (stepFields.length === 0 || isReviewStep) {
      setCanProceed(true)
      return
    }
    const values: unknown[] = Array.isArray(watchedValues)
      ? watchedValues
      : [watchedValues]
    const data: Record<string, unknown> = {}
    for (let i = 0; i < stepFields.length; i++) {
      data[stepFields[i]] = values[i]
    }
    const result = stepDef.schema.safeParse(data)
    setCanProceed(result.success)
  }, [watchedValues, stepFields, isReviewStep, stepDef.schema])

  const next = useCallback(async () => {
    const fields = stepDef.fields as string[]
    // biome-ignore lint/suspicious/noExplicitAny: generic field names
    const valid = await form.trigger(fields as any)
    if (valid) {
      setCurrentStep((s) => Math.min(s + 1, totalSteps - 1))
    }
  }, [form, stepDef, totalSteps])

  const back = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }, [])

  const goToStep = useCallback((index: number) => {
    setCurrentStep(index)
  }, [])

  const getValues = useCallback(() => form.getValues(), [form])

  const resetForm = useCallback(
    (data: TData) => {
      // biome-ignore lint/suspicious/noExplicitAny: generic boundary between zod and react-hook-form
      form.reset(data as any)
    },
    [form],
  )

  const submit = useCallback(async () => {
    const valid = await form.trigger()
    if (!valid) return
    setIsSubmitting(true)
    try {
      await onComplete(form.getValues())
    } finally {
      setIsSubmitting(false)
    }
  }, [form, onComplete])

  const value = useMemo(
    () => ({
      currentStep,
      totalSteps,
      stepDef,
      steps,
      isFirstStep,
      isLastStep,
      isReviewStep,
      next,
      back,
      goToStep,
      getValues,
      resetForm,
      submit,
      isSubmitting,
      canProceed,
    }),
    [
      currentStep,
      totalSteps,
      stepDef,
      steps,
      isFirstStep,
      isLastStep,
      isReviewStep,
      next,
      back,
      goToStep,
      getValues,
      resetForm,
      submit,
      isSubmitting,
      canProceed,
    ],
  )

  return (
    <WizardContext.Provider value={value as WizardContextValue}>
      <FormProvider {...form}>{children}</FormProvider>
    </WizardContext.Provider>
  )
}
