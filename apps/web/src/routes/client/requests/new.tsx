import { api } from '@service-ops/convex/api'
import {
  type CreateServiceRequestInput,
  CreateServiceRequestSchema,
  NotesStepSchema,
  ScheduleStepSchema,
  type ServiceType,
  ServiceTypeStepSchema,
} from '@service-ops/shared'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { InstallPromptModal } from '@/components/install/InstallPromptModal'
import { useVoiceContext } from '@/components/voice/VoiceContext'
import {
  type StepDefinition,
  useWizard,
  WizardProvider,
  WizardShell,
} from '@/components/wizard'
import { useIsOnline } from '@/lib/use-is-online'
import { usePwaInstall } from '@/lib/use-pwa-install'
import NotesStep from './-steps/NotesStep'
import ReviewStep from './-steps/ReviewStep'
import ScheduleStep from './-steps/ScheduleStep'
import ServiceTypeStep from './-steps/ServiceTypeStep'

const StepIdSchema = z.enum(['serviceType', 'schedule', 'notes', 'review'])
type WizardStepId = z.infer<typeof StepIdSchema>

const SearchSchema = z.object({
  serviceType: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  notes: z.string().optional(),
  step: StepIdSchema.optional(),
})

export const Route = createFileRoute('/client/requests/new')({
  component: NewRequestPage,
  validateSearch: (search) => SearchSchema.parse(search),
})

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

const defaultValues: CreateServiceRequestInput = {
  serviceType: 'cleaning',
  date: '',
  time: '',
  notes: '',
}

function NewRequestPage() {
  const navigate = useNavigate()
  const create = useMutation(api.serviceRequests.create)
  const search = Route.useSearch()
  const [error, setError] = useState<string | null>(null)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const install = usePwaInstall()
  const isOnline = useIsOnline()

  const initialDraft = useMemo<CreateServiceRequestInput | null>(() => {
    const hasAnyParam =
      search.serviceType || search.date || search.time || search.notes
    if (!hasAnyParam) return null
    return {
      serviceType: isServiceType(search.serviceType)
        ? search.serviceType
        : 'cleaning',
      date: search.date ?? '',
      time: search.time ?? '',
      notes: search.notes ?? '',
    }
  }, [search.serviceType, search.date, search.time, search.notes])

  const shouldShowInstall = !install.isInstalled && !install.isDismissed

  const goToDetail = async (id: string) => {
    await navigate({
      to: '/client/requests/$requestId',
      params: { requestId: id },
    })
  }

  const exitWizard = () => {
    void navigate({ to: '/client/requests' })
  }

  const handleComplete = async (values: CreateServiceRequestInput) => {
    setError(null)
    if (!isOnline) {
      setError("You're offline — reconnect to submit this request.")
      return
    }
    try {
      const id = await create({
        serviceType: values.serviceType,
        date: values.date,
        time: values.time,
        notes: values.notes?.trim() || undefined,
      })
      if (shouldShowInstall) {
        setPendingRequestId(id)
      } else {
        await goToDetail(id)
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const onInstallClose = () => {
    const id = pendingRequestId
    setPendingRequestId(null)
    if (id) void goToDetail(id)
  }

  return (
    <WizardProvider
      steps={steps}
      defaultValues={defaultValues}
      schema={CreateServiceRequestSchema}
      onComplete={handleComplete}
      initialDraft={initialDraft}
      initialStepId={search.step}
    >
      <NewRequestVoiceSync />
      <WizardStepUrlSync />
      <WizardShell
        eyebrow="Client · New request"
        submitLabel="Submit request"
        onExit={exitWizard}
      />
      {error ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-status-progress/20 px-4 py-2 text-sm text-status-progress">
          {error}
        </div>
      ) : null}
      <InstallPromptModal
        open={pendingRequestId !== null}
        onClose={onInstallClose}
      />
    </WizardProvider>
  )
}

function WizardStepUrlSync() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { stepDef, steps: wizardSteps, goToStep } = useWizard()
  const lastWrittenStep = useRef<string | null>(null)

  // URL → wizard. Triggered by browser back/forward or deep-link.
  useEffect(() => {
    const targetId = search.step
    if (!targetId) return
    if (targetId === stepDef.id) return
    const idx = wizardSteps.findIndex((s) => s.id === targetId)
    if (idx < 0) return
    goToStep(idx)
  }, [search.step, stepDef.id, wizardSteps, goToStep])

  // Wizard → URL. Only writes when stepDef.id actually changes; never when
  // search.step changes on its own (avoids fighting URL → wizard).
  // biome-ignore lint/correctness/useExhaustiveDependencies: search.step is read for parity-check only; including it would cause this effect to re-run on URL echoes and double-write
  useEffect(() => {
    if (lastWrittenStep.current === stepDef.id) return
    lastWrittenStep.current = stepDef.id
    if (search.step === stepDef.id) return
    void navigate({
      to: '/client/requests/new',
      search: (prev) => ({
        ...prev,
        step: stepDef.id as WizardStepId,
      }),
      replace: !search.step,
    })
  }, [stepDef.id, navigate])

  return null
}

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
