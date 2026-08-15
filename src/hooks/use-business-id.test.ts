import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const { mockUseAuthStore } = vi.hoisted(() => ({
  mockUseAuthStore: vi.fn()
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: mockUseAuthStore
}))

import { useBusinessId } from '@/hooks/use-business-id'
import { useAuthStore } from '@/stores/auth'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useBusinessId', () => {
  it('retorna null cuando no hay negocio activo', () => {
    vi.mocked(useAuthStore).mockReturnValue({ activeBusinessId: null })
    const { result } = renderHook(() => useBusinessId())
    expect(result.current).toBeNull()
  })

  it('retorna el activeBusinessId del store', () => {
    vi.mocked(useAuthStore).mockReturnValue({ activeBusinessId: 'biz-123' })
    const { result } = renderHook(() => useBusinessId())
    expect(result.current).toBe('biz-123')
  })

  it('refleja cambios cuando cambia el negocio activo', () => {
    vi.mocked(useAuthStore).mockReturnValue({ activeBusinessId: 'biz-1' })
    const { result, rerender } = renderHook(() => useBusinessId())
    expect(result.current).toBe('biz-1')

    vi.mocked(useAuthStore).mockReturnValue({ activeBusinessId: 'biz-2' })
    rerender()
    expect(result.current).toBe('biz-2')
  })
})
