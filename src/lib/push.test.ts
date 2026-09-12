import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush
} from '@/lib/push'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getNotificationPermission', () => {
  it('returns unsupported when Notification is unavailable', () => {
    vi.stubGlobal('Notification', undefined)

    expect(getNotificationPermission()).toBe('unsupported')
  })

  it('returns the browser permission state', () => {
    vi.stubGlobal('Notification', { permission: 'default' })

    expect(getNotificationPermission()).toBe('default')
  })
})

describe('requestNotificationPermission', () => {
  it('requests permission from the browser', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission
    })

    await expect(requestNotificationPermission()).resolves.toBe('granted')
    expect(requestPermission).toHaveBeenCalledOnce()
  })
})

describe('subscribeToPush', () => {
  it('reuses an existing browser subscription', async () => {
    const subscription = { endpoint: 'https://push.example/subscription' }
    const getSubscription = vi.fn().mockResolvedValue(subscription)
    const subscribe = vi.fn()

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: { getSubscription, subscribe }
        })
      }
    })

    await expect(subscribeToPush()).resolves.toBe(subscription)
    expect(getSubscription).toHaveBeenCalledOnce()
    expect(subscribe).not.toHaveBeenCalled()
  })
})
