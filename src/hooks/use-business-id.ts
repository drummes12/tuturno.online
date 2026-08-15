import { useAuthStore } from '@/stores/auth'

/**
 * Hook para obtener el business_id activo del admin actual.
 * Usa el negocio seleccionado desde el store (selector de negocio).
 */
export function useBusinessId() {
  const { activeBusinessId } = useAuthStore()
  return activeBusinessId
}
