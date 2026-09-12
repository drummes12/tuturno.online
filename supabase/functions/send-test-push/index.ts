import '@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'
import * as webpush from '@negrel/webpush'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth_key: string
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })
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

function importVapidKeys() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('Faltan VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY')
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

  return webpush.importVapidKeys(
    {
      publicKey: { kty: 'EC', crv: 'P-256', x, y },
      privateKey: { kty: 'EC', crv: 'P-256', x, y, d }
    },
    { extractable: false }
  )
}

let applicationServerPromise: Promise<webpush.ApplicationServer> | null = null

function getApplicationServer() {
  if (!VAPID_SUBJECT) {
    throw new Error('Falta VAPID_SUBJECT')
  }

  applicationServerPromise ??= importVapidKeys().then((vapidKeys) =>
    webpush.ApplicationServer.new({
      contactInformation: VAPID_SUBJECT,
      vapidKeys
    })
  )

  return applicationServerPromise
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim() || null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Falta configuración de Supabase' }, 500)
  }

  const accessToken = getBearerToken(request)
  if (!accessToken) {
    return jsonResponse({ error: 'No autenticado' }, 401)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(accessToken)

  if (userError || !user) {
    return jsonResponse({ error: 'Sesión inválida' }, 401)
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('user_id', user.id)
    .is('revoked_at', null)

  if (error) {
    console.error('push subscription query failed:', error.message)
    return jsonResponse({ error: 'No pudimos cargar tus suscripciones' }, 500)
  }

  const subscriptions = (data ?? []) as PushSubscriptionRow[]
  if (subscriptions.length === 0) {
    return jsonResponse({ error: 'No tienes dispositivos registrados' }, 404)
  }

  const applicationServer = await getApplicationServer()
  const payload = JSON.stringify({
    title: 'TuTurno',
    body: 'Esta es una notificación push de prueba.',
    url: '/notificaciones',
    tag: 'tuturno-test'
  })

  let sent = 0
  let revoked = 0
  let failed = 0

  for (const subscription of subscriptions) {
    try {
      const subscriber = applicationServer.subscribe({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth_key
        }
      })

      await subscriber.pushTextMessage(payload, {
        ttl: 300,
        urgency: webpush.Urgency.High
      })
      sent++
    } catch (error) {
      if (error instanceof webpush.PushMessageError && error.isGone()) {
        await supabase
          .from('push_subscriptions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', subscription.id)
        revoked++
        continue
      }

      console.error('push delivery failed:', {
        subscription_id: subscription.id,
        error: String(error)
      })
      failed++
    }
  }

  return jsonResponse({ sent, revoked, failed }, failed > 0 ? 502 : 200)
})
