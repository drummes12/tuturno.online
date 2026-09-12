import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRpc, mockInvoke } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockInvoke: vi.fn()
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: mockRpc, functions: { invoke: mockInvoke } }
}))

import { savePushSubscription, sendTestPush } from '@/services/push'

const subscription = {
  endpoint: 'https://fcm.googleapis.com/push/subscription',
  expirationTime: null,
  toJSON: () => ({
    endpoint: 'https://fcm.googleapis.com/push/subscription',
    expirationTime: null,
    keys: {
      p256dh: 'p256dh-key',
      auth: 'auth-key'
    }
  })
} as unknown as PushSubscription

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sendTestPush', () => {
  it('invoca la Edge Function de prueba', async () => {
    mockInvoke.mockResolvedValue({
      data: { sent: 2, revoked: 0, failed: 0 },
      error: null
    })

    await expect(sendTestPush()).resolves.toEqual({
      sent: 2,
      revoked: 0,
      failed: 0
    })
    expect(mockInvoke).toHaveBeenCalledWith('send-test-push', {
      body: {}
    })
  })
})

describe('savePushSubscription', () => {
  it('registra las claves y el endpoint mediante RPC', async () => {
    mockRpc.mockResolvedValue({ data: 'subscription-id', error: null })

    await expect(savePushSubscription(subscription)).resolves.toBe(
      'subscription-id'
    )

    expect(mockRpc).toHaveBeenCalledWith('register_push_subscription', {
      p_endpoint: subscription.endpoint,
      p_p256dh: 'p256dh-key',
      p_auth: 'auth-key',
      p_expiration_time: null,
      p_user_agent: navigator.userAgent
    })
  })

  it('rechaza una suscripción sin claves', async () => {
    const invalidSubscription = {
      ...subscription,
      toJSON: () => ({ keys: {} })
    } as unknown as PushSubscription

    await expect(savePushSubscription(invalidSubscription)).rejects.toThrow(
      'La suscripción no contiene las claves necesarias.'
    )
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('propaga errores del RPC', async () => {
    const rpcError = { message: 'permission denied', code: '42501' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(savePushSubscription(subscription)).rejects.toEqual(rpcError)
  })
})
