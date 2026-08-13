import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const { mockFetchBusinessId, mockUseAuthStore } = vi.hoisted(() => ({
  mockFetchBusinessId: vi.fn(),
  mockUseAuthStore: vi.fn()
}))

vi.mock('@/services/profiles', () => ({
  fetchBusinessId: mockFetchBusinessId
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: mockUseAuthStore
}))

import { useBusinessId } from '@/hooks/use-business-id'
import { useAuthStore } from '@/stores/auth'

beforeEach(() => {
  vi.clearAllMocks()
  mockFetchBusinessId.mockResolvedValue(null)
})

describe('useBusinessId', () => {
  it('retorna null inicialmente cuando no hay usuario', () => {
    vi.mocked(useAuthStore).mockReturnValue({ user: null })
    const { result } = renderHook(() => useBusinessId())
    expect(result.current).toBeNull()
  })

  it('retorna el business_id cuando el usuario es miembro', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-1' } })
    mockFetchBusinessId.mockResolvedValue('biz-123')
    const { result } = renderHook(() => useBusinessId())
    await waitFor(() => {
      expect(result.current).toBe('biz-123')
    })
  })

  it('retorna null cuando el usuario no es miembro de ningún negocio', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-2' } })
    mockFetchBusinessId.mockResolvedValue(null)
    const { result } = renderHook(() => useBusinessId())
    await waitFor(() => {
      expect(result.current).toBeNull()
    })
  })

  it('llama a fetchBusinessId con el user.id correcto', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ user: { id: 'user-abc' } })
    renderHook(() => useBusinessId())
    await waitFor(() => {
      expect(mockFetchBusinessId).toHaveBeenCalledWith('user-abc')
    })
  })

  it('no llama a fetchBusinessId cuando no hay usuario', () => {
    vi.mocked(useAuthStore).mockReturnValue({ user: null })
    renderHook(() => useBusinessId())
    expect(mockFetchBusinessId).not.toHaveBeenCalled()
  })
})
