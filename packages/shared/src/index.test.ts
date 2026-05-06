import { describe, expect, it } from 'vitest'
import {
  CreateServiceRequestSchema,
  getHomeRouteForRole,
  isClient,
  isManager,
  isWorker,
  RoleSchema,
  SendChatMessageSchema,
  VoiceIntentSchema,
} from './index'

describe('roles', () => {
  it('parses valid roles', () => {
    expect(RoleSchema.parse('client')).toBe('client')
    expect(RoleSchema.parse('worker')).toBe('worker')
    expect(RoleSchema.parse('manager')).toBe('manager')
  })

  it('routes to the right home group per role', () => {
    expect(getHomeRouteForRole('client')).toBe('/(client)')
    expect(getHomeRouteForRole('worker')).toBe('/(worker)')
    expect(getHomeRouteForRole('manager')).toBe('/(manager)')
  })

  it('narrows roles via type guards', () => {
    expect(isClient('client')).toBe(true)
    expect(isWorker('worker')).toBe(true)
    expect(isManager('manager')).toBe(true)
    expect(isClient('worker')).toBe(false)
    expect(isClient(null)).toBe(false)
  })
})

describe('CreateServiceRequestSchema', () => {
  it('accepts a well-formed request', () => {
    const parsed = CreateServiceRequestSchema.parse({
      serviceType: 'cleaning',
      date: '2026-05-10',
      time: '09:30',
      notes: 'Two-bedroom flat',
    })
    expect(parsed.notes).toBe('Two-bedroom flat')
  })

  it('rejects malformed date/time', () => {
    expect(() =>
      CreateServiceRequestSchema.parse({
        serviceType: 'cleaning',
        date: '10/05/2026',
        time: '9:30',
      }),
    ).toThrow()
  })
})

describe('SendChatMessageSchema', () => {
  it('rejects empty messages', () => {
    expect(() =>
      SendChatMessageSchema.parse({ chatRoomId: 'rm', text: '   ' }),
    ).toThrow()
  })
})

describe('VoiceIntentSchema', () => {
  it('discriminates by intent', () => {
    const parsed = VoiceIntentSchema.parse({
      intent: 'unknown',
      message: 'I did not catch that',
    })
    expect(parsed.intent).toBe('unknown')
  })
})
