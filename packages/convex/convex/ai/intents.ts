import { ServiceTypeSchema } from '@service-ops/shared'
import { z } from 'zod'

/**
 * Single merged schema used by the LLM in `askAnything`. The model classifies
 * the user's intent AND fills the relevant extraction fields in one call —
 * fields irrelevant to the chosen intent are returned as empty strings or
 * empty arrays. Mirrors seniory's `mergedIntentSchema` shape adapted for
 * service-ops vocabulary.
 */
export const MergedIntentSchema = z.object({
  intent: z
    .enum([
      'create_service_request',
      'draft_message',
      'summarize_request',
      'unknown',
    ])
    .describe(
      'The user intent. "create_service_request" → wants to schedule a service. "draft_message" → wants to send a chat message. "summarize_request" → wants a summary of a request. "unknown" if unclear.',
    ),
  reasoning: z.string().describe('Brief reasoning for the classification.'),

  // create_service_request fields
  serviceType: ServiceTypeSchema.or(z.literal('')).describe(
    'Only for create_service_request. cleaning, maintenance, delivery, repair, or other. Empty string if not applicable or not mentioned.',
  ),
  date: z
    .string()
    .describe(
      'Only for create_service_request. ISO date YYYY-MM-DD. Empty string if not mentioned. Past dates snap to today.',
    ),
  time: z
    .string()
    .describe(
      'Only for create_service_request. Time HH:MM 24h. "morning"→"09:00", "afternoon"→"14:00", "evening"→"18:00". Empty string if not mentioned.',
    ),
  notes: z
    .string()
    .describe(
      "Only for create_service_request. Additional notes. Preserve user's original language. Empty string if none.",
    ),

  // draft_message fields
  draftText: z
    .string()
    .describe(
      'Only for draft_message. The chat message to send. Short, natural, chat-style. Empty string if not applicable.',
    ),
  targetChatRoomId: z
    .string()
    .describe(
      'Only for draft_message. The chatRoomId to target. Must match one of the provided chat room IDs. Empty string if not applicable.',
    ),
  draftAmbiguous: z
    .boolean()
    .describe(
      'Only for draft_message. True if cannot confidently determine which chat to target.',
    ),
  candidateChatRoomIds: z
    .array(z.string())
    .describe(
      'Only for draft_message when ambiguous. 2-3 most likely chatRoomIds. Empty array otherwise.',
    ),

  // summarize_request fields
  targetRequestId: z
    .string()
    .describe(
      'Only for summarize_request. The serviceRequest id to summarize. Empty string if not applicable.',
    ),
  summarizeAmbiguous: z
    .boolean()
    .describe(
      'Only for summarize_request. True if cannot confidently pick one request.',
    ),
  candidateRequestIds: z
    .array(z.string())
    .describe(
      'Only for summarize_request when ambiguous. 2-3 candidate ids. Empty array otherwise.',
    ),

  // unknown
  message: z
    .string()
    .describe(
      'Only for unknown. Helpful one-liner suggesting what the user can try next. Empty string if not applicable.',
    ),
})

export type MergedIntentResult = z.infer<typeof MergedIntentSchema>

export const ReplySuggestionsSchema = z.object({
  suggestions: z
    .array(z.string())
    .length(3)
    .describe(
      'Exactly 3 reply suggestions. Each is a complete chat message the user could send.',
    ),
})

export const StatusLineSchema = z.object({
  statusLine: z
    .string()
    .describe(
      'One short plain-text sentence summarizing the current state. No markdown.',
    ),
})
