import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQueryChain } from '@/test/supabase-mock'
import type { Reservation } from '@/types'

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn()
}))
vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc }
}))

import {
  fetchPendingReservations,
  fetchTodayReservations,
  fetchReservationsByDate,
  fetchUserReservations,
  confirmReservation,
  rejectReservation,
  cancelReservationByBusiness,
  cancelReservationByClient,
  createReservation,
  createReservationAdmin
} from '@/services/reservations'

const RESERVATION_SELECT =
  '*, court:courts(*), profile:profiles!reservations_user_id_fkey(*)'

const sampleReservation = (
  overrides: Partial<Reservation> = {}
): Reservation => ({
  id: 'res-1',
  business_id: 'biz-1',
  court_id: 'court-1',
  user_id: 'user-1',
  starts_at: '2025-01-01T10:00:00Z',
  ends_at: '2025-01-01T11:00:00Z',
  status: 'pending',
  hold_expires_at: null,
  notes: null,
  decision_reason: null,
  decided_by: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchPendingReservations', () => {
  it('retorna las reservas pendientes ordenadas ascendentemente', async () => {
    const data = [
      sampleReservation({ id: 'r1', starts_at: '2025-01-01T08:00:00Z' }),
      sampleReservation({ id: 'r2', starts_at: '2025-01-01T10:00:00Z' })
    ]
    const chain = createQueryChain({ data, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchPendingReservations()

    expect(result).toEqual(data)
    expect(mockFrom).toHaveBeenCalledWith('reservations')
    expect(chain.select).toHaveBeenCalledWith(RESERVATION_SELECT)
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending')
    expect(chain.order).toHaveBeenCalledWith('starts_at', { ascending: true })
  })

  it('lanza el error cuando supabase retorna error', async () => {
    const dbError = { message: 'permission denied', code: '42501' }
    const chain = createQueryChain({ data: null, error: dbError })
    mockFrom.mockReturnValue(chain)

    await expect(fetchPendingReservations()).rejects.toEqual(dbError)
  })
})

describe('fetchTodayReservations', () => {
  it('filtra por rango de fechas y excluye pendientes, orden asc', async () => {
    const data = [
      sampleReservation({
        id: 'r1',
        status: 'confirmed',
        starts_at: '2025-01-01T08:00:00Z'
      }),
      sampleReservation({
        id: 'r2',
        status: 'cancelled_by_client',
        starts_at: '2025-01-01T12:00:00Z'
      })
    ]
    const chain = createQueryChain({ data, error: null })
    mockFrom.mockReturnValue(chain)

    const start = '2025-01-01T00:00:00Z'
    const end = '2025-01-02T00:00:00Z'
    const result = await fetchTodayReservations(start, end)

    expect(result).toEqual(data)
    expect(mockFrom).toHaveBeenCalledWith('reservations')
    expect(chain.select).toHaveBeenCalledWith(RESERVATION_SELECT)
    expect(chain.gte).toHaveBeenCalledWith('starts_at', start)
    expect(chain.lte).toHaveBeenCalledWith('starts_at', end)
    expect(chain.neq).toHaveBeenCalledWith('status', 'pending')
    expect(chain.order).toHaveBeenCalledWith('starts_at', { ascending: true })
  })

  it('lanza el error cuando supabase retorna error', async () => {
    const dbError = { message: 'network error', code: 'PGRST116' }
    const chain = createQueryChain({ data: null, error: dbError })
    mockFrom.mockReturnValue(chain)

    await expect(
      fetchTodayReservations('2025-01-01T00:00:00Z', '2025-01-02T00:00:00Z')
    ).rejects.toEqual(dbError)
  })
})

describe('fetchReservationsByDate', () => {
  it('sin status: filtra solo por rango de fechas, sin eq de status', async () => {
    const data = [sampleReservation({ id: 'r1', status: 'confirmed' })]
    const chain = createQueryChain({ data, error: null })
    mockFrom.mockReturnValue(chain)

    const start = '2025-01-01T00:00:00Z'
    const end = '2025-01-02T00:00:00Z'
    const result = await fetchReservationsByDate(start, end)

    expect(result).toEqual(data)
    expect(mockFrom).toHaveBeenCalledWith('reservations')
    expect(chain.select).toHaveBeenCalledWith(RESERVATION_SELECT)
    expect(chain.gte).toHaveBeenCalledWith('starts_at', start)
    expect(chain.lte).toHaveBeenCalledWith('starts_at', end)
    expect(chain.order).toHaveBeenCalledWith('starts_at', { ascending: true })
    // sin status -> no se llama eq con 'status'
    expect(chain.eq).not.toHaveBeenCalled()
  })

  it('con status: aplica filtro eq de status', async () => {
    const data = [sampleReservation({ id: 'r1', status: 'confirmed' })]
    const chain = createQueryChain({ data, error: null })
    mockFrom.mockReturnValue(chain)

    const start = '2025-01-01T00:00:00Z'
    const end = '2025-01-02T00:00:00Z'
    const result = await fetchReservationsByDate(start, end, 'confirmed')

    expect(result).toEqual(data)
    expect(chain.eq).toHaveBeenCalledWith('status', 'confirmed')
  })

  it('con status "all": no aplica filtro eq de status', async () => {
    const data = [sampleReservation({ id: 'r1', status: 'confirmed' })]
    const chain = createQueryChain({ data, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchReservationsByDate(
      '2025-01-01T00:00:00Z',
      '2025-01-02T00:00:00Z',
      'all'
    )

    expect(result).toEqual(data)
    expect(chain.eq).not.toHaveBeenCalled()
  })

  it('lanza el error cuando supabase retorna error', async () => {
    const dbError = { message: 'invalid range', code: 'PGRST116' }
    const chain = createQueryChain({ data: null, error: dbError })
    mockFrom.mockReturnValue(chain)

    await expect(
      fetchReservationsByDate('2025-01-01T00:00:00Z', '2025-01-02T00:00:00Z')
    ).rejects.toEqual(dbError)
  })
})

describe('fetchUserReservations', () => {
  it('filtra por user_id y ordena desc, con select de court', async () => {
    const data = [
      sampleReservation({ id: 'r2', starts_at: '2025-01-02T10:00:00Z' }),
      sampleReservation({ id: 'r1', starts_at: '2025-01-01T10:00:00Z' })
    ]
    const chain = createQueryChain({ data, error: null })
    mockFrom.mockReturnValue(chain)

    const userId = 'user-123'
    const result = await fetchUserReservations(userId)

    expect(result).toEqual(data)
    expect(mockFrom).toHaveBeenCalledWith('reservations')
    expect(chain.select).toHaveBeenCalledWith('*, court:courts(*)')
    expect(chain.eq).toHaveBeenCalledWith('user_id', userId)
    expect(chain.order).toHaveBeenCalledWith('starts_at', { ascending: false })
  })

  it('lanza el error cuando supabase retorna error', async () => {
    const dbError = { message: 'row not found', code: 'PGRST116' }
    const chain = createQueryChain({ data: null, error: dbError })
    mockFrom.mockReturnValue(chain)

    await expect(fetchUserReservations('user-123')).rejects.toEqual(dbError)
  })
})

describe('confirmReservation', () => {
  it('llama al RPC confirm_reservation con el id correcto', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await confirmReservation('res-123')

    expect(mockRpc).toHaveBeenCalledWith('confirm_reservation', {
      p_reservation_id: 'res-123'
    })
  })

  it('lanza el error cuando el RPC retorna error', async () => {
    const rpcError = { message: 'already confirmed', code: 'PGRST116' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(confirmReservation('res-123')).rejects.toEqual(rpcError)
  })
})

describe('rejectReservation', () => {
  it('llama al RPC reject_reservation con id y reason', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await rejectReservation('res-123', 'fuera de horario')

    expect(mockRpc).toHaveBeenCalledWith('reject_reservation', {
      p_reservation_id: 'res-123',
      p_reason: 'fuera de horario'
    })
  })

  it('lanza el error cuando el RPC retorna error', async () => {
    const rpcError = { message: 'not pending', code: 'PGRST116' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(rejectReservation('res-123', 'motivo')).rejects.toEqual(
      rpcError
    )
  })
})

describe('cancelReservationByBusiness', () => {
  it('llama al RPC cancel_reservation_by_business con id y reason', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await cancelReservationByBusiness('res-123', 'cancha en mantenimiento')

    expect(mockRpc).toHaveBeenCalledWith('cancel_reservation_by_business', {
      p_reservation_id: 'res-123',
      p_reason: 'cancha en mantenimiento'
    })
  })

  it('lanza el error cuando el RPC retorna error', async () => {
    const rpcError = { message: 'cannot cancel', code: 'PGRST116' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(
      cancelReservationByBusiness('res-123', 'motivo')
    ).rejects.toEqual(rpcError)
  })
})

describe('cancelReservationByClient', () => {
  it('llama al RPC cancel_reservation_by_client con el id correcto', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await cancelReservationByClient('res-123')

    expect(mockRpc).toHaveBeenCalledWith('cancel_reservation_by_client', {
      p_reservation_id: 'res-123'
    })
  })

  it('lanza el error cuando el RPC retorna error', async () => {
    const rpcError = { message: 'too late to cancel', code: 'PGRST116' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(cancelReservationByClient('res-123')).rejects.toEqual(rpcError)
  })
})

describe('createReservation', () => {
  it('llama al RPC create_reservation y retorna { error: null } cuando data.error es undefined', async () => {
    mockRpc.mockResolvedValue({ data: {}, error: null })

    const result = await createReservation(
      'court-1',
      '2025-01-01T10:00:00Z',
      null
    )

    expect(mockRpc).toHaveBeenCalledWith('create_reservation', {
      p_court_id: 'court-1',
      p_starts_at: '2025-01-01T10:00:00Z',
      p_notes: null
    })
    expect(result).toEqual({ error: null })
  })

  it('retorna { error } con el mensaje de data.error cuando la RPC lo provee', async () => {
    mockRpc.mockResolvedValue({
      data: { error: 'slot not available' },
      error: null
    })

    const result = await createReservation(
      'court-1',
      '2025-01-01T10:00:00Z',
      'notas'
    )

    expect(mockRpc).toHaveBeenCalledWith('create_reservation', {
      p_court_id: 'court-1',
      p_starts_at: '2025-01-01T10:00:00Z',
      p_notes: 'notas'
    })
    expect(result).toEqual({ error: 'slot not available' })
  })

  it('lanza el error cuando el RPC retorna error de BD', async () => {
    const rpcError = { message: 'function not found', code: '42883' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(
      createReservation('court-1', '2025-01-01T10:00:00Z', null)
    ).rejects.toEqual(rpcError)
  })
})

describe('createReservationAdmin', () => {
  it('llama al RPC create_reservation_admin con todos los parámetros', async () => {
    mockRpc.mockResolvedValue({ data: {}, error: null })

    const result = await createReservationAdmin(
      'court-1',
      '2025-01-01T10:00:00Z',
      'Juan Pérez',
      '+57 300 123 4567',
      'reserva administrativa'
    )

    expect(mockRpc).toHaveBeenCalledWith('create_reservation_admin', {
      p_court_id: 'court-1',
      p_starts_at: '2025-01-01T10:00:00Z',
      p_client_name: 'Juan Pérez',
      p_client_phone: '+57 300 123 4567',
      p_notes: 'reserva administrativa'
    })
    expect(result).toEqual({ error: null })
  })

  it('acepta valores null para client_name, client_phone y notes', async () => {
    mockRpc.mockResolvedValue({ data: {}, error: null })

    const result = await createReservationAdmin(
      'court-1',
      '2025-01-01T10:00:00Z',
      null,
      null,
      null
    )

    expect(mockRpc).toHaveBeenCalledWith('create_reservation_admin', {
      p_court_id: 'court-1',
      p_starts_at: '2025-01-01T10:00:00Z',
      p_client_name: null,
      p_client_phone: null,
      p_notes: null
    })
    expect(result).toEqual({ error: null })
  })

  it('retorna { error } con el mensaje de data.error cuando la RPC lo provee', async () => {
    mockRpc.mockResolvedValue({
      data: { error: 'court inactive' },
      error: null
    })

    const result = await createReservationAdmin(
      'court-1',
      '2025-01-01T10:00:00Z',
      'Juan',
      '3001234567',
      null
    )

    expect(result).toEqual({ error: 'court inactive' })
  })

  it('lanza el error cuando el RPC retorna error de BD', async () => {
    const rpcError = { message: 'permission denied', code: '42501' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(
      createReservationAdmin(
        'court-1',
        '2025-01-01T10:00:00Z',
        'Juan',
        '300',
        null
      )
    ).rejects.toEqual(rpcError)
  })
})
