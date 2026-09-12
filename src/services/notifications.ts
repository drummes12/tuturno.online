import { supabase } from '@/lib/supabase'
import type { AppNotification } from '@/types'

export async function fetchMyNotifications(
  limit = 50
): Promise<AppNotification[]> {
  const { data, error } = await supabase.rpc('list_my_notifications', {
    p_limit: limit
  })

  if (error) throw error
  return (data ?? []) as AppNotification[]
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.rpc('mark_notification_read', { p_id: id })
  if (error) throw error
}

export async function markReservationNotificationsRead(
  reservationId: string
): Promise<number> {
  const { data, error } = await supabase.rpc(
    'mark_reservation_notifications_read',
    { p_reservation_id: reservationId }
  )
  if (error) throw error
  return typeof data === 'number' ? data : 0
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data, error } = await supabase.rpc('mark_all_notifications_read')
  if (error) throw error
  return typeof data === 'number' ? data : 0
}

export async function archiveNotification(id: string): Promise<void> {
  const { error } = await supabase.rpc('archive_notification', { p_id: id })
  if (error) throw error
}

export async function archiveReadNotifications(): Promise<number> {
  const { data, error } = await supabase.rpc('archive_read_notifications')
  if (error) throw error
  return typeof data === 'number' ? data : 0
}
