import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn()
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom
  }
}))

import {
  removeCurrentPushSubscription,
  savePushSubscription
} from '@/services/push'

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
  Reflect.deleteProperty(navigator, 'serviceWorker')
})

describe('removeCurrentPushSubscription', () => {
  it('elimina del backend y desuscribe el endpoint actual', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true)
    const eq = vi.fn().mockResolvedValue({ error: null })
    const deleteQuery = vi.fn().mockReturnValue({ eq })
    mockFrom.mockReturnValue({ delete: deleteQuery })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue({
              endpoint: 'https://fcm.googleapis.com/current',
              unsubscribe
            })
          }
        })
      }
    })

    await expect(removeCurrentPushSubscription()).resolves.toBeUndefined()
    expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')
    expect(deleteQuery).toHaveBeenCalledOnce()
    expect(eq).toHaveBeenCalledWith(
      'endpoint',
      'https://fcm.googleapis.com/current'
    )
    expect(unsubscribe).toHaveBeenCalledOnce()
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
