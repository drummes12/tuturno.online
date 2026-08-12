import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
  error: string | null
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setIsAdmin: (isAdmin: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  error: null,
  setSession: (session) =>
    set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, isAdmin: false })
  },
}))
