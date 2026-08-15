import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQueryChain } from '@/test/supabase-mock'
import {
  fetchBusinessHours,
  insertBusinessHour,
  updateBusinessHour,
  deleteBusinessHour
} from '@/services/business-hours'
import type { BusinessHours } from '@/types'

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn()
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc }
}))

const mockHours: BusinessHours[] = [
  {
    id: 'bh-1',
    business_id: 'biz-1',
    day_of_week: 1,
    open_time: '08:00',
    close_time: '22:00',
    is_active: true
  },
  {
    id: 'bh-2',
    business_id: 'biz-1',
    day_of_week: 2,
    open_time: '08:00',
    close_time: '20:00',
    is_active: false
  }
]

let chain: ReturnType<typeof createQueryChain>

beforeEach(() => {
  vi.clearAllMocks()
  chain = createQueryChain({ data: null, error: null })
  mockFrom.mockReturnValue(chain)
})

describe('fetchBusinessHours', () => {
  it('happy path: retorna la lista de horarios ordenada', async () => {
    chain = createQueryChain({ data: mockHours, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessHours('biz-1')

    expect(result).toEqual(mockHours)
    expect(result).toHaveLength(2)
    expect(mockFrom).toHaveBeenCalledWith('business_hours')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('business_id', 'biz-1')
    expect(chain.order).toHaveBeenCalledWith('day_of_week, open_time')
  })

  it('retorna array vacío cuando no hay horarios', async () => {
    chain = createQueryChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessHours('biz-1')

    expect(result).toEqual([])
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Query falló', code: '500' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(fetchBusinessHours('biz-1')).rejects.toEqual(supabaseError)
    expect(mockFrom).toHaveBeenCalledWith('business_hours')
  })
})

describe('insertBusinessHour', () => {
  it('happy path: inserta un horario con los parámetros correctos', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await expect(
      insertBusinessHour('biz-1', 1, '08:00', '22:00', true)
    ).resolves.toBeUndefined()

    expect(mockFrom).toHaveBeenCalledWith('business_hours')
    expect(chain.insert).toHaveBeenCalledWith({
      business_id: 'biz-1',
      day_of_week: 1,
      open_time: '08:00',
      close_time: '22:00',
      is_active: true
    })
  })

  it('inserta correctamente con is_active false', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await insertBusinessHour('biz-1', 6, '09:00', '18:00', false)

    expect(chain.insert).toHaveBeenCalledWith({
      business_id: 'biz-1',
      day_of_week: 6,
      open_time: '09:00',
      close_time: '18:00',
      is_active: false
    })
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Insert falló', code: '23505' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(
      insertBusinessHour('biz-1', 1, '08:00', '22:00', true)
    ).rejects.toEqual(supabaseError)
  })
})

describe('updateBusinessHour', () => {
  it('happy path: actualiza open_time, close_time e is_active por id', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await expect(
      updateBusinessHour('bh-1', '09:00', '21:00', true)
    ).resolves.toBeUndefined()

    expect(mockFrom).toHaveBeenCalledWith('business_hours')
    expect(chain.update).toHaveBeenCalledWith({
      open_time: '09:00',
      close_time: '21:00',
      is_active: true
    })
    expect(chain.eq).toHaveBeenCalledWith('id', 'bh-1')
  })

  it('actualiza con is_active false', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await updateBusinessHour('bh-2', '10:00', '16:00', false)

    expect(chain.update).toHaveBeenCalledWith({
      open_time: '10:00',
      close_time: '16:00',
      is_active: false
    })
    expect(chain.eq).toHaveBeenCalledWith('id', 'bh-2')
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Update falló', code: '42501' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(
      updateBusinessHour('bh-1', '09:00', '21:00', true)
    ).rejects.toEqual(supabaseError)
  })
})

describe('deleteBusinessHour', () => {
  it('happy path: elimina un horario por id', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await expect(deleteBusinessHour('bh-1')).resolves.toBeUndefined()

    expect(mockFrom).toHaveBeenCalledWith('business_hours')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'bh-1')
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Delete falló', code: '42501' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(deleteBusinessHour('bh-1')).rejects.toEqual(supabaseError)
  })
})
