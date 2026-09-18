import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { countUnread } from '@/lib/notifications'
import {
  archiveNotification,
  archiveReadNotifications,
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '@/services/notifications'
import type { AppNotification } from '@/types'

/**
 * Bandeja de notificaciones in-app del usuario.
 * Carga vía RPC y se refresca con Realtime sobre push_notification_outbox.
 */
export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unreadCount = countUnread(notifications)

  // Badging API: el icono de la PWA refleja las sin leer.
  // Solo aplica a la app instalada (standalone); en pestaña es no-op.
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return
    if (!userId || unreadCount === 0) {
      void navigator.clearAppBadge?.().catch(() => {})
    } else {
      void navigator.setAppBadge?.(unreadCount).catch(() => {})
    }
  }, [userId, unreadCount])

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      return
    }
    setLoading(true)
    try {
      const data = await fetchMyNotifications()
      setNotifications(data)
      setError(null)
    } catch {
      setError('No pudimos cargar tus notificaciones.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    void refreshRef.current()
  }, [refresh])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'push_notification_outbox',
          filter: `user_id=eq.${userId}`
        },
        () => {
          void refreshRef.current()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const runMutation = useCallback(
    async (
      apply: (list: AppNotification[]) => AppNotification[],
      call: () => Promise<unknown>
    ) => {
      setNotifications((list) => apply(list))
      try {
        await call()
      } catch {
        setError('No pudimos actualizar tus notificaciones.')
        await refresh()
      }
    },
    [refresh]
  )

  const markRead = useCallback(
    (id: string) =>
      runMutation(
        (list) =>
          list.map((n) =>
            n.id === id && n.read_at === null
              ? { ...n, read_at: new Date().toISOString() }
              : n
          ),
        () => markNotificationRead(id)
      ),
    [runMutation]
  )

  const markAllRead = useCallback(
    () =>
      runMutation(
        (list) =>
          list.map((n) =>
            n.read_at === null
              ? { ...n, read_at: new Date().toISOString() }
              : n
          ),
        () => markAllNotificationsRead()
      ),
    [runMutation]
  )

  const archive = useCallback(
    (id: string) =>
      runMutation(
        (list) => list.filter((n) => n.id !== id),
        () => archiveNotification(id)
      ),
    [runMutation]
  )

  const archiveRead = useCallback(
    () =>
      runMutation(
        (list) => list.filter((n) => n.read_at === null),
        () => archiveReadNotifications()
      ),
    [runMutation]
  )

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    archive,
    archiveRead
  }
}
