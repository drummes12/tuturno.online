import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn()
}))
vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc }
}))

import { searchClients } from '@/services/clients'
import type { ClientSearchResult } from '@/types'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('searchClients', () => {
  it('no busca si el query tiene menos de 2 caracteres', async () => {
    const result = await searchClients('biz-1', 'a')
    expect(result).toEqual([])
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('llama al RPC search_clients con business_id y query', async () => {
    const mockResults: ClientSearchResult[] = [
      {
        id: 'client-1',
        name: 'Juan Pérez',
        phone: '3001234567',
        email: 'juan@email.com',
        user_id: 'user-1',
        has_account: true
      }
    ]
    mockRpc.mockResolvedValue({ data: mockResults, error: null })

    const result = await searchClients('biz-1', 'Juan')

    expect(result).toEqual(mockResults)
    expect(mockRpc).toHaveBeenCalledWith('search_clients', {
      p_business_id: 'biz-1',
      p_query: 'Juan'
    })
  })

  it('trim el query antes de enviarlo', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    await searchClients('biz-1', '  Juan  ')

    expect(mockRpc).toHaveBeenCalledWith('search_clients', {
      p_business_id: 'biz-1',
      p_query: 'Juan'
    })
  })

  it('lanza el error cuando el RPC retorna error', async () => {
    const rpcError = { message: 'permission denied', code: '42501' }
    mockRpc.mockResolvedValue({ data: null, error: rpcError })

    await expect(searchClients('biz-1', 'Juan')).rejects.toEqual(rpcError)
  })

  it('retorna resultados con has_account=false para guests', async () => {
    const mockResults: ClientSearchResult[] = [
      {
        id: 'client-2',
        name: 'Maria Lopez',
        phone: '3009876543',
        email: null,
        user_id: null,
        has_account: false
      }
    ]
    mockRpc.mockResolvedValue({ data: mockResults, error: null })

    const result = await searchClients('biz-1', 'Maria')

    expect(result).toEqual(mockResults)
    expect(result[0].has_account).toBe(false)
    expect(result[0].user_id).toBeNull()
  })
})
