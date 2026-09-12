import type { AppNotification } from '@/types'

function text(
  payload: Record<string, unknown>,
  key: string,
  fallback = ''
): string {
  return typeof payload[key] === 'string' ? (payload[key] as string) : fallback
}

/**
 * Replica los títulos y cuerpos que genera la Edge Function
 * `send-push-notifications` para cada tipo de notificación.
 */
export function describeNotification(n: AppNotification): {
  title: string
  body: string
} {
  const businessName = text(n.payload, 'business_name', 'Tu negocio')
  const resourceName = text(n.payload, 'resource_name', 'tu espacio')

  const messages: Record<string, { title: string; body: string }> = {
    reservation_created_client: {
      title: 'Reserva creada',
      body: `Tu solicitud para ${resourceName} en ${businessName} fue creada.`
    },
    reservation_created_business: {
      title: 'Nueva reserva',
      body: `Hay una nueva solicitud para ${resourceName} en ${businessName}.`
    },
    reservation_created_by_business: {
      title: 'Reserva creada',
      body: `Se creó una reserva para ${resourceName} en ${businessName}.`
    },
    reservation_confirmed: {
      title: 'Reserva confirmada',
      body: `Tu reserva de ${resourceName} en ${businessName} fue confirmada.`
    },
    reservation_rejected: {
      title: 'Reserva rechazada',
      body: `Tu reserva de ${resourceName} en ${businessName} fue rechazada.`
    },
    reservation_cancelled_client: {
      title: 'Reserva cancelada',
      body: `Cancelaste tu reserva de ${resourceName} en ${businessName}.`
    },
    reservation_cancelled_business: {
      title: 'Reserva cancelada',
      body: `Una reserva de ${resourceName} en ${businessName} fue cancelada por el cliente.`
    },
    reservation_cancelled_by_business: {
      title: 'Reserva cancelada por el negocio',
      body: `Tu reserva de ${resourceName} en ${businessName} fue cancelada.`
    },
    reservation_expired: {
      title: 'Reserva expirada',
      body: `La solicitud para ${resourceName} en ${businessName} expiró.`
    }
  }

  return (
    messages[n.type] ?? {
      title: 'Actualización de TuTurno',
      body: 'Tienes una novedad en una de tus reservas.'
    }
  )
}

/** Deep link interno del payload; null si no es una ruta de la app. */
export function getNotificationUrl(n: AppNotification): string | null {
  const url = n.payload.url
  return typeof url === 'string' && url.startsWith('/') ? url : null
}

export function isNotificationUnread(n: AppNotification): boolean {
  return n.read_at === null
}

/** La reserva asociada aún espera acción del negocio o del cliente. */
export function isNotificationPending(n: AppNotification): boolean {
  return n.reservation_status === 'pending'
}

export type NotificationState = 'pending' | 'unread' | 'read'

export function getNotificationState(n: AppNotification): NotificationState {
  if (isNotificationPending(n)) return 'pending'
  if (isNotificationUnread(n)) return 'unread'
  return 'read'
}

export function countUnread(list: AppNotification[]): number {
  return list.filter(isNotificationUnread).length
}
