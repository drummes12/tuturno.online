import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { signOut as signOutService } from '@/services/auth'
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
    set({
      memberships,
      activeBusinessId:
        memberships.length > 0 ? memberships[0].businessId : null
    }),
  setActiveBusinessId: (businessId) => set({ activeBusinessId: businessId }),
  signOut: async () => {
    await signOutService()
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
