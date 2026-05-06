import { z } from 'zod'

export const SendChatMessageSchema = z.object({
  chatRoomId: z.string().min(1),
  text: z.string().trim().min(1, 'Message cannot be empty').max(4000),
})
export type SendChatMessageInput = z.infer<typeof SendChatMessageSchema>
