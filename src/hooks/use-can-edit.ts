import { useLocation } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import { isDemoPath } from '@/lib/demo'

/**
 * Devuelve true si el usuario actual es owner del negocio.
 * Solo el owner puede editar canchas, horarios y configuración.
 * Los managers pueden ver pero no modificar.
 * En la demostración pública (/demo/*) se habilita la edición para
 * que el visitante pueda explorar los formularios — los cambios solo
 * viven en memoria y no tocan datos reales.
 */
export function useCanEdit(): boolean {
  const isOwner = useAuthStore((s) => s.isOwner)
  const [location] = useLocation()
  if (isDemoPath(location)) return true
  return isOwner
}
