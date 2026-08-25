import { supabase } from '@/lib/supabase'
import {
  filterReservations,
  uniqueReservations
} from '@/lib/reservation-status'
import type { Reservation, ReservationFilter } from '@/types'

const RESERVATION_SELECT =
  '*, resource:resources(*), profile:profiles!reservations_user_id_fkey(*), client:clients(*)'

export async function fetchPendingReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .eq('status', 'pending')
    .order('starts_at', { ascending: true })
  if (error) throw error
  return uniqueReservations((data ?? []) as Reservation[])
}

export async function fetchTodayReservations(start: string, end: string): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .gte('starts_at', start)
    .lte('starts_at', end)
    .neq('status', 'pending')
    .order('starts_at', { ascending: true })
  if (error) throw error
  return uniqueReservations((data ?? []) as Reservation[])
}

export async function fetchReservationsByDate(
  start: string,
  end: string,
  filter: ReservationFilter = 'all'
): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .gte('starts_at', start)
    .lte('starts_at', end)
    .order('starts_at', { ascending: true })

  if (error) throw error
  return filterReservations((data ?? []) as Reservation[], filter)
}

export async function fetchUserReservations(
  userId: string
): Promise<Reservation[]> {
  // Un usuario puede tener reservas de dos formas:
  // 1. user_id directo en reservations (reservas creadas por él mismo)
  // 2. client_id vinculado a un client cuyo user_id es este usuario
  //    (reservas creadas por el negocio cuando aún no tenía cuenta)
  //
  // PostgREST no soporta filtros anidados por FK dentro de .or(),
  // así que primero obtenemos los client_ids del usuario y luego
  // filtramos con or(user_id.eq.xxx, client_id.in.(...))

  const { data: userClients, error: clientsError } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', userId)
  if (clientsError) throw clientsError

  const clientIds = (userClients ?? []).map((c) => c.id)
  const orFilter =
    clientIds.length > 0
      ? `user_id.eq.${userId},client_id.in.(${clientIds.join(',')})`
      : `user_id.eq.${userId}`

  const { data, error } = await supabase
    .from('reservations')
    .select('*, resource:resources(*), client:clients(*)')
    .or(orFilter)
    .order('starts_at', { ascending: false })
  if (error) throw error
  return uniqueReservations((data ?? []) as Reservation[])
}

// RPC calls

export async function confirmReservation(reservationId: string): Promise<void> {
  const { error } = await supabase.rpc('confirm_reservation', {
    p_reservation_id: reservationId,
  })
  if (error) throw error
}

export async function rejectReservation(reservationId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('reject_reservation', {
    p_reservation_id: reservationId,
    p_reason: reason,
  })
  if (error) throw error
}

export async function cancelReservationByBusiness(reservationId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_reservation_by_business', {
    p_reservation_id: reservationId,
    p_reason: reason,
  })
  if (error) throw error
}

export async function cancelReservationByClient(reservationId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_reservation_by_client', {
    p_reservation_id: reservationId,
  })
  if (error) throw error
}

export async function createReservation(
  resourceId: string,
  startsAt: string,
  notes: string | null
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('create_reservation', {
    p_resource_id: resourceId,
    p_starts_at: startsAt,
    p_notes: notes
  })
  if (error) throw error
  return { error: data?.error ?? null }
}

export async function createReservationAdmin(
  resourceId: string,
  startsAt: string,
  options: {
    clientId?: string | null
    clientName?: string | null
    clientPhone?: string | null
    clientEmail?: string | null
    notes?: string | null
  }
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('create_reservation_admin', {
    p_resource_id: resourceId,
    p_starts_at: startsAt,
    p_client_id: options.clientId ?? null,
    p_client_name: options.clientName ?? null,
    p_client_phone: options.clientPhone ?? null,
    p_client_email: options.clientEmail ?? null,
    p_notes: options.notes ?? null
  })
  if (error) throw error
  return { error: data?.error ?? null }
}
