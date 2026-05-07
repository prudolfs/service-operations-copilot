import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '@service-ops/convex/api'
import {
  type CreateServiceRequestInput,
  CreateServiceRequestSchema,
} from '@service-ops/shared'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { GlassCard, GlassInput } from '@/components/glass'
import { InstallPromptModal } from '@/components/install/InstallPromptModal'
import { useVoiceContext } from '@/components/voice/VoiceContext'
import { SERVICE_TYPE_OPTIONS } from '@/lib/format'
import { usePwaInstall } from '@/lib/use-pwa-install'

const SearchSchema = z.object({
  serviceType: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  notes: z.string().optional(),
})

export const Route = createFileRoute('/client/requests/new')({
  component: NewRequestPage,
  validateSearch: (search) => SearchSchema.parse(search),
})

function NewRequestPage() {
  const navigate = useNavigate()
  const create = useMutation(api.serviceRequests.create)
  const search = Route.useSearch()
  const [error, setError] = useState<string | null>(null)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const { setContext } = useVoiceContext()
  const install = usePwaInstall()

  const form = useForm<CreateServiceRequestInput>({
    resolver: zodResolver(CreateServiceRequestSchema),
    defaultValues: {
      serviceType:
        (search.serviceType as CreateServiceRequestInput['serviceType']) ??
        'cleaning',
      date: search.date ?? '',
      time: search.time ?? '',
      notes: search.notes ?? '',
    },
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: voice context is set once on mount
  useEffect(() => {
    setContext({
      screen: 'new-request',
      draftFormState: form.getValues(),
    })
    return () => setContext({})
  }, [setContext])

  const shouldShowInstall = !install.isInstalled && !install.isDismissed

  const goToDetail = async (id: string) => {
    await navigate({
      to: '/client/requests/$requestId',
      params: { requestId: id },
    })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
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
  })

  const onInstallClose = () => {
    const id = pendingRequestId
    setPendingRequestId(null)
    if (id) void goToDetail(id)
  }

  return (
    <div className="px-6 py-10 lg:px-12">
      <header>
        <p className="font-semibold text-brand-300 text-xs uppercase tracking-[0.32em]">
          Client · New request
        </p>
        <h1 className="mt-2 font-black text-4xl text-surface-text">
          Tell us what you need
        </h1>
      </header>

      <GlassCard className="mt-8 max-w-2xl">
        <form onSubmit={onSubmit} className="grid gap-4">
          <div>
            <label
              htmlFor="new-request-service-type"
              className="mb-1 block text-surface-text-muted text-xs uppercase tracking-widest"
            >
              Service
            </label>
            <select
              id="new-request-service-type"
              className="glass-input w-full px-4 py-3 text-base text-surface-text outline-none"
              {...form.register('serviceType')}
            >
              {SERVICE_TYPE_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-surface-1 text-surface-text"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-request-date"
                className="mb-1 block text-surface-text-muted text-xs uppercase tracking-widest"
              >
                Date
              </label>
              <GlassInput
                id="new-request-date"
                type="date"
                required
                {...form.register('date', { required: true })}
              />
              {form.formState.errors.date ? (
                <p className="mt-1 text-status-progress text-xs">
                  {form.formState.errors.date.message}
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="new-request-time"
                className="mb-1 block text-surface-text-muted text-xs uppercase tracking-widest"
              >
                Time
              </label>
              <GlassInput
                id="new-request-time"
                type="time"
                required
                {...form.register('time', { required: true })}
              />
              {form.formState.errors.time ? (
                <p className="mt-1 text-status-progress text-xs">
                  {form.formState.errors.time.message}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor="new-request-notes"
              className="mb-1 block text-surface-text-muted text-xs uppercase tracking-widest"
            >
              Notes
            </label>
            <textarea
              id="new-request-notes"
              className="glass-input min-h-[120px] w-full px-4 py-3 text-base text-surface-text outline-none placeholder:text-surface-text-muted"
              placeholder="Anything we should know?"
              {...form.register('notes')}
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-status-progress/20 px-4 py-2 text-sm text-status-progress">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="mt-2 rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-base text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {form.formState.isSubmitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </GlassCard>

      <InstallPromptModal
        open={pendingRequestId !== null}
        onClose={onInstallClose}
      />
    </div>
  )
}
