import { useLocation } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import { DEMO_BUSINESS_ID, isDemoPath } from '@/lib/demo'

/**
 * Hook para obtener el business_id activo del admin actual.
 * Usa el negocio seleccionado desde el store (selector de negocio).
 * En las rutas públicas de demostración (/demo/*) devuelve el
 * sentinel DEMO_BUSINESS_ID para que los servicios respondan con
 * el dataset ficticio en memoria.
 */
export function useBusinessId() {
  const { activeBusinessId } = useAuthStore()
  const [location] = useLocation()
  if (isDemoPath(location)) return DEMO_BUSINESS_ID
  return activeBusinessId
}
