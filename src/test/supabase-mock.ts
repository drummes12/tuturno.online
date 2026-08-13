import { vi } from 'vitest'

/**
 * Builder para crear query chains mock de Supabase.
 * Soporta: select, insert, update, delete, eq, neq, gte, lte,
 * order, limit, maybeSingle, single, not, select().
 *
 * Uso:
 *   const chain = createQueryChain({ data: [...], error: null })
 *   mockSupabase.from.mockReturnValue(chain)
 */
export function createQueryChain(result: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result)
  }
  // select() sin args también debe resolver al resultado cuando es el final
  chain.select = vi.fn(() => chain)
  // Permite `await chain` (sin .single()/.maybeSingle()) resolviendo al resultado,
  // tal como lo hace el cliente real de Supabase al finalizar una query.
  chain.then = (resolve: (value: any) => any) => resolve(result)
  return chain
}

/**
 * Crea un mock completo del cliente Supabase.
 *
 * Uso:
 *   const { mockSupabase, mockFrom, mockRpc } = createSupabaseMock()
 *   vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))
 *   mockFrom.mockReturnValue(createQueryChain({ data: [...], error: null }))
 */
export function createSupabaseMock() {
  const mockFrom = vi.fn()
  const mockRpc = vi.fn()
  const mockChannel: any = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis()
  }
  const mockRemoveChannel = vi.fn()
  const mockAuth: any = {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn()
  }

  const mockSupabase = {
    from: mockFrom,
    rpc: mockRpc,
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: mockRemoveChannel,
    auth: mockAuth
  }

  return {
    mockSupabase,
    mockFrom,
    mockRpc,
    mockChannel,
    mockRemoveChannel,
    mockAuth
  }
}
