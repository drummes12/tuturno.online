import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTenant } from '@/hooks/use-tenant'
import type { Business } from '@/types'

const { mockFetchBusinessBySlug } = vi.hoisted(() => ({
  mockFetchBusinessBySlug: vi.fn()
}))

vi.mock('@/services/business', () => ({
  fetchBusinessBySlug: mockFetchBusinessBySlug
}))

const mockBusiness: Business = {
  id: 'biz-1',
  name: 'TuTurno Demo',
  slug: 'demo',
  timezone: 'America/Bogota',
  street: null,
  neighborhood: null,
  city: null,
  state: null,
  country: null,
  phone: '+57 300 000 0000',
  slot_duration_minutes: 60,
  gap_minutes: 10,
  hold_duration_minutes: 15,
  min_advance_minutes: 60,
  cancellation_limit_hours: 24,
  max_advance_days: 30,
  resource_label_singular: 'Espacio',
  resource_label_plural: 'Espacios',
  reservation_instructions_md: null,
  is_demo: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useTenant', () => {
  it('inicia cargando cuando hay slug', () => {
    mockFetchBusinessBySlug.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useTenant('demo'))
    expect(result.current.loading).toBe(true)
    expect(result.current.business).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('carga el negocio por slug', async () => {
    mockFetchBusinessBySlug.mockResolvedValue(mockBusiness)
    const { result } = renderHook(() => useTenant('demo'))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.business).toEqual(mockBusiness)
    expect(result.current.error).toBeNull()
    expect(mockFetchBusinessBySlug).toHaveBeenCalledWith('demo')
  })

  it('expone is_demo=true para el negocio demo', async () => {
    mockFetchBusinessBySlug.mockResolvedValue(mockBusiness)
    const { result } = renderHook(() => useTenant('demo'))
    await waitFor(() => {
      expect(result.current.business).not.toBeNull()
    })
    expect(result.current.business?.is_demo).toBe(true)
  })

  it('setea error cuando el slug no existe', async () => {
    mockFetchBusinessBySlug.mockResolvedValue(null)
    const { result } = renderHook(() => useTenant('no-existe'))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.business).toBeNull()
    expect(result.current.error).toBe('Negocio no encontrado')
  })

  it('setea error cuando fetchBusinessBySlug falla', async () => {
    mockFetchBusinessBySlug.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useTenant('fail'))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.business).toBeNull()
    expect(result.current.error).toBe('No pudimos cargar el negocio')
  })

  it('setea error cuando no hay slug', async () => {
    const { result } = renderHook(() => useTenant(undefined))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.business).toBeNull()
    expect(result.current.error).toBe('Negocio no especificado')
    expect(mockFetchBusinessBySlug).not.toHaveBeenCalled()
  })

  it('vuelve a cargar cuando cambia el slug', async () => {
    mockFetchBusinessBySlug.mockResolvedValue(mockBusiness)
    const { result, rerender } = renderHook(({ slug }) => useTenant(slug), {
      initialProps: { slug: 'demo' as string | undefined }
    })
    await waitFor(() => {
      expect(result.current.business).not.toBeNull()
    })
    expect(mockFetchBusinessBySlug).toHaveBeenCalledWith('demo')

    const anotherBusiness = { ...mockBusiness, id: 'biz-2', slug: 'otro', is_demo: false }
    mockFetchBusinessBySlug.mockResolvedValue(anotherBusiness)
    rerender({ slug: 'otro' })

    await waitFor(() => {
      expect(result.current.business?.id).toBe('biz-2')
    })
    expect(mockFetchBusinessBySlug).toHaveBeenCalledWith('otro')
  })
})
