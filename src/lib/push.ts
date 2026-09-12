export type NotificationPermissionState = NotificationPermission | 'unsupported'

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  )
}

export async function requestNotificationPermission() {
  if (getNotificationPermission() === 'unsupported') {
    throw new Error('Este navegador no soporta notificaciones.')
  }

  return Notification.requestPermission()
}

export async function getReadyServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Este navegador no soporta Service Workers.')
  }

  return navigator.serviceWorker.ready
}
