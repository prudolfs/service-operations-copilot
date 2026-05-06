import { createGateway, generateObject } from 'ai'
import { v } from 'convex/values'
import { api } from '../_generated/api'
import { action } from '../_generated/server'
import { ReplySuggestionsSchema } from './intents'

const gateway = createGateway()
const MODEL_ID = 'openai/gpt-4o-mini'

const TONE_INSTRUCTIONS = {
  friendly: 'Tone: warm, casual, friendly.',
  professional: 'Tone: clear, polite, professional.',
  supportive: 'Tone: empathetic, encouraging, supportive.',
  funny: 'Tone: lighthearted, playful, with a touch of humor.',
} as const

type Tone = keyof typeof TONE_INSTRUCTIONS

const buildSystemPrompt = (
  conversation: string,
  composerText: string | undefined,
  tone: Tone | undefined,
): string => {
  const conversationSection =
    conversation.trim().length > 0
      ? `Conversation:\n${conversation}`
      : 'No messages yet. Generate natural opening messages to start the conversation.'

  const composerSection = composerText?.trim()
    ? `\nThe user has already started typing: "${composerText.trim()}". Generate suggestions that continue or rephrase this.`
    : ''

  const toneSection = tone ? `\n${TONE_INSTRUCTIONS[tone]}` : ''

  return `You are helping the current user (labeled [You] in the conversation) write their next chat message.

${conversationSection}
${composerSection}
${toneSection}

Generate exactly 3 suggestions for what [You] would send next.

Rules:
- Write from [You]'s perspective — what they would type and send.
- Each suggestion must be short (1-2 sentences max). This is chat, not email.
- Match the language [You] was using; fall back to the conversation language.
- Do not add greetings or sign-offs unless contextually appropriate.
- Offer meaningfully different options (confirm, ask a question, give an update, propose an action).
- Return plain message text only — no numbering, no labels, no "[You]:" prefix.`
}

export const suggestReplies = action({
  args: {
    chatRoomId: v.id('chatRooms'),
    composerText: v.optional(v.string()),
    tone: v.optional(
      v.union(
        v.literal('friendly'),
        v.literal('professional'),
        v.literal('supportive'),
        v.literal('funny'),
      ),
    ),
  },
  handler: async (
    ctx,
    { chatRoomId, composerText, tone },
  ): Promise<{ suggestions: string[] }> => {
    // Auth + room access enforced by chat.getMessages itself.
    const messages = await ctx.runQuery(api.chat.getMessages, {
      chatRoomId,
      limit: 100,
    })
    const me = await ctx.runQuery(api.users.currentAppUser, {})

    const transcript = (messages ?? [])
      .map((m) => {
        const isYou = me && m.senderId === me._id
        const label = isYou
          ? '[You]'
          : `[${m.sender?.name ?? m.sender?.email ?? 'Other'}]`
        return `${label}: ${m.text}`
      })
      .join('\n')

    const { object } = await generateObject({
      model: gateway(MODEL_ID),
      schema: ReplySuggestionsSchema,
      system: buildSystemPrompt(transcript, composerText, tone),
      prompt: 'Generate 3 reply suggestions.',
    })

    return { suggestions: object.suggestions }
  },
})
