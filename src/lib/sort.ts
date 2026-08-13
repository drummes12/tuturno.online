import type { Reservation } from '@/types'
import { parseISO, isAfter } from 'date-fns'

/**
 * Ordena reservas en 3 grupos prioritarios:
 * 1. Pendientes (más antiguas primero — las que más urgencia tienen)
 * 2. Próximas (futuras, ordenadas por proximidad — la más cercana primero)
 * 3. Vencidas/pasadas (más recientes primero)
 *
 * Dentro de cada grupo, el orden secundario respeta la urgencia temporal.
 */
export function sortReservationsByPriority(items: Reservation[]): Reservation[] {
  const now = new Date()

  const pending = items
    .filter((r) => r.status === 'pending')
    .sort((a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime())

  const confirmed = items
    .filter((r) => r.status === 'confirmed')
    .sort(
      (a, b) =>
        parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime()
    )

  const upcoming = items
    .filter((r) => {
      const start = parseISO(r.starts_at)
      return (
        isAfter(start, now) &&
        r.status !== 'pending' &&
        r.status !== 'confirmed'
      )
    })
    .sort((a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime())

  const past = items
    .filter((r) => {
      const start = parseISO(r.starts_at)
      return !isAfter(start, now) || ['completed', 'cancelled_by_client', 'cancelled_by_business', 'rejected', 'expired'].includes(r.status)
    })
    .sort((a, b) => parseISO(b.starts_at).getTime() - parseISO(a.starts_at).getTime())

  return [...pending, ...confirmed, ...upcoming, ...past]
}
