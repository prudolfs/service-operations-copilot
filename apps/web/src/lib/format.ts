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

export const formatRelativeTime = (ts: number): string => {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export const formatStamp = (ts: number): string => {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}
