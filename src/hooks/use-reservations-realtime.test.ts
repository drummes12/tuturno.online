import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const { mockChannel, mockRemoveChannel, mockChannelFn } = vi.hoisted(() => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis()
  }
  return {
    mockChannel,
    mockRemoveChannel: vi.fn(),
    mockChannelFn: vi.fn().mockReturnValue(mockChannel)
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: mockChannelFn,
    removeChannel: mockRemoveChannel
  }
}))

import { useReservationsRealtime } from '@/hooks/use-reservations-realtime'
import { supabase } from '@/lib/supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useReservationsRealtime', () => {
  it('crea un canal llamado "reservations-changes"', () => {
    const { unmount } = renderHook(() => useReservationsRealtime(vi.fn()))
    expect(supabase.channel).toHaveBeenCalledWith('reservations-changes')
    unmount()
  })

  it('se suscribe a postgres_changes en tabla reservations', () => {
    renderHook(() => useReservationsRealtime(vi.fn()))
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'reservations'
      }),
      expect.any(Function)
    )
  })

  it('no incluye filter cuando no se proporciona', () => {
    renderHook(() => useReservationsRealtime(vi.fn()))
    const call = mockChannel.on.mock.calls[0]
    expect(call[1]).not.toHaveProperty('filter')
  })

  it('incluye filter cuando se proporciona', () => {
    renderHook(() => useReservationsRealtime(vi.fn(), 'user_id=eq.123'))
    const call = mockChannel.on.mock.calls[0]
    expect(call[1]).toHaveProperty('filter', 'user_id=eq.123')
  })

  it('llama removeChannel al desmontar', () => {
    const { unmount } = renderHook(() => useReservationsRealtime(vi.fn()))
    unmount()
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel)
  })

  it('ejecuta el callback cuando llega un cambio', () => {
    const callback = vi.fn()
    renderHook(() => useReservationsRealtime(callback))
    // Obtener el handler pasado a .on()
    const handler = mockChannel.on.mock.calls[0][2] as () => void
    handler()
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('usa la versión más reciente del callback (ref)', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    const { rerender } = renderHook(({ cb }) => useReservationsRealtime(cb), {
      initialProps: { cb: callback1 }
    })
    rerender({ cb: callback2 })
    const handler = mockChannel.on.mock.calls[0][2] as () => void
    handler()
    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalledTimes(1)
  })
})
