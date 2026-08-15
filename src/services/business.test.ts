import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQueryChain } from '@/test/supabase-mock'
import {
  fetchBusinessBySlug,
  fetchBusinessContactById,
  fetchBusinessById,
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
  whatsapp_link: null,
  slot_duration_minutes: 60,
  gap_minutes: 10,
  hold_duration_minutes: 15,
  min_advance_minutes: 60,
  cancellation_limit_hours: 24,
  max_advance_days: 30,
  resource_label_singular: 'Cancha',
  resource_label_plural: 'Canchas',
  reservation_instructions_md: '## Abono\n1. Paga 50%\n2. Envía comprobante',
  is_demo: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
}

let chain: ReturnType<typeof createQueryChain>

beforeEach(() => {
  vi.clearAllMocks()
  chain = createQueryChain({ data: null, error: null })
  mockFrom.mockReturnValue(chain)
})

describe('fetchBusinessBySlug', () => {
  it('happy path: retorna el negocio filtrado por slug', async () => {
    chain = createQueryChain({ data: mockBusiness, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessBySlug('canchas-el-parque')

    expect(result).toEqual(mockBusiness)
    expect(mockFrom).toHaveBeenCalledWith('businesses')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('slug', 'canchas-el-parque')
    expect(chain.maybeSingle).toHaveBeenCalled()
  })

  it('retorna null cuando no hay negocio con ese slug', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessBySlug('no-existe')

    expect(result).toBeNull()
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Error de consulta', code: '500' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(fetchBusinessBySlug('fail')).rejects.toEqual(supabaseError)
    expect(mockFrom).toHaveBeenCalledWith('businesses')
  })
})

describe('fetchBusinessById', () => {
  it('happy path: retorna el negocio filtrado por id', async () => {
    chain = createQueryChain({ data: mockBusiness, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessById('biz-1')

    expect(result).toEqual(mockBusiness)
    expect(chain.eq).toHaveBeenCalledWith('id', 'biz-1')
    expect(chain.maybeSingle).toHaveBeenCalled()
  })

  it('retorna null cuando no hay negocio', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessById('no-existe')

    expect(result).toBeNull()
  })
})

describe('fetchBusinessContactById', () => {
  it('happy path: retorna phone, name, is_demo y etiquetas del negocio', async () => {
    const contact = {
      id: 'biz-1',
      phone: '+57 300 000 0000',
      whatsapp_link: null,
      name: 'Canchas El Parque',
      slug: 'canchas-el-parque',
      street: 'Calle 123 #45-67',
      neighborhood: 'El Poblado',
      city: 'Medellín',
      state: 'Antioquia',
      country: 'Colombia',
      resource_label_singular: 'Cancha',
      resource_label_plural: 'Canchas',
      reservation_instructions_md: '## Abono\n1. Paga 50%',
      is_demo: false
    }
    chain = createQueryChain({ data: contact, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessContactById('biz-1')

    expect(result).toEqual(contact)
    expect(mockFrom).toHaveBeenCalledWith('businesses')
    expect(chain.eq).toHaveBeenCalledWith('id', 'biz-1')
    expect(chain.maybeSingle).toHaveBeenCalled()
  })

  it('retorna null cuando no hay contacto', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessContactById('no-existe')

    expect(result).toBeNull()
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'fail', code: '500' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(fetchBusinessContactById('fail')).rejects.toEqual(
      supabaseError
    )
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
