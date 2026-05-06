import { v } from 'convex/values'
import { action } from '../_generated/server'

const GROQ_TRANSCRIBE_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions'

const transcribeBlob = async (blob: Blob): Promise<string> => {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured')

  const formData = new FormData()
  formData.append('file', blob, 'recording.m4a')
  formData.append('model', 'whisper-large-v3')

  const res = await fetch(GROQ_TRANSCRIBE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Groq transcription failed (${res.status}): ${text}`)
  }
  const json = (await res.json()) as { text?: string }
  return (json.text ?? '').trim()
}

export const transcribeAudioBlob = transcribeBlob

export const transcribeFromStorage = action({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }): Promise<string> => {
    const blob = await ctx.storage.get(storageId)
    if (!blob) throw new Error('Audio file not found in storage')
    return transcribeBlob(blob)
  },
})

export const generateUploadUrl = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    return ctx.storage.generateUploadUrl()
  },
})
