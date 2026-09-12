import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'
import * as webpush from '@negrel/webpush'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')
const MAX_ATTEMPTS = 3
const PUSH_TTL_SECONDS = 2 * 60 * 60

type PushOutboxRow = {
  id: string
  user_id: string
  type: string
  payload: Record<string, unknown>
  attempts: number
}

type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth_key: string
}

function decodeBase64Url(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function encodeBase64Url(value: Uint8Array) {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function createApplicationServer() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    throw new Error('Faltan secrets VAPID')
  }

  const publicBytes = decodeBase64Url(VAPID_PUBLIC_KEY)
  const privateBytes = decodeBase64Url(VAPID_PRIVATE_KEY)

  if (publicBytes.length !== 65 || publicBytes[0] !== 4) {
    throw new Error('VAPID_PUBLIC_KEY no tiene formato P-256 válido')
  }

  if (privateBytes.length !== 32) {
    throw new Error('VAPID_PRIVATE_KEY no tiene formato P-256 válido')
  }

  const x = encodeBase64Url(publicBytes.slice(1, 33))
  const y = encodeBase64Url(publicBytes.slice(33, 65))
  const d = encodeBase64Url(privateBytes)
  const vapidKeys = await webpush.importVapidKeys(
    {
      publicKey: { kty: 'EC', crv: 'P-256', x, y },
      privateKey: { kty: 'EC', crv: 'P-256', x, y, d }
    },
    { extractable: false }
  )

  return webpush.ApplicationServer.new({
    contactInformation: VAPID_SUBJECT,
    vapidKeys
  })
}

function text(payload: Record<string, unknown>, key: string, fallback = '') {
  return typeof payload[key] === 'string' ? (payload[key] as string) : fallback
}

function buildMessage(row: PushOutboxRow) {
  const businessName = text(row.payload, 'business_name', 'Tu negocio')
  const resourceName = text(row.payload, 'resource_name', 'tu espacio')
  const reservationId = text(row.payload, 'reservation_id', row.id)
  const url = text(row.payload, 'url', '/')
  const reason = text(row.payload, 'reason')

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

  const message = messages[row.type] ?? {
    title: 'Actualización de TuTurno',
    body: 'Tienes una novedad en una de tus reservas.'
  }

  return JSON.stringify({
    ...message,
    url,
    tag: `${row.type}-${reservationId}`,
    ...(reason ? { reason } : {})
  })
}

const applicationServerPromise = createApplicationServer()

export default {
  fetch: withSupabase({ auth: ['secret'] }, async function (_request, context) {
    const supabase = context.supabaseAdmin
    const { data: pending, error } = await supabase
      .from('push_notification_outbox')
      .update({ status: 'processing' } as never)
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(50)
      .select('*')

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ sent: 0, failed: 0, revoked: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const applicationServer = await applicationServerPromise
    let sent = 0
    let failed = 0
    let revoked = 0

    for (const row of pending as PushOutboxRow[]) {
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth_key')
        .eq('user_id', row.user_id)
        .is('revoked_at', null)

      if (subscriptionsError || !subscriptions || subscriptions.length === 0) {
        await supabase
          .from('push_notification_outbox')
          .update({
            status: 'failed',
            attempts: row.attempts + 1,
            last_error: 'No active push subscriptions'
          } as never)
          .eq('id', row.id)
        failed++
        continue
      }

      let rowSent = 0
      let rowFailed = 0
      const payload = buildMessage(row)

      for (const subscription of subscriptions as PushSubscriptionRow[]) {
        try {
          const subscriber = applicationServer.subscribe({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth_key
            }
          })

          await subscriber.pushTextMessage(payload, {
            ttl: PUSH_TTL_SECONDS,
            urgency: webpush.Urgency.High
          })
          rowSent++
          sent++
        } catch (deliveryError) {
          if (
            deliveryError instanceof webpush.PushMessageError &&
            deliveryError.isGone()
          ) {
            await supabase
              .from('push_subscriptions')
              .update({ revoked_at: new Date().toISOString() } as never)
              .eq('id', subscription.id)
            revoked++
          } else {
            console.error('push delivery failed:', {
              outbox_id: row.id,
              subscription_id: subscription.id,
              error: String(deliveryError)
            })
            rowFailed++
          }
        }
      }

      if (rowSent > 0) {
        await supabase
          .from('push_notification_outbox')
          .update({
            status: 'sent',
            attempts: row.attempts + 1,
            sent_at: new Date().toISOString(),
            last_error:
              rowFailed > 0 ? `${rowFailed} delivery(ies) failed` : null
          } as never)
          .eq('id', row.id)
      } else {
        await supabase
          .from('push_notification_outbox')
          .update({
            status: row.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending',
            attempts: row.attempts + 1,
            last_error: 'No push delivery succeeded'
          } as never)
          .eq('id', row.id)
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, failed, revoked }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  })
}
