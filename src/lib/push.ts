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

function decodeVapidPublicKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)

  return Uint8Array.from(rawData, (character) => character.charCodeAt(0))
}

function getVapidPublicKey() {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!publicKey) {
    throw new Error(
      'Falta VITE_VAPID_PUBLIC_KEY. Configúrala en el entorno del frontend y vuelve a desplegar.'
    )
  }

  return publicKey
}

export async function subscribeToPush() {
  const registration = await getReadyServiceWorker()
  const existingSubscription = await registration.pushManager.getSubscription()

  if (existingSubscription) return existingSubscription

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeVapidPublicKey(getVapidPublicKey())
  })
}
