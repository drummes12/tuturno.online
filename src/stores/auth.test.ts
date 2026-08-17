import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSignOut, mockFetchBusinessMemberships, mockFetchIsPlatformAdmin } =
  vi.hoisted(() => ({
    mockSignOut: vi.fn(),
    mockFetchBusinessMemberships: vi.fn(),
    mockFetchIsPlatformAdmin: vi.fn()
  }))

vi.mock('@/services/auth', () => ({
  signOut: mockSignOut
}))

vi.mock('@/services/profiles', () => ({
  fetchBusinessMemberships: mockFetchBusinessMemberships
}))

vi.mock('@/services/platform', () => ({
  fetchIsPlatformAdmin: mockFetchIsPlatformAdmin
}))

import { useAuthStore } from '@/stores/auth'

beforeEach(() => {
  vi.clearAllMocks()
  // Reset store to initial state
  useAuthStore.setState({
    session: null,
    user: null,
    profile: null,
    isAdmin: false,
    isOwner: false,
    isPlatformAdmin: false,
    loading: true,
    error: null,
    memberships: [],
    activeBusinessId: null
  })
})

describe('useAuthStore', () => {
  it('tiene estado inicial correcto', () => {
    const state = useAuthStore.getState()
    expect(state.session).toBeNull()
    expect(state.user).toBeNull()
    expect(state.profile).toBeNull()
    expect(state.isAdmin).toBe(false)
    expect(state.loading).toBe(true)
    expect(state.error).toBeNull()
  })

  it('setSession establece session y user', () => {
    const mockUser = { id: 'user-1' } as any
    const mockSession = { user: mockUser } as any
    useAuthStore.getState().setSession(mockSession)
    const state = useAuthStore.getState()
    expect(state.session).toBe(mockSession)
    expect(state.user).toBe(mockUser)
  })

  it('setSession con null limpia user', () => {
    useAuthStore.getState().setSession({ user: { id: 'x' } } as any)
    useAuthStore.getState().setSession(null)
    expect(useAuthStore.getState().session).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setProfile establece el perfil', () => {
    const profile = {
      id: '1',
      full_name: 'Test',
      phone: null,
      phone_verified: false,
      created_at: '',
      updated_at: ''
    }
    useAuthStore.getState().setProfile(profile)
    expect(useAuthStore.getState().profile).toBe(profile)
  })

  it('setIsAdmin establece el flag', () => {
    useAuthStore.getState().setIsAdmin(true)
    expect(useAuthStore.getState().isAdmin).toBe(true)
  })

  it('setLoading establece el flag', () => {
    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().loading).toBe(false)
  })

  it('setError establece el error', () => {
    useAuthStore.getState().setError('algo salió mal')
    expect(useAuthStore.getState().error).toBe('algo salió mal')
  })

  it('signOut llama al servicio y limpia el estado', async () => {
    mockSignOut.mockResolvedValue(undefined)
    // Llenar el estado primero
    useAuthStore.getState().setSession({ user: { id: 'x' } } as any)
    useAuthStore.getState().setIsAdmin(true)
    useAuthStore.getState().setProfile({ id: '1' } as any)

    await useAuthStore.getState().signOut()

    expect(mockSignOut).toHaveBeenCalledTimes(1)
    const state = useAuthStore.getState()
    expect(state.session).toBeNull()
    expect(state.user).toBeNull()
    expect(state.profile).toBeNull()
    expect(state.isAdmin).toBe(false)
    expect(state.memberships).toEqual([])
    expect(state.activeBusinessId).toBeNull()
  })

  it('setMemberships establece memberships y el primer business como activo', () => {
    const memberships = [
      {
        businessId: 'biz-1',
        businessName: 'Negocio 1',
        slug: 'negocio-1',
        role: 'owner' as const
      },
      {
        businessId: 'biz-2',
        businessName: 'Negocio 2',
        slug: 'negocio-2',
        role: 'manager' as const
      }
    ]
    useAuthStore.getState().setMemberships(memberships)
    const state = useAuthStore.getState()
    expect(state.memberships).toEqual(memberships)
    expect(state.activeBusinessId).toBe('biz-1')
  })

  it('setMemberships con array vacío limpia el activeBusinessId', () => {
    useAuthStore.getState().setMemberships([
      {
        businessId: 'biz-1',
        businessName: 'Negocio 1',
        slug: 'negocio-1',
        role: 'owner' as const
      }
    ])
    useAuthStore.getState().setMemberships([])
    expect(useAuthStore.getState().activeBusinessId).toBeNull()
  })

  it('setActiveBusinessId cambia el negocio activo', () => {
    useAuthStore.getState().setMemberships([
      {
        businessId: 'biz-1',
        businessName: 'Negocio 1',
        slug: 'negocio-1',
        role: 'owner' as const
      },
      {
        businessId: 'biz-2',
        businessName: 'Negocio 2',
        slug: 'negocio-2',
        role: 'owner' as const
      }
    ])
    useAuthStore.getState().setActiveBusinessId('biz-2')
    expect(useAuthStore.getState().activeBusinessId).toBe('biz-2')
  })

  describe('refreshMemberships', () => {
    it('carga memberships, isAdmin, isOwner, isPlatformAdmin y activeBusinessId', async () => {
      const memberships = [
        {
          businessId: 'biz-1',
          businessName: 'Negocio 1',
          slug: 'negocio-1',
          role: 'owner' as const
        }
      ]
      mockFetchBusinessMemberships.mockResolvedValue(memberships)
      mockFetchIsPlatformAdmin.mockResolvedValue(true)

      await useAuthStore.getState().refreshMemberships('user-1')

      expect(mockFetchBusinessMemberships).toHaveBeenCalledWith('user-1')
      expect(mockFetchIsPlatformAdmin).toHaveBeenCalledTimes(1)
      const state = useAuthStore.getState()
      expect(state.memberships).toEqual(memberships)
      expect(state.isAdmin).toBe(true)
      expect(state.isOwner).toBe(true)
      expect(state.isPlatformAdmin).toBe(true)
      expect(state.activeBusinessId).toBe('biz-1')
    })

    it('marca isAdmin=false cuando no hay memberships', async () => {
      mockFetchBusinessMemberships.mockResolvedValue([])
      mockFetchIsPlatformAdmin.mockResolvedValue(false)

      await useAuthStore.getState().refreshMemberships('user-1')

      const state = useAuthStore.getState()
      expect(state.isAdmin).toBe(false)
      expect(state.isOwner).toBe(false)
      expect(state.activeBusinessId).toBeNull()
    })

    it('marca isOwner=false cuando solo es manager', async () => {
      mockFetchBusinessMemberships.mockResolvedValue([
        {
          businessId: 'biz-1',
          businessName: 'Negocio 1',
          slug: 'negocio-1',
          role: 'manager' as const
        }
      ])
      mockFetchIsPlatformAdmin.mockResolvedValue(false)

      await useAuthStore.getState().refreshMemberships('user-1')

      const state = useAuthStore.getState()
      expect(state.isAdmin).toBe(true)
      expect(state.isOwner).toBe(false)
    })
  })
})
