import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: mockRpc }
}))

import {
  archiveNotification,
  archiveReadNotifications,
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '@/services/notifications'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchMyNotifications', () => {
  it('invoca el RPC con el límite y devuelve las filas', async () => {
    const rows = [{ id: 'n1' }, { id: 'n2' }]
    mockRpc.mockResolvedValue({ data: rows, error: null })

    await expect(fetchMyNotifications(10)).resolves.toEqual(rows)
    expect(mockRpc).toHaveBeenCalledWith('list_my_notifications', {
      p_limit: 10
    })
  })

  it('usa límite 50 por defecto y devuelve [] sin datos', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await expect(fetchMyNotifications()).resolves.toEqual([])
    expect(mockRpc).toHaveBeenCalledWith('list_my_notifications', {
      p_limit: 50
    })
  })

  it('lanza el error del RPC', async () => {
    const rpcError = { message: 'boom' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(fetchMyNotifications()).rejects.toEqual(rpcError)
  })
})

describe('markNotificationRead', () => {
  it('llama al RPC con el id', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await expect(markNotificationRead('n1')).resolves.toBeUndefined()
    expect(mockRpc).toHaveBeenCalledWith('mark_notification_read', {
      p_id: 'n1'
    })
  })

  it('propaga errores', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'x' } })
    await expect(markNotificationRead('n1')).rejects.toEqual({ message: 'x' })
  })
})

describe('markAllNotificationsRead', () => {
  it('devuelve el conteo del RPC', async () => {
    mockRpc.mockResolvedValue({ data: 3, error: null })
    await expect(markAllNotificationsRead()).resolves.toBe(3)
    expect(mockRpc).toHaveBeenCalledWith('mark_all_notifications_read')
  })

  it('devuelve 0 si el RPC no retorna número', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    await expect(markAllNotificationsRead()).resolves.toBe(0)
  })
})

describe('archiveNotification', () => {
  it('llama al RPC con el id', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    await expect(archiveNotification('n9')).resolves.toBeUndefined()
    expect(mockRpc).toHaveBeenCalledWith('archive_notification', {
      p_id: 'n9'
    })
  })
})

describe('archiveReadNotifications', () => {
  it('devuelve el conteo del RPC', async () => {
    mockRpc.mockResolvedValue({ data: 7, error: null })
    await expect(archiveReadNotifications()).resolves.toBe(7)
    expect(mockRpc).toHaveBeenCalledWith('archive_read_notifications')
  })

  it('propaga errores', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'nope' } })
    await expect(archiveReadNotifications()).rejects.toEqual({
      message: 'nope'
    })
  })
})
