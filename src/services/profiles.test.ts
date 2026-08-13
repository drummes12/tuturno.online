import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQueryChain } from '@/test/supabase-mock'
import {
  fetchProfile,
  updateProfile,
  fetchBusinessId
} from '@/services/profiles'
import type { Profile } from '@/types'

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn()
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc }
}))

const mockProfile: Profile = {
  id: 'user-1',
  full_name: 'Juan Pérez',
  phone: '+57 300 000 0000',
  phone_verified: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
}

let chain: ReturnType<typeof createQueryChain>

beforeEach(() => {
  vi.clearAllMocks()
  chain = createQueryChain({ data: null, error: null })
  mockFrom.mockReturnValue(chain)
})

describe('fetchProfile', () => {
  it('happy path: retorna el perfil del usuario', async () => {
    chain = createQueryChain({ data: mockProfile, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchProfile('user-1')

    expect(result).toEqual(mockProfile)
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(chain.single).toHaveBeenCalled()
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'No encontrado', code: 'PGRST116' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(fetchProfile('user-1')).rejects.toEqual(supabaseError)
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(chain.eq).toHaveBeenCalledWith('id', 'user-1')
  })
})

describe('updateProfile', () => {
  it('happy path: actualiza el perfil por userId', async () => {
    const updates = {
      full_name: 'Juan Pérez Actualizado',
      phone: '+57 311 111 1111'
    }
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await expect(updateProfile('user-1', updates)).resolves.toBeUndefined()

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(chain.update).toHaveBeenCalledWith(updates)
    expect(chain.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('actualiza solo el teléfono', async () => {
    const updates = { phone: '+57 322 222 2222' }
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await updateProfile('user-1', updates)

    expect(chain.update).toHaveBeenCalledWith({ phone: '+57 322 222 2222' })
    expect(chain.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Update falló', code: '42501' }
    chain = createQueryChain({ data: null, error: supabaseError })
    mockFrom.mockReturnValue(chain)

    await expect(updateProfile('user-1', { full_name: 'X' })).rejects.toEqual(
      supabaseError
    )
  })
})

describe('fetchBusinessId', () => {
  it('happy path: retorna el business_id desde maybeSingle', async () => {
    chain = createQueryChain({ data: { business_id: 'biz-1' }, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessId('user-1')

    expect(result).toBe('biz-1')
    expect(mockFrom).toHaveBeenCalledWith('business_members')
    expect(chain.select).toHaveBeenCalledWith('business_id')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.limit).toHaveBeenCalledWith(1)
    expect(chain.maybeSingle).toHaveBeenCalled()
  })

  it('retorna null cuando no hay datos (maybeSingle retorna null)', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessId('user-1')

    expect(result).toBeNull()
  })

  it('retorna null cuando business_id no está presente en data', async () => {
    chain = createQueryChain({ data: {}, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessId('user-1')

    expect(result).toBeNull()
  })

  it('no lanza aunque supabase retorne error (lo ignora)', async () => {
    // fetchBusinessId no verifica error, usa optional chaining sobre data
    chain = createQueryChain({ data: null, error: { message: 'fail' } })
    mockFrom.mockReturnValue(chain)

    const result = await fetchBusinessId('user-1')

    expect(result).toBeNull()
  })
})
