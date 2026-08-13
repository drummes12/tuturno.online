import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  signOut
} from '@/services/auth'

const { mockFrom, mockRpc, mockAuth } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockAuth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn()
  }
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc, auth: mockAuth }
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('signInWithEmail', () => {
  it('happy path: llama a signInWithPassword con email normalizado y password', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: {}, error: null })

    await expect(
      signInWithEmail('  User@Example.COM ', 'secret123')
    ).resolves.toBeUndefined()

    expect(mockAuth.signInWithPassword).toHaveBeenCalledTimes(1)
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123'
    })
  })

  it('normaliza el email con trim y toLowerCase', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: {}, error: null })

    await signInWithEmail('  JUAN@TEST.IO  ', 'pass')

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'juan@test.io',
      password: 'pass'
    })
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Invalid credentials', status: 400 }
    mockAuth.signInWithPassword.mockResolvedValue({
      data: null,
      error: supabaseError
    })

    await expect(
      signInWithEmail('user@example.com', 'wrongpass')
    ).rejects.toEqual(supabaseError)
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'wrongpass'
    })
  })
})

describe('signUpWithEmail', () => {
  it('happy path: retorna { user, session } desde la respuesta de signUp', async () => {
    const mockUser = { id: 'user-1', email: 'juan@test.io' }
    const mockSession = {
      access_token: 'token-abc',
      refresh_token: 'refresh-xyz'
    }
    mockAuth.signUp.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null
    })

    const result = await signUpWithEmail(
      '  Juan@Test.IO  ',
      'secret123',
      '  Juan Pérez  ',
      '  +57 300 000 0000  '
    )

    expect(result).toEqual({ user: mockUser, session: mockSession })
    expect(mockAuth.signUp).toHaveBeenCalledTimes(1)
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'juan@test.io',
      password: 'secret123',
      options: {
        data: { full_name: 'Juan Pérez', phone: '+57 300 000 0000' }
      }
    })
  })

  it('retorna { user: null, session: null } cuando no hay sesión activa', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1' }, session: null },
      error: null
    })

    const result = await signUpWithEmail('a@b.io', 'pass', 'Name', '300')

    expect(result).toEqual({ user: { id: 'user-1' }, session: null })
  })

  it('normaliza email y recorta full_name y phone en options.data', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null
    })

    await signUpWithEmail('  A@B.IO ', 'pass', '  Ana  ', '  3001112222  ')

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'a@b.io',
      password: 'pass',
      options: {
        data: { full_name: 'Ana', phone: '3001112222' }
      }
    })
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'User already registered', status: 400 }
    mockAuth.signUp.mockResolvedValue({ data: null, error: supabaseError })

    await expect(
      signUpWithEmail('a@b.io', 'pass', 'Ana', '300')
    ).rejects.toEqual(supabaseError)
  })
})

describe('resetPassword', () => {
  it('happy path: llama a resetPasswordForEmail con email normalizado y redirectTo', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    await expect(resetPassword('  User@Example.COM ')).resolves.toBeUndefined()

    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledTimes(1)
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      {
        redirectTo: `${window.location.origin}/recuperar-password`
      }
    )
  })

  it('error path: lanza cuando supabase retorna error', async () => {
    const supabaseError = { message: 'Rate limit exceeded', status: 429 }
    mockAuth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: supabaseError
    })

    await expect(resetPassword('user@example.com')).rejects.toEqual(
      supabaseError
    )
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      { redirectTo: `${window.location.origin}/recuperar-password` }
    )
  })
})

describe('signOut', () => {
  it('happy path: llama a auth.signOut', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null })

    await signOut()

    expect(mockAuth.signOut).toHaveBeenCalledTimes(1)
  })

  it('no lanza aunque signOut retorne error (lo ignora)', async () => {
    // signOut() no verifica el error retornado
    mockAuth.signOut.mockResolvedValue({ error: { message: 'fail' } })

    await expect(signOut()).resolves.toBeUndefined()
    expect(mockAuth.signOut).toHaveBeenCalledTimes(1)
  })
})
