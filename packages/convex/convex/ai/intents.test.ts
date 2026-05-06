/// <reference types="vite/client" />

import {
  CreateServiceRequestIntentSchema,
  DraftMessageIntentSchema,
  SummarizeRequestIntentSchema,
  UnknownIntentSchema,
  VoiceIntentSchema,
} from '@service-ops/shared'
import { describe, expect, test } from 'vitest'
import {
  MergedIntentSchema,
  ReplySuggestionsSchema,
  StatusLineSchema,
} from './intents'

describe('MergedIntentSchema', () => {
  test('accepts a fully populated create_service_request envelope', () => {
    const parsed = MergedIntentSchema.parse({
      intent: 'create_service_request',
      reasoning: 'User asked to schedule a cleaning.',
      serviceType: 'cleaning',
      date: '2026-05-12',
      time: '14:00',
      notes: 'Pet-friendly products please',
      draftText: '',
      targetChatRoomId: '',
      draftAmbiguous: false,
      candidateChatRoomIds: [],
      targetRequestId: '',
      summarizeAmbiguous: false,
      candidateRequestIds: [],
      message: '',
    })
    expect(parsed.intent).toBe('create_service_request')
    expect(parsed.serviceType).toBe('cleaning')
  })

  test('accepts an ambiguous draft_message envelope', () => {
    const parsed = MergedIntentSchema.parse({
      intent: 'draft_message',
      reasoning: 'Multiple chats could match.',
      serviceType: '',
      date: '',
      time: '',
      notes: '',
      draftText: 'On my way',
      targetChatRoomId: '',
      draftAmbiguous: true,
      candidateChatRoomIds: ['room-1', 'room-2'],
      targetRequestId: '',
      summarizeAmbiguous: false,
      candidateRequestIds: [],
      message: '',
    })
    expect(parsed.draftAmbiguous).toBe(true)
    expect(parsed.candidateChatRoomIds).toHaveLength(2)
  })

  test('accepts an unknown envelope with a hint message', () => {
    const parsed = MergedIntentSchema.parse({
      intent: 'unknown',
      reasoning: 'Speech was unintelligible.',
      serviceType: '',
      date: '',
      time: '',
      notes: '',
      draftText: '',
      targetChatRoomId: '',
      draftAmbiguous: false,
      candidateChatRoomIds: [],
      targetRequestId: '',
      summarizeAmbiguous: false,
      candidateRequestIds: [],
      message: 'Try asking to book a service or summarize a request.',
    })
    expect(parsed.intent).toBe('unknown')
    expect(parsed.message).toContain('Try')
  })

  test('rejects an unknown intent value', () => {
    const result = MergedIntentSchema.safeParse({
      intent: 'spam',
      reasoning: '',
      serviceType: '',
      date: '',
      time: '',
      notes: '',
      draftText: '',
      targetChatRoomId: '',
      draftAmbiguous: false,
      candidateChatRoomIds: [],
      targetRequestId: '',
      summarizeAmbiguous: false,
      candidateRequestIds: [],
      message: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('Shared VoiceIntentSchema discriminated union', () => {
  test('parses each branch', () => {
    expect(
      VoiceIntentSchema.parse({
        intent: 'create_service_request',
        serviceType: 'cleaning',
        date: '2026-05-12',
      }).intent,
    ).toBe('create_service_request')

    expect(
      VoiceIntentSchema.parse({
        intent: 'draft_message',
        draftText: 'hello',
        ambiguous: false,
        candidateChatRoomIds: [],
      }).intent,
    ).toBe('draft_message')

    expect(
      VoiceIntentSchema.parse({
        intent: 'summarize_request',
        targetRequestId: 'req-1',
        ambiguous: false,
        candidateRequestIds: [],
      }).intent,
    ).toBe('summarize_request')

    expect(
      VoiceIntentSchema.parse({
        intent: 'unknown',
        message: 'hint',
      }).intent,
    ).toBe('unknown')
  })

  test('individual branch schemas roundtrip', () => {
    expect(
      CreateServiceRequestIntentSchema.parse({
        intent: 'create_service_request',
      }).intent,
    ).toBe('create_service_request')

    expect(
      DraftMessageIntentSchema.parse({
        intent: 'draft_message',
        draftText: 'hi',
      }).draftText,
    ).toBe('hi')

    expect(
      SummarizeRequestIntentSchema.parse({
        intent: 'summarize_request',
      }).ambiguous,
    ).toBe(false)

    expect(
      UnknownIntentSchema.parse({ intent: 'unknown', message: 'x' }).message,
    ).toBe('x')
  })
})

describe('ReplySuggestionsSchema', () => {
  test('requires exactly 3 suggestions', () => {
    expect(
      ReplySuggestionsSchema.parse({
        suggestions: ['a', 'b', 'c'],
      }).suggestions,
    ).toHaveLength(3)

    expect(() =>
      ReplySuggestionsSchema.parse({ suggestions: ['only one'] }),
    ).toThrow()
  })
})

describe('StatusLineSchema', () => {
  test('accepts a plain string status line', () => {
    expect(
      StatusLineSchema.parse({ statusLine: 'Worker en route' }).statusLine,
    ).toBe('Worker en route')
  })
})
