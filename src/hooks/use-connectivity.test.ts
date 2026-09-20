import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConnectivity, useConnectivityStore } from './use-connectivity'

describe('useConnectivity', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    )
    useConnectivityStore.setState({ status: 'online', hardOffline: false })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('marca offline al instante pero la pantalla completa espera la gracia', async () => {
    const { result } = renderHook(() => useConnectivity())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.status).toBe('online')

    // Offline real: el evento dispara y el sondeo confirma el fallo.
    vi.mocked(fetch).mockRejectedValue(new TypeError('network down'))
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.status).toBe('offline')
    expect(result.current.hardOffline).toBe(false)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })
    expect(result.current.hardOffline).toBe(true)
  })

  it('un evento offline falso se corrige con el sondeo', async () => {
    const { result } = renderHook(() => useConnectivity())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    // navigator.onLine mintió (VPN, suspensión): el fetch sí responde,
    // así que el estado no debe quedar pegado en offline.
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.status).toBe('online')
    expect(result.current.hardOffline).toBe(false)
  })

  it('recupera online cuando el sondeo vuelve a responder', async () => {
    const { result } = renderHook(() => useConnectivity())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    vi.mocked(fetch).mockRejectedValue(new TypeError('network down'))
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })
    expect(result.current.hardOffline).toBe(true)

    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))
    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.status).toBe('online')
    expect(result.current.hardOffline).toBe(false)
  })

  it('recheck confirma offline cuando el sondeo falla', async () => {
    const { result } = renderHook(() => useConnectivity())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    vi.mocked(fetch).mockRejectedValue(new TypeError('network down'))
    await act(async () => {
      await result.current.recheck()
    })
    expect(result.current.status).toBe('offline')
    expect(result.current.hardOffline).toBe(false)
  })
})
