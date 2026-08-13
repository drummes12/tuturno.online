import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAvailability } from '@/services/availability'

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn()
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc }
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchAvailability', () => {
  it('happy path: retorna los slots de disponibilidad desde el RPC', async () => {
    const slots = [
      {
        court_id: 'court-1',
        court_name: 'Cancha A',
        starts_at: '2025-01-15T13:00:00Z',
        ends_at: '2025-01-15T14:00:00Z',
        status: 'available'
      },
      {
        court_id: 'court-1',
        court_name: 'Cancha A',
        starts_at: '2025-01-15T14:00:00Z',
        ends_at: '2025-01-15T15:00:00Z',
        status: 'reserved'
      }
    ]
    mockRpc.mockResolvedValue({ data: slots, error: null })

    const result = await fetchAvailability('court-1', '2025-01-15')

    expect(result).toEqual(slots)
    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith('get_availability', {
      p_court_id: 'court-1',
      p_date: '2025-01-15'
    })
  })

  it('retorna null cuando el RPC no retorna data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await fetchAvailability('court-1', '2025-01-15')

    expect(result).toBeNull()
  })

  it('error path: lanza cuando el RPC retorna error', async () => {
    const supabaseError = { message: 'RPC falló', code: 'PGRST202' }
    mockRpc.mockResolvedValue({ data: null, error: supabaseError })

    await expect(fetchAvailability('court-1', '2025-01-15')).rejects.toEqual(
      supabaseError
    )
    expect(mockRpc).toHaveBeenCalledWith('get_availability', {
      p_court_id: 'court-1',
      p_date: '2025-01-15'
    })
  })

  it('pasa correctamente courtId y date como parámetros del RPC', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    await fetchAvailability('court-99', '2025-06-30')

    expect(mockRpc).toHaveBeenCalledWith('get_availability', {
      p_court_id: 'court-99',
      p_date: '2025-06-30'
    })
  })
})
