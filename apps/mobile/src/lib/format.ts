import type { ServiceType } from '@service-ops/shared'

const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
  delivery: 'Delivery',
  repair: 'Repair',
  other: 'Other',
}

export const formatServiceType = (type: string): string =>
  SERVICE_TYPE_LABEL[type as ServiceType] ?? type

export const formatDateTime = (date: string, time: string): string =>
  `${date} · ${time}`

export const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'repair', label: 'Repair' },
  { value: 'other', label: 'Other' },
]
