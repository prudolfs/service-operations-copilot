import { z } from 'zod'
import { ServiceTypeSchema } from './serviceRequest'

export const VoiceIntentKindSchema = z.enum([
  'create_service_request',
  'draft_message',
  'summarize_request',
  'unknown',
])
export type VoiceIntentKind = z.infer<typeof VoiceIntentKindSchema>

export const CreateServiceRequestIntentSchema = z.object({
  intent: z.literal('create_service_request'),
  serviceType: ServiceTypeSchema.optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  notes: z.string().optional(),
})

export const DraftMessageIntentSchema = z.object({
  intent: z.literal('draft_message'),
  draftText: z.string(),
  targetChatRoomId: z.string().optional(),
  ambiguous: z.boolean().default(false),
  candidateChatRoomIds: z.array(z.string()).default([]),
})

export const SummarizeRequestIntentSchema = z.object({
  intent: z.literal('summarize_request'),
  targetRequestId: z.string().optional(),
  ambiguous: z.boolean().default(false),
  candidateRequestIds: z.array(z.string()).default([]),
})

export const UnknownIntentSchema = z.object({
  intent: z.literal('unknown'),
  message: z.string(),
})

export const VoiceIntentSchema = z.discriminatedUnion('intent', [
  CreateServiceRequestIntentSchema,
  DraftMessageIntentSchema,
  SummarizeRequestIntentSchema,
  UnknownIntentSchema,
])
export type VoiceIntent = z.infer<typeof VoiceIntentSchema>

export const VoiceClientContextSchema = z.object({
  screen: z.string(),
  role: z.enum(['client', 'worker', 'manager']),
  currentChatRoomId: z.string().optional(),
  currentRequestId: z.string().optional(),
  draftFormState: z.record(z.string(), z.unknown()).optional(),
})
export type VoiceClientContext = z.infer<typeof VoiceClientContextSchema>

export const ReplyToneSchema = z.enum([
  'friendly',
  'professional',
  'supportive',
  'funny',
])
export type ReplyTone = z.infer<typeof ReplyToneSchema>
