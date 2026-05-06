import { z } from 'zod'

export const ServiceRequestStatusSchema = z.enum([
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
])
export type ServiceRequestStatus = z.infer<typeof ServiceRequestStatusSchema>

export const ServiceTypeSchema = z.enum([
  'cleaning',
  'maintenance',
  'delivery',
  'repair',
  'other',
])
export type ServiceType = z.infer<typeof ServiceTypeSchema>

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const CreateServiceRequestSchema = z.object({
  serviceType: ServiceTypeSchema,
  date: z.string().regex(isoDateRegex, 'Use YYYY-MM-DD'),
  time: z.string().regex(timeRegex, 'Use HH:mm (24h)'),
  notes: z.string().trim().max(2000).optional().default(''),
})
export type CreateServiceRequestInput = z.infer<
  typeof CreateServiceRequestSchema
>

export const UpdateServiceRequestSchema = CreateServiceRequestSchema.partial()
export type UpdateServiceRequestInput = z.infer<
  typeof UpdateServiceRequestSchema
>
