import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQueryChain } from '@/test/supabase-mock'
import {
  fetchBusiness,
  fetchBusinessContact,
  updateBusiness
} from '@/services/business'
import type { Business } from '@/types'

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn()
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc }
}))

const mockBusiness: Business = {
  id: 'biz-1',
  name: 'Canchas El Parque',
  slug: 'canchas-el-parque',
  timezone: 'America/Bogota',
  street: 'Calle 123 #45-67',
  neighborhood: 'El Poblado',
  city: 'Medellín',
  state: 'Antioquia',
  country: 'Colombia',
  phone: '+57 300 000 0000',
  slot_duration_minutes: 60,
  gap_minutes: 10,
  hold_duration_minutes: 15,
  cancellation_limit_hours: 24,
  max_advance_days: 30,
  reservation_instructions_md: '## Abono\n1. Paga 50%\n2. Envía comprobante',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
}

let chain: ReturnType<typeof createQueryChain>

beforeEach(() => {
  vi.clearAllMocks()
  chain = createQueryChain({ data: null, error: null })
  mockFrom.mockReturnValue(chain)
})

describe('fetchBusiness', () => {
  it('happy path: retorna el negocio desde maybeSingle', async () => {
    chain = createQueryChain({ data: mockBusiness, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusiness()

    expect(result).toEqual(mockBusiness)
    expect(mockFrom).toHaveBeenCalledWith('businesses')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.limit).toHaveBeenCalledWith(1)
    expect(chain.maybeSingle).toHaveBeenCalled()
  })

  it('retorna null cuando no hay negocio', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusiness()

    expect(result).toBeNull()
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Error de consulta', code: '500' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(fetchBusiness()).rejects.toEqual(supabaseError)
    expect(mockFrom).toHaveBeenCalledWith('businesses')
  })
})

describe('fetchBusinessContact', () => {
  it('happy path: retorna phone y name del negocio', async () => {
    const contact = {
      phone: '+57 300 000 0000',
      name: 'Canchas El Parque',
      street: 'Calle 123 #45-67',
      neighborhood: 'El Poblado',
      city: 'Medellín',
      state: 'Antioquia',
      country: 'Colombia',
      reservation_instructions_md: '## Abono\n1. Paga 50%'
    }
    chain = createQueryChain({ data: contact, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessContact()

    expect(result).toEqual(contact)
    expect(mockFrom).toHaveBeenCalledWith('businesses')
    expect(chain.select).toHaveBeenCalledWith(
      'phone, name, street, neighborhood, city, state, country, reservation_instructions_md'
    )
    expect(chain.limit).toHaveBeenCalledWith(1)
    expect(chain.single).toHaveBeenCalled()
  })

  it('retorna null cuando no hay contacto', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessContact()

    expect(result).toBeNull()
  })

  it('no lanza aunque supabase retorne error (lo ignora)', async () => {
    // fetchBusinessContact no verifica error, solo retorna data
    chain = createQueryChain({ data: null, error: { message: 'fail' } })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessContact()

    expect(result).toBeNull()
  })
})

describe('updateBusiness', () => {
  it('happy path: actualiza el negocio por id sin lanzar', async () => {
    const updates = { name: 'Nuevo Nombre', phone: '+57 311 111 1111' }
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await expect(updateBusiness('biz-1', updates)).resolves.toBeUndefined()

    expect(mockFrom).toHaveBeenCalledWith('businesses')
    expect(chain.update).toHaveBeenCalledWith(updates)
    expect(chain.eq).toHaveBeenCalledWith('id', 'biz-1')
  })

  it('pasa correctamente campos numéricos en updates', async () => {
    const updates = {
      slot_duration_minutes: 90,
      gap_minutes: 15,
      hold_duration_minutes: 20,
      cancellation_limit_hours: 48,
      max_advance_days: 60
    }
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await updateBusiness('biz-1', updates)

    expect(chain.update).toHaveBeenCalledWith(updates)
    expect(chain.eq).toHaveBeenCalledWith('id', 'biz-1')
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Update falló', code: '42501' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(updateBusiness('biz-1', { name: 'X' })).rejects.toEqual(
      supabaseError
    )
  })
})
