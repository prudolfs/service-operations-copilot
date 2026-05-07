import { api } from '@service-ops/convex/api'
import {
  type CreateServiceRequestInput,
  CreateServiceRequestSchema,
  NotesStepSchema,
  ScheduleStepSchema,
  type ServiceType,
  ServiceTypeStepSchema,
} from '@service-ops/shared'
import { useMutation } from 'convex/react'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { Alert } from 'react-native'
import { useVoiceContext } from '@/components/voice'
import {
  type StepDefinition,
  useWizard,
  WizardProvider,
  WizardShell,
} from '@/components/wizard'
import NotesStep from './steps/NotesStep'
import ReviewStep from './steps/ReviewStep'
import ScheduleStep from './steps/ScheduleStep'
import ServiceTypeStep from './steps/ServiceTypeStep'

const isServiceType = (value: string | undefined): value is ServiceType =>
  value === 'cleaning' ||
  value === 'maintenance' ||
  value === 'delivery' ||
  value === 'repair' ||
  value === 'other'

const steps: StepDefinition<CreateServiceRequestInput>[] = [
  {
    id: 'serviceType',
    title: 'What do you need?',
    fields: ['serviceType'],
    schema: ServiceTypeStepSchema,
    component: ServiceTypeStep,
  },
  {
    id: 'schedule',
    title: 'When do you need it?',
    fields: ['date', 'time'],
    schema: ScheduleStepSchema,
    component: ScheduleStep,
  },
  {
    id: 'notes',
    title: 'Anything else?',
    fields: ['notes'],
    schema: NotesStepSchema,
    component: NotesStep,
  },
  {
    id: 'review',
    title: 'Review your request',
    fields: [],
    schema: NotesStepSchema,
    component: ReviewStep,
  },
]

export default function NewClientRequest() {
  const createRequest = useMutation(api.serviceRequests.create)
  const params = useLocalSearchParams<{
    serviceType?: string
    date?: string
    time?: string
    notes?: string
  }>()

  const initialDraft = useMemo<CreateServiceRequestInput | null>(() => {
    const hasAnyParam =
      params.serviceType || params.date || params.time || params.notes
    if (!hasAnyParam) return null
    return {
      serviceType: isServiceType(params.serviceType)
        ? params.serviceType
        : 'cleaning',
      date: params.date ?? '',
      time: params.time ?? '',
      notes: params.notes ?? '',
    }
  }, [params.serviceType, params.date, params.time, params.notes])

  const defaultValues: CreateServiceRequestInput = {
    serviceType: 'cleaning',
    date: '',
    time: '',
    notes: '',
  }

  const handleComplete = async (values: CreateServiceRequestInput) => {
    try {
      const id = await createRequest({
        serviceType: values.serviceType,
        date: values.date,
        time: values.time,
        notes: values.notes?.trim() || undefined,
      })
      router.replace(`/(client)/requests/${id}`)
    } catch (err) {
      Alert.alert('Could not create request', (err as Error).message)
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'New request' }} />
      <WizardProvider
        steps={steps}
        defaultValues={defaultValues}
        schema={CreateServiceRequestSchema}
        onComplete={handleComplete}
        initialDraft={initialDraft}
      >
        <NewRequestVoiceSync />
        <WizardShell
          eyebrow="Client · New request"
          submitLabel="Submit request"
        />
      </WizardProvider>
    </>
  )
}

/**
 * Pushes the wizard's current values into VoiceContext so the AI prompt's
 * `draftFormState` block reflects what the user has filled. Updates on step
 * boundaries (committed values), not on every keystroke, so the global
 * MicButton's React state doesn't churn.
 */
function NewRequestVoiceSync() {
  const { setContext } = useVoiceContext()
  const { currentStep, stepDef, getValues } =
    useWizard<CreateServiceRequestInput>()

  useEffect(() => {
    setContext({
      screen: 'new-request',
      draftFormState: {
        ...getValues(),
        _step: stepDef.id,
        _stepIndex: currentStep,
      },
    })
    return () => setContext({})
  }, [setContext, currentStep, stepDef, getValues])

  return null
}
