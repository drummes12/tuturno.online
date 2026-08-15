import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQueryChain } from '@/test/supabase-mock'
import {
  fetchAvailabilityExceptions,
  createAvailabilityException,
  deleteAvailabilityException,
  countOverlappingReservations
} from '@/services/availability-exceptions'
import type { AvailabilityException } from '@/types'

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn()
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom }
}))

const mockExceptions: AvailabilityException[] = [
  {
    id: 'exc-1',
    business_id: 'biz-1',
    court_id: null,
    starts_at: '2025-12-25T00:00:00Z',
    ends_at: '2025-12-25T23:59:59Z',
    type: 'closed',
    reason: 'Navidad',
    created_by: null,
    created_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'exc-2',
    business_id: 'biz-1',
    court_id: 'court-1',
    starts_at: '2025-12-31T22:00:00Z',
    ends_at: '2026-01-01T02:00:00Z',
    type: 'closed',
    reason: 'Mantenimiento',
    created_by: null,
    created_at: '2025-01-01T00:00:00Z'
  }
]

let chain: ReturnType<typeof createQueryChain>

beforeEach(() => {
  vi.clearAllMocks()
  chain = createQueryChain({ data: null, error: null })
  mockFrom.mockReturnValue(chain)
})

describe('fetchAvailabilityExceptions', () => {
  it('happy path: retorna la lista ordenada por starts_at', async () => {
    chain = createQueryChain({ data: mockExceptions, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchAvailabilityExceptions('biz-1')

    expect(result).toEqual(mockExceptions)
    expect(mockFrom).toHaveBeenCalledWith('availability_exceptions')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('business_id', 'biz-1')
    expect(chain.order).toHaveBeenCalledWith('starts_at', { ascending: true })
  })

  it('retorna array vacío cuando no hay excepciones', async () => {
    chain = createQueryChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchAvailabilityExceptions('biz-1')

    expect(result).toEqual([])
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Query falló', code: '500' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(fetchAvailabilityExceptions('biz-1')).rejects.toEqual(
      supabaseError
    )
  })
})

describe('createAvailabilityException', () => {
  it('happy path: inserta un cierre global con reason', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await expect(
      createAvailabilityException({
        businessId: 'biz-1',
        courtId: null,
        startsAt: '2025-12-25T05:00:00Z',
        endsAt: '2025-12-26T05:00:00Z',
        reason: 'Navidad',
        createdBy: 'user-1'
      })
    ).resolves.toBeUndefined()

    expect(mockFrom).toHaveBeenCalledWith('availability_exceptions')
    expect(chain.insert).toHaveBeenCalledWith({
      business_id: 'biz-1',
      court_id: null,
      starts_at: '2025-12-25T05:00:00Z',
      ends_at: '2025-12-26T05:00:00Z',
      type: 'closed',
      reason: 'Navidad',
      created_by: 'user-1'
    })
  })

  it('inserta un cierre por cancha específica', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await createAvailabilityException({
      businessId: 'biz-1',
      courtId: 'court-1',
      startsAt: '2025-12-31T22:00:00Z',
      endsAt: '2026-01-01T02:00:00Z'
    })

    expect(chain.insert).toHaveBeenCalledWith({
      business_id: 'biz-1',
      court_id: 'court-1',
      starts_at: '2025-12-31T22:00:00Z',
      ends_at: '2026-01-01T02:00:00Z',
      type: 'closed',
      reason: null,
      created_by: null
    })
  })

  it('limpia reason vacío a null', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await createAvailabilityException({
      businessId: 'biz-1',
      courtId: null,
      startsAt: '2025-12-25T05:00:00Z',
      endsAt: '2025-12-26T05:00:00Z',
      reason: '   '
    })

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ reason: null })
    )
  })

  it('rechaza intervalo invertido (fin <= inicio)', async () => {
    await expect(
      createAvailabilityException({
        businessId: 'biz-1',
        courtId: null,
        startsAt: '2025-12-26T05:00:00Z',
        endsAt: '2025-12-25T05:00:00Z'
      })
    ).rejects.toThrow('La fecha de fin debe ser posterior a la de inicio')

    expect(chain.insert).not.toHaveBeenCalled()
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Insert falló', code: '42501' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(
      createAvailabilityException({
        businessId: 'biz-1',
        courtId: null,
        startsAt: '2025-12-25T05:00:00Z',
        endsAt: '2025-12-26T05:00:00Z'
      })
    ).rejects.toEqual(supabaseError)
  })
})

describe('deleteAvailabilityException', () => {
  it('happy path: elimina por id', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await expect(
      deleteAvailabilityException('exc-1')
    ).resolves.toBeUndefined()

    expect(mockFrom).toHaveBeenCalledWith('availability_exceptions')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'exc-1')
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Delete falló', code: '42501' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(deleteAvailabilityException('exc-1')).rejects.toEqual(
      supabaseError
    )
  })
})

describe('countOverlappingReservations', () => {
  it('happy path global: cuenta reservas solapadas en todo el negocio', async () => {
    chain = createQueryChain({ data: null, error: null, count: 3 })
    mockFrom.mockReturnValue(chain)

    const count = await countOverlappingReservations({
      businessId: 'biz-1',
      courtId: null,
      startsAt: '2025-12-25T05:00:00Z',
      endsAt: '2025-12-26T05:00:00Z'
    })

    expect(count).toBe(3)
    expect(mockFrom).toHaveBeenCalledWith('reservations')
    expect(chain.select).toHaveBeenCalledWith('id', {
      count: 'exact',
      head: true
    })
    expect(chain.eq).toHaveBeenCalledWith('business_id', 'biz-1')
    expect(chain.in).toHaveBeenCalledWith('status', ['pending', 'confirmed'])
    expect(chain.lt).toHaveBeenCalledWith('starts_at', '2025-12-26T05:00:00Z')
    expect(chain.gt).toHaveBeenCalledWith('ends_at', '2025-12-25T05:00:00Z')
    // No debe filtrar por court_id cuando es global
    expect(chain.eq).not.toHaveBeenCalledWith('court_id', expect.anything())
  })

  it('filtra por court_id cuando se especifica una cancha', async () => {
    chain = createQueryChain({ data: null, error: null, count: 1 })
    mockFrom.mockReturnValue(chain)

    const count = await countOverlappingReservations({
      businessId: 'biz-1',
      courtId: 'court-1',
      startsAt: '2025-12-25T05:00:00Z',
      endsAt: '2025-12-26T05:00:00Z'
    })

    expect(count).toBe(1)
    expect(chain.eq).toHaveBeenCalledWith('court_id', 'court-1')
  })

  it('retorna 0 cuando no hay reservas solapadas', async () => {
    chain = createQueryChain({ data: null, error: null, count: 0 })
    mockFrom.mockReturnValue(chain)

    const count = await countOverlappingReservations({
      businessId: 'biz-1',
      courtId: null,
      startsAt: '2025-12-25T05:00:00Z',
      endsAt: '2025-12-26T05:00:00Z'
    })

    expect(count).toBe(0)
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Count falló', code: '500' }
    chain = createQueryChain({ data: null, error: supabaseError, count: null })
    mockFrom.mockReturnValue(chain)

    await expect(
      countOverlappingReservations({
        businessId: 'biz-1',
        courtId: null,
        startsAt: '2025-12-25T05:00:00Z',
        endsAt: '2025-12-26T05:00:00Z'
      })
    ).rejects.toEqual(supabaseError)
  })
})
