import { supabase } from '@/lib/supabase'
import type { AvailabilityException } from '@/types'

/**
 * Lee las excepciones de disponibilidad de un negocio,
 * ordenadas por fecha de inicio ascendente.
 */
export async function fetchAvailabilityExceptions(
  businessId: string
): Promise<AvailabilityException[]> {
  const { data, error } = await supabase
    .from('availability_exceptions')
    .select('*')
    .eq('business_id', businessId)
    .order('starts_at', { ascending: true })
  if (error) throw error
  return (data as AvailabilityException[]) ?? []
}

/**
 * Crea un cierre temporal.
 * - `courtId = null` aplica a todo el negocio.
 * - `courtId` con valor aplica solo a esa cancha.
 * - `type` siempre 'closed' en esta versión.
 */
export async function createAvailabilityException(opts: {
  businessId: string
  courtId: string | null
  startsAt: string // ISO UTC
  endsAt: string // ISO UTC
  reason?: string | null
  createdBy?: string | null
}): Promise<void> {
  if (new Date(opts.endsAt) <= new Date(opts.startsAt)) {
    throw new Error('La fecha de fin debe ser posterior a la de inicio')
  }

  const { error } = await supabase.from('availability_exceptions').insert({
    business_id: opts.businessId,
    court_id: opts.courtId,
    starts_at: opts.startsAt,
    ends_at: opts.endsAt,
    type: 'closed',
    reason: opts.reason?.trim() || null,
    created_by: opts.createdBy ?? null
  })
  if (error) throw error
}

/**
 * Elimina una excepción por ID.
 */
export async function deleteAvailabilityException(id: string): Promise<void> {
  const { error } = await supabase
    .from('availability_exceptions')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * Cuenta las reservas pending/confirmed que se solapan con un intervalo.
 * Si courtId es null, cuenta en todas las canchas del negocio.
 * Si courtId tiene valor, cuenta solo en esa cancha.
 *
 * Devuelve el número de reservas afectadas para mostrar una advertencia.
 */
export async function countOverlappingReservations(opts: {
  businessId: string
  courtId: string | null
  startsAt: string // ISO UTC
  endsAt: string // ISO UTC
}): Promise<number> {
  let query = supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', opts.businessId)
    .in('status', ['pending', 'confirmed'])
    .lt('starts_at', opts.endsAt)
    .gt('ends_at', opts.startsAt)

  if (opts.courtId) {
    query = query.eq('court_id', opts.courtId)
  }

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}
