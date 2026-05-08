import type { CreateServiceRequestInput } from '@service-ops/shared'
import { useWatch } from 'react-hook-form'
import { ReviewField, useWizard } from '@/components/wizard'
import { formatDateTime, formatServiceType } from '@/lib/format'

export default function ReviewStep() {
  const data = useWatch<CreateServiceRequestInput>()
  const { goToStep } = useWizard()

  const when =
    data.date && data.time ? formatDateTime(data.date, data.time) : '—'

  return (
    <div className="grid gap-3">
      <ReviewField
        label="Service"
        value={data.serviceType ? formatServiceType(data.serviceType) : '—'}
        onEdit={() => goToStep(0)}
      />
      <ReviewField label="When" value={when} onEdit={() => goToStep(1)} />
      <ReviewField
        label="Notes"
        value={data.notes?.trim() || 'None'}
        onEdit={() => goToStep(2)}
      />
    </div>
  )
}
