import { useCallback, useEffect, useState } from 'react'
import {
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  type NotificationPermissionState
} from '@/lib/push'
import { savePushSubscription } from '@/services/push'

const DENIED_NOTICE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

function deniedNoticeKey(userId: string) {
  return `tuturno:push-denied-notice:${userId}`
}

function canShowDeniedNotice(userId: string) {
  try {
    const lastShown = Number(localStorage.getItem(deniedNoticeKey(userId)))
    return !lastShown || Date.now() - lastShown >= DENIED_NOTICE_INTERVAL_MS
  } catch {
    return true
  }
}

function markDeniedNoticeShown(userId: string) {
  try {
    localStorage.setItem(deniedNoticeKey(userId), String(Date.now()))
  } catch {
    return
  }
}

export function usePushNotifications(userId: string | null) {
  const [permission, setPermission] = useState<NotificationPermissionState>(
    () => getNotificationPermission()
  )
  const [busy, setBusy] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [deniedNoticeVisible, setDeniedNoticeVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncSubscription = useCallback(async () => {
    const subscription = await subscribeToPush()
    await savePushSubscription(subscription)
    setRegistered(true)
  }, [])

  useEffect(() => {
    const nextPermission = getNotificationPermission()
    setPermission(nextPermission)
    setRegistered(false)
    setDismissed(false)
    setError(null)
    setDeniedNoticeVisible(
      Boolean(
        userId && nextPermission === 'denied' && canShowDeniedNotice(userId)
      )
    )

    if (userId && nextPermission === 'granted') {
      void syncSubscription().catch(() => undefined)
    }
  }, [syncSubscription, userId])

  const requestAndRegister = useCallback(async () => {
    setBusy(true)
    setError(null)

    try {
      const nextPermission = await requestNotificationPermission()
      setPermission(nextPermission)

      if (nextPermission === 'granted') {
        await syncSubscription()
      } else if (nextPermission === 'denied' && userId) {
        markDeniedNoticeShown(userId)
        setDeniedNoticeVisible(true)
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos activar las notificaciones.'
      )
    } finally {
      setBusy(false)
    }
  }, [syncSubscription, userId])

  const dismiss = useCallback(() => {
    if (permission === 'denied' && userId) {
      markDeniedNoticeShown(userId)
      setDeniedNoticeVisible(false)
    }
    setDismissed(true)
  }, [permission, userId])

  const showPrompt = Boolean(
    userId &&
    !registered &&
    !dismissed &&
    ((permission === 'default' && !error) ||
      (permission === 'denied' && deniedNoticeVisible))
  )

  return {
    permission,
    busy,
    registered,
    error,
    showPrompt,
    requestAndRegister,
    dismiss
  }
}

export type PushNotificationState = ReturnType<typeof usePushNotifications>
