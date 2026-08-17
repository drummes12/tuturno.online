import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQueryChain } from '@/test/supabase-mock'
import {
  fetchBusinessMembers,
  addBusinessMember,
  removeBusinessMember,
  findUserByEmailForInvite
} from '@/services/members'

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn()
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc }
}))

let chain: ReturnType<typeof createQueryChain>

beforeEach(() => {
  vi.clearAllMocks()
  chain = createQueryChain({ data: null, error: null })
  mockFrom.mockReturnValue(chain)
  mockRpc.mockResolvedValue({ data: null, error: null })
})

describe('fetchBusinessMembers', () => {
  it('happy path: retorna miembros con email resuelto', async () => {
    const memberRows = [
      {
        business_id: 'biz-1',
        user_id: 'user-1',
        role: 'owner',
        joined_at: '2025-01-01T00:00:00Z',
        profiles: { full_name: 'Juan Pérez' }
      },
      {
        business_id: 'biz-1',
        user_id: 'user-2',
        role: 'manager',
        joined_at: '2025-02-01T00:00:00Z',
        profiles: { full_name: 'Ana López' }
      }
    ]
    chain = createQueryChain({ data: memberRows, error: null })
    mockFrom.mockReturnValue(chain)

    // Mock del segundo call (resolve_member_emails RPC)
    mockRpc.mockResolvedValue({
      data: [
        { user_id: 'user-1', email: 'juan@test.com' },
        { user_id: 'user-2', email: 'ana@test.com' }
      ],
      error: null
    })

    const result = await fetchBusinessMembers('biz-1')

    expect(result).toHaveLength(2)
    expect(result[0].email).toBe('juan@test.com')
    expect(result[0].full_name).toBe('Juan Pérez')
    expect(result[0].role).toBe('owner')
    expect(result[1].email).toBe('ana@test.com')
    expect(result[1].role).toBe('manager')
  })

  it('propaga errores de la consulta', async () => {
    chain = createQueryChain({ data: null, error: { message: 'RLS denied' } })
    mockFrom.mockReturnValue(chain)

    await expect(fetchBusinessMembers('biz-1')).rejects.toThrow('RLS denied')
  })

  it('maneja email no disponible gracefully', async () => {
    chain = createQueryChain({
      data: [
        {
          business_id: 'biz-1',
          user_id: 'user-1',
          role: 'owner',
          joined_at: '2025-01-01T00:00:00Z',
          profiles: { full_name: 'Juan' }
        }
      ],
      error: null
    })
    mockFrom.mockReturnValue(chain)
    mockRpc.mockResolvedValue({ data: [], error: null })

    const result = await fetchBusinessMembers('biz-1')
    expect(result[0].email).toBe('(email no disponible)')
  })
})

describe('addBusinessMember', () => {
  it('happy path: inserta un manager', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await addBusinessMember('biz-1', 'user-2')

    expect(mockFrom).toHaveBeenCalledWith('business_members')
    expect(chain.insert).toHaveBeenCalledWith({
      business_id: 'biz-1',
      user_id: 'user-2',
      role: 'manager'
    })
  })

  it('propaga errores de duplicado', async () => {
    chain = createQueryChain({
      data: null,
      error: { message: 'duplicate key value violates unique constraint' }
    })
    mockFrom.mockReturnValue(chain)

    await expect(addBusinessMember('biz-1', 'user-2')).rejects.toThrow(
      'duplicate key'
    )
  })
})

describe('removeBusinessMember', () => {
  it('happy path: elimina un miembro', async () => {
    chain = createQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await removeBusinessMember('biz-1', 'user-2')

    expect(mockFrom).toHaveBeenCalledWith('business_members')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('business_id', 'biz-1')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-2')
  })

  it('propaga errores de último owner', async () => {
    chain = createQueryChain({
      data: null,
      error: { message: 'El negocio debe conservar al menos un owner.' }
    })
    mockFrom.mockReturnValue(chain)

    await expect(removeBusinessMember('biz-1', 'user-1')).rejects.toThrow(
      'owner'
    )
  })
})

describe('findUserByEmailForInvite', () => {
  it('happy path: encuentra usuario por email', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          user_id: 'user-3',
          email: 'persona@test.com',
          full_name: 'Persona Test'
        }
      ],
      error: null
    })

    const result = await findUserByEmailForInvite('persona@test.com')

    expect(result).not.toBeNull()
    expect(result?.user_id).toBe('user-3')
    expect(result?.email).toBe('persona@test.com')
    expect(result?.full_name).toBe('Persona Test')
  })

  it('retorna null si no encuentra', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const result = await findUserByEmailForInvite('noexiste@test.com')
    expect(result).toBeNull()
  })

  it('propaga errores de la RPC', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Sin permisos' }
    })

    await expect(findUserByEmailForInvite('persona@test.com')).rejects.toThrow(
      'Sin permisos'
    )
  })
})
