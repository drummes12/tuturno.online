import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { fetchBusinessId } from '@/services/profiles'

/**
 * Hook para obtener el business_id del admin actual.
 */
export function useBusinessId() {
  const { user } = useAuthStore()
  const [businessId, setBusinessId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!user) return
      const id = await fetchBusinessId(user.id)
      setBusinessId(id)
    }
    load()
  }, [user])

  return businessId
}
