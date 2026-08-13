import { supabase } from '@/lib/supabase'
import type { Reservation, ReservationStatus } from '@/types'

const RESERVATION_SELECT = '*, court:courts(*), profile:profiles!reservations_user_id_fkey(*)'

export async function fetchPendingReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .eq('status', 'pending')
    .order('starts_at', { ascending: true })
  if (error) throw error
  return data as Reservation[]
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
  return data as Reservation[]
}

export async function fetchReservationsByDate(
  start: string,
  end: string,
  status?: ReservationStatus | 'all'
): Promise<Reservation[]> {
  let query = supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .gte('starts_at', start)
    .lte('starts_at', end)
    .order('starts_at', { ascending: true })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Reservation[]
}

export async function fetchUserReservations(userId: string): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, court:courts(*)')
    .eq('user_id', userId)
    .order('starts_at', { ascending: false })
  if (error) throw error
  return data as Reservation[]
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
  courtId: string,
  startsAt: string,
  notes: string | null
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('create_reservation', {
    p_court_id: courtId,
    p_starts_at: startsAt,
    p_notes: notes,
  })
  if (error) throw error
  return { error: data?.error ?? null }
}

export async function createReservationAdmin(
  courtId: string,
  startsAt: string,
  clientName: string | null,
  clientPhone: string | null,
  notes: string | null
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('create_reservation_admin', {
    p_court_id: courtId,
    p_starts_at: startsAt,
    p_client_name: clientName,
    p_client_phone: clientPhone,
    p_notes: notes,
  })
  if (error) throw error
  return { error: data?.error ?? null }
}
