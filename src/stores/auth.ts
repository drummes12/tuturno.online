import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { signOut as signOutService } from '@/services/auth'
import type { Profile } from '@/types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  isOwner: boolean
  loading: boolean
  error: string | null
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setIsAdmin: (isAdmin: boolean) => void
  setIsOwner: (isOwner: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isOwner: false,
  loading: true,
  error: null,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setIsOwner: (isOwner) => set({ isOwner }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  signOut: async () => {
    await signOutService()
    set({
      session: null,
      user: null,
      profile: null,
      isAdmin: false,
      isOwner: false
    })
  }
}))
