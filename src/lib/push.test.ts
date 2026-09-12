import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getNotificationPermission,
  requestNotificationPermission
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
