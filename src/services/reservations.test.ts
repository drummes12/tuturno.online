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
  fetchReservationById,
  fetchUserReservations,
  confirmReservation,
  rejectReservation,
  cancelReservationByBusiness,
  cancelReservationByClient,
  createReservation,
  createReservationAdmin
} from '@/services/reservations'

const RESERVATION_SELECT =
  '*, resource:resources(*), profile:profiles!reservations_user_id_fkey(*), client:clients(*)'

const sampleReservation = (
  overrides: Partial<Reservation> = {}
): Reservation => ({
  id: 'res-1',
  business_id: 'biz-1',
  resource_id: 'court-1',
  user_id: 'user-1',
  client_id: null,
  reservation_number: 1,
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
        starts_at: '2099-01-01T08:00:00Z',
        ends_at: '2099-01-01T09:00:00Z'
      }),
      sampleReservation({
        id: 'r2',
        status: 'cancelled_by_client',
        starts_at: '2099-01-01T12:00:00Z',
        ends_at: '2099-01-01T13:00:00Z'
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

    expect(result).toEqual([{ ...data[0], status: 'completed' }])
    expect(mockFrom).toHaveBeenCalledWith('reservations')
    expect(chain.select).toHaveBeenCalledWith(RESERVATION_SELECT)
    expect(chain.gte).toHaveBeenCalledWith('starts_at', start)
    expect(chain.lte).toHaveBeenCalledWith('starts_at', end)
    expect(chain.order).toHaveBeenCalledWith('starts_at', { ascending: true })
    // sin status -> no se llama eq con 'status'
    expect(chain.eq).not.toHaveBeenCalled()
  })

  it('con status: filtra después de consolidar los datos', async () => {
    const data = [
      sampleReservation({
        id: 'r1',
        status: 'confirmed',
        starts_at: '2099-01-01T10:00:00Z',
        ends_at: '2099-01-01T11:00:00Z'
      })
    ]
    const chain = createQueryChain({ data, error: null })
    mockFrom.mockReturnValue(chain)

    const start = '2025-01-01T00:00:00Z'
    const end = '2025-01-02T00:00:00Z'
    const result = await fetchReservationsByDate(start, end, 'confirmed')

    expect(result).toEqual(data)
    expect(chain.eq).not.toHaveBeenCalledWith('status', 'confirmed')
  })

  it('con status "all": no aplica filtro eq de status', async () => {
    const data = [sampleReservation({ id: 'r1', status: 'pending' })]
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

describe('fetchReservationById', () => {
  it('retorna la reserva cuando existe y es visible para el usuario', async () => {
    const data = sampleReservation({ id: 'r1' })
    const chain = createQueryChain({ data, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchReservationById('r1')

    expect(result).toEqual(data)
    expect(mockFrom).toHaveBeenCalledWith('reservations')
    expect(chain.select).toHaveBeenCalledWith(RESERVATION_SELECT)
    expect(chain.eq).toHaveBeenCalledWith('id', 'r1')
    expect(chain.maybeSingle).toHaveBeenCalled()
  })

  it('retorna null cuando la reserva no existe o no es visible', async () => {
    const chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchReservationById('missing')

    expect(result).toBeNull()
  })

  it('lanza el error cuando supabase retorna error', async () => {
    const dbError = { message: 'permission denied', code: '42501' }
    const chain = createQueryChain({ data: null, error: dbError })
    mockFrom.mockReturnValue(chain)

    await expect(fetchReservationById('r1')).rejects.toEqual(dbError)
  })
})

describe('fetchUserReservations', () => {
  it('filtra por user_id y client_ids vinculados, ordena desc', async () => {
    const data = [
      sampleReservation({ id: 'r2', starts_at: '2025-01-02T10:00:00Z' }),
      sampleReservation({ id: 'r1', starts_at: '2025-01-01T10:00:00Z' })
    ]

    // Primera llamada: clients (devuelve 1 client vinculado)
    const clientsChain = createQueryChain({
      data: [{ id: 'client-1' }, { id: 'client-2' }],
      error: null
    })
    // Segunda llamada: reservations
    const reservationsChain = createQueryChain({ data, error: null })
    mockFrom.mockReturnValueOnce(clientsChain)
    mockFrom.mockReturnValueOnce(reservationsChain)

    const userId = 'user-123'
    const result = await fetchUserReservations(userId)

    expect(result).toEqual(data)
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'clients')
    expect(clientsChain.select).toHaveBeenCalledWith('id')
    expect(clientsChain.eq).toHaveBeenCalledWith('user_id', userId)
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'reservations')
    expect(reservationsChain.select).toHaveBeenCalledWith(
      '*, resource:resources(*), client:clients(*)'
    )
    expect(reservationsChain.or).toHaveBeenCalledWith(
      `user_id.eq.${userId},client_id.in.(client-1,client-2)`
    )
    expect(reservationsChain.order).toHaveBeenCalledWith('starts_at', {
      ascending: false
    })
  })

  it('cuando el usuario no tiene clients vinculados, filtra solo por user_id', async () => {
    const data = [sampleReservation({ id: 'r1' })]

    const clientsChain = createQueryChain({ data: [], error: null })
    const reservationsChain = createQueryChain({ data, error: null })
    mockFrom.mockReturnValueOnce(clientsChain)
    mockFrom.mockReturnValueOnce(reservationsChain)

    const result = await fetchUserReservations('user-123')

    expect(result).toEqual(data)
    expect(reservationsChain.or).toHaveBeenCalledWith('user_id.eq.user-123')
  })

  it('lanza el error cuando el query de clients falla', async () => {
    const dbError = { message: 'permission denied', code: '42501' }
    const clientsChain = createQueryChain({ data: null, error: dbError })
    mockFrom.mockReturnValueOnce(clientsChain)

    await expect(fetchUserReservations('user-123')).rejects.toEqual(dbError)
  })

  it('lanza el error cuando el query de reservations falla', async () => {
    const dbError = { message: 'row not found', code: 'PGRST116' }
    const clientsChain = createQueryChain({ data: [], error: null })
    const reservationsChain = createQueryChain({ data: null, error: dbError })
    mockFrom.mockReturnValueOnce(clientsChain)
    mockFrom.mockReturnValueOnce(reservationsChain)

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
      p_resource_id: 'court-1',
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
      p_resource_id: 'court-1',
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
  it('llama al RPC create_reservation_admin con cliente existente (client_id)', async () => {
    mockRpc.mockResolvedValue({ data: {}, error: null })

    const result = await createReservationAdmin(
      'court-1',
      '2025-01-01T10:00:00Z',
      {
        clientId: 'client-1',
        clientName: 'Juan Pérez',
        clientPhone: '+57 300 123 4567',
        clientEmail: 'juan@email.com',
        notes: 'reserva administrativa'
      }
    )

    expect(mockRpc).toHaveBeenCalledWith('create_reservation_admin', {
      p_resource_id: 'court-1',
      p_starts_at: '2025-01-01T10:00:00Z',
      p_client_id: 'client-1',
      p_client_name: 'Juan Pérez',
      p_client_phone: '+57 300 123 4567',
      p_client_email: 'juan@email.com',
      p_notes: 'reserva administrativa'
    })
    expect(result).toEqual({ error: null })
  })

  it('llama al RPC con guest info cuando no hay client_id', async () => {
    mockRpc.mockResolvedValue({ data: {}, error: null })

    const result = await createReservationAdmin(
      'court-1',
      '2025-01-01T10:00:00Z',
      {
        clientId: null,
        clientName: 'Juan Pérez',
        clientPhone: '3001234567',
        clientEmail: 'juan@email.com',
        notes: null
      }
    )

    expect(mockRpc).toHaveBeenCalledWith('create_reservation_admin', {
      p_resource_id: 'court-1',
      p_starts_at: '2025-01-01T10:00:00Z',
      p_client_id: null,
      p_client_name: 'Juan Pérez',
      p_client_phone: '3001234567',
      p_client_email: 'juan@email.com',
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
      {
        clientId: null,
        clientName: 'Juan',
        clientPhone: '3001234567',
        notes: null
      }
    )

    expect(result).toEqual({ error: 'court inactive' })
  })

  it('lanza el error cuando el RPC retorna error de BD', async () => {
    const rpcError = { message: 'permission denied', code: '42501' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(
      createReservationAdmin('court-1', '2025-01-01T10:00:00Z', {
        clientId: null,
        clientName: 'Juan',
        clientPhone: '300',
        notes: null
      })
    ).rejects.toEqual(rpcError)
  })
})
