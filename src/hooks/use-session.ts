import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { fetchProfile, fetchBusinessMembership } from '@/services/profiles'
import type { Profile } from '@/types'

/**
 * Hook que mantiene la sesión, el perfil y el rol de admin sincronizados.
 * Se usa una sola vez en el nivel raíz de la app.
 */
export function useSession() {
  const {
    session,
    profile,
    isAdmin,
    isOwner,
    loading,
    setSession,
    setProfile,
    setIsAdmin,
    setIsOwner,
    setLoading
  } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // Cargar sesión inicial
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)

      if (data.session?.user) {
        await loadProfileAndRole(
          data.session.user.id,
          setProfile,
          setIsAdmin,
          setIsOwner
        )
      }

      setLoading(false)
    })

    // Escuchar cambios de auth
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return

      // Cuando el usuario viene del enlace de recuperación de contraseña,
      // Supabase crea una sesión temporal y dispara PASSWORD_RECOVERY.
      // Redirigimos a /recuperar-password para que pueda establecer la nueva.
      if (
        event === 'PASSWORD_RECOVERY' &&
        window.location.pathname !== '/recuperar-password'
      ) {
        window.location.href = '/recuperar-password'
        return
      }

      setSession(newSession)

      if (newSession?.user) {
        await loadProfileAndRole(
          newSession.user.id,
          setProfile,
          setIsAdmin,
          setIsOwner
        )
      } else {
        setProfile(null)
        setIsAdmin(false)
        setIsOwner(false)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setSession, setProfile, setIsAdmin, setIsOwner, setLoading])

  return { session, profile, isAdmin, isOwner, loading }
}

async function loadProfileAndRole(
  userId: string,
  setProfile: (p: Profile | null) => void,
  setIsAdmin: (v: boolean) => void,
  setIsOwner: (v: boolean) => void
) {
  const profileData = await fetchProfile(userId)
  setProfile(profileData)

  const membership = await fetchBusinessMembership(userId)
  setIsAdmin(!!membership)
  setIsOwner(membership?.role === 'owner')
}
