import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

/**
 * Hook para obtener el business_id del admin actual.
 * Busca en business_members la membresía del usuario.
 */
export function useBusinessId() {
  const { user } = useAuthStore()
  const [businessId, setBusinessId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      setBusinessId(data?.business_id ?? null)
    }
    load()
  }, [user])

  return businessId
}
