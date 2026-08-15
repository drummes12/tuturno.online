import { useState, useEffect } from 'react'
import { fetchBusinessBySlug } from '@/services/business'
import type { Business } from '@/types'

export type TenantState = {
  business: Business | null
  loading: boolean
  error: string | null
}

/**
 * Resolve a public tenant by slug.
 * Used by all public pages under /b/:slug.
 */
export function useTenant(slug: string | undefined): TenantState {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!slug) {
        setBusiness(null)
        setLoading(false)
        setError('Negocio no especificado')
        return
      }
      setLoading(true)
      setError(null)
      try {
        const data = await fetchBusinessBySlug(slug)
        if (cancelled) return
        if (!data) {
          setBusiness(null)
          setError('Negocio no encontrado')
        } else {
          setBusiness(data)
        }
      } catch {
        if (cancelled) return
        setBusiness(null)
        setError('No pudimos cargar el negocio')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  return { business, loading, error }
}
