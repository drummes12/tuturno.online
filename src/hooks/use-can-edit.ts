import { useAuthStore } from '@/stores/auth'

/**
 * Devuelve true si el usuario actual es owner del negocio.
 * Solo el owner puede editar canchas, horarios y configuración.
 * Los managers pueden ver pero no modificar.
 */
export function useCanEdit(): boolean {
  return useAuthStore((s) => s.isOwner)
}
