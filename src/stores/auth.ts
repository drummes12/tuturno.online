import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { signOut as signOutService } from '@/services/auth'
import { fetchBusinessMemberships } from '@/services/profiles'
import { fetchIsPlatformAdmin } from '@/services/platform'
import { removeCurrentPushSubscription } from '@/services/push'
import type { Profile } from '@/types'
import type { BusinessMembership } from '@/services/profiles'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  isOwner: boolean
  isPlatformAdmin: boolean
  loading: boolean
  error: string | null
  memberships: BusinessMembership[]
  activeBusinessId: string | null
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setIsAdmin: (isAdmin: boolean) => void
  setIsOwner: (isOwner: boolean) => void
  setIsPlatformAdmin: (isPlatformAdmin: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setMemberships: (memberships: BusinessMembership[]) => void
  setActiveBusinessId: (businessId: string | null) => void
  refreshMemberships: (userId: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isOwner: false,
  isPlatformAdmin: false,
  loading: true,
  error: null,
  memberships: [],
  activeBusinessId: null,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setIsOwner: (isOwner) => set({ isOwner }),
  setIsPlatformAdmin: (isPlatformAdmin) => set({ isPlatformAdmin }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setMemberships: (memberships) =>
    set((state) => ({
      memberships,
      activeBusinessId: memberships.some(
        (m) => m.businessId === state.activeBusinessId
      )
        ? state.activeBusinessId
        : memberships.length > 0
          ? memberships[0].businessId
          : null
    })),
  setActiveBusinessId: (businessId) => set({ activeBusinessId: businessId }),
  refreshMemberships: async (userId) => {
    const [memberships, isPlatformAdmin] = await Promise.all([
      fetchBusinessMemberships(userId),
      fetchIsPlatformAdmin()
    ])
    set((state) => ({
      memberships,
      isAdmin: memberships.length > 0,
      isOwner: memberships.some((m) => m.role === 'owner'),
      isPlatformAdmin,
      activeBusinessId: memberships.some(
        (m) => m.businessId === state.activeBusinessId
      )
        ? state.activeBusinessId
        : memberships.length > 0
          ? memberships[0].businessId
          : null
    }))
  },
  signOut: async () => {
    try {
      // La revocación push es best-effort: con mala red no debe
      // bloquear el cierre de sesión.
      await Promise.race([
        removeCurrentPushSubscription(),
        new Promise((resolve) => setTimeout(resolve, 4000))
      ])
    } catch (error) {
      console.warn('[TuTurno] No se pudo revocar la suscripción push:', error)
    }
    try {
      // Igual con el signOut remoto: si la red no responde, se limpia
      // la sesión local de todas formas.
      await Promise.race([
        signOutService(),
        new Promise((resolve) => setTimeout(resolve, 5000))
      ])
    } catch (error) {
      console.warn('[TuTurno] signOut remoto falló:', error)
    }
    set({
      session: null,
      user: null,
      profile: null,
      isAdmin: false,
      isOwner: false,
      isPlatformAdmin: false,
      memberships: [],
      activeBusinessId: null
    })
  }
}))
