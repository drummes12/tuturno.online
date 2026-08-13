import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { fetchProfile, fetchBusinessId } from '@/services/profiles'
import type { Profile } from '@/types'

/**
 * Hook que mantiene la sesión, el perfil y el rol de admin sincronizados.
 * Se usa una sola vez en el nivel raíz de la app.
 */
export function useSession() {
  const { session, profile, isAdmin, loading, setSession, setProfile, setIsAdmin, setLoading } =
    useAuthStore()

  useEffect(() => {
    let mounted = true

    // Cargar sesión inicial
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)

      if (data.session?.user) {
        await loadProfileAndRole(data.session.user.id, setProfile, setIsAdmin)
      }

      setLoading(false)
    })

    // Escuchar cambios de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return
      setSession(newSession)

      if (newSession?.user) {
        await loadProfileAndRole(newSession.user.id, setProfile, setIsAdmin)
      } else {
        setProfile(null)
        setIsAdmin(false)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setSession, setProfile, setIsAdmin, setLoading])

  return { session, profile, isAdmin, loading }
}

async function loadProfileAndRole(
  userId: string,
  setProfile: (p: Profile | null) => void,
  setIsAdmin: (v: boolean) => void,
) {
  const profileData = await fetchProfile(userId)
  setProfile(profileData)

  const businessId = await fetchBusinessId(userId)
  setIsAdmin(!!businessId)
}
