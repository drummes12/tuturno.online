// Edge Function: procesa la bandeja de notificaciones y envía correos con Resend.
// Se ejecuta periódicamente (cron) o manualmente.
// Solo accesible con secret key (server-to-server / cron).

// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'
import { createTemplates, type TemplatePayload } from './templates.ts'
import { resolveBusinessWhatsApp } from './whatsapp.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL =
  Deno.env.get('RESEND_FROM_EMAIL') ?? 'hola@tuturno.online'
// URL pública del frontend. Configúrala en Supabase secrets:
//   supabase secrets set APP_URL=https://tuturno.online
const APP_URL = (Deno.env.get('APP_URL') ?? 'https://tuturno.online')
  .replace(/\/+$/, '')

interface OutboxRow {
  id: string
  type: string
  recipient_email: string
  recipient_name: string | null
  payload: Record<string, unknown>
  attempts: number
}

type ReservationLookup = {
  business_id: string
  decided_by: string | null
  user_id: string | null
}

type BusinessContactLookup = {
  phone: string | null
  whatsapp_link: string | null
}

type CreatorLookup = {
  full_name: string | null
}

type ClientContactLookup = {
  phone: string | null
}

const BUSINESS_RESERVATION_TEMPLATES = new Set([
  'reservation_created_business',
  'reservation_created_by_business',
  'reservation_cancelled_business'
])

const MAX_ATTEMPTS = 3

// Plantillas de correo parametrizadas con la URL base del frontend.
const templates = createTemplates(APP_URL)
const CLIENT_RESERVATION_TEMPLATES = new Set([
  'reservation_created_client',
  'reservation_confirmed',
  'reservation_rejected',
  'reservation_cancelled_client',
  'reservation_cancelled_by_business',
  'reservation_expired'
])

// This endpoint uses 'secret' access, apiKey is required.
// Use secret for Server-to-server, internal calls (e.g. cron).
export default {
  fetch: withSupabase({ auth: ['secret'] }, async function (_req, ctx) {
    if (!RESEND_API_KEY) {
      return new Response('Missing RESEND_API_KEY', { status: 500 })
    }

    // ctx.supabaseAdmin bypasses RLS — use for privileged operations
    const supabase = ctx.supabaseAdmin

    // Expirar primero para que las notificaciones recién encoladas se
    // procesen en el mismo ciclo del cron.
    const { data: expiredCount, error: expirationError } = await supabase.rpc(
      'expire_pending_reservations'
    )

    if (expirationError) {
      return new Response(JSON.stringify({ error: expirationError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Claim atómico: cambia las filas a 'processing' antes de enviarlas,
    // evitando que dos ejecuciones solapadas (cron + manual) tomen las
    // mismas filas y envíen correos duplicados. Si Resend falla, se
    // devuelven a 'pending'; si la Edge Function crashea, quedan en
    // 'processing' y se recuperan manualmente o vía un job de limpieza.
    const { data: pending, error } = await supabase
      .from('notification_outbox')
      .update({ status: 'processing' } as never)
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(50)
      .select('*')

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500
      })
    }

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({
          sent: 0,
          failed: 0,
          expired: expiredCount ?? 0,
          message: 'No pending notifications'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let sent = 0
    let failed = 0

    for (const row of pending as OutboxRow[]) {
      const template = templates[row.type]
      if (!template) {
        await supabase
          .from('notification_outbox')
          .update({
            status: 'failed',
            last_error: 'Unknown template type',
            attempts: row.attempts + 1
          } as never)
          .eq('id', row.id)
        failed++
        continue
      }

      const payload = {
        ...row.payload,
        recipient_name: row.recipient_name
      } as TemplatePayload
      const reservationId =
        typeof row.payload.reservation_id === 'string'
          ? row.payload.reservation_id
          : null

      if (
        reservationId &&
        (CLIENT_RESERVATION_TEMPLATES.has(row.type) ||
          row.type === 'reservation_created_by_business')
      ) {
        const reservationResult = await supabase
          .from('reservations')
          .select('business_id, decided_by, user_id')
          .eq('id', reservationId)
          .maybeSingle()
        const reservation = reservationResult.data as ReservationLookup | null

        if (reservation?.business_id) {
          if (CLIENT_RESERVATION_TEMPLATES.has(row.type)) {
            const businessResult = await supabase
              .from('businesses')
              .select('phone, whatsapp_link')
              .eq('id', reservation.business_id)
              .maybeSingle()
            const business = businessResult.data as BusinessContactLookup | null
            payload.business_whatsapp =
              resolveBusinessWhatsApp(
                business?.whatsapp_link,
                business?.phone
              ) ?? undefined
          }

          if (
            BUSINESS_RESERVATION_TEMPLATES.has(row.type) &&
            reservation.user_id
          ) {
            const clientResult = await supabase
              .from('profiles')
              .select('phone')
              .eq('id', reservation.user_id)
              .maybeSingle()
            const client = clientResult.data as ClientContactLookup | null
            payload.client_whatsapp =
              resolveBusinessWhatsApp(null, client?.phone) ?? undefined
          }

          if (
            row.type === 'reservation_created_by_business' &&
            reservation.decided_by
          ) {
            const creatorResult = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', reservation.decided_by)
              .maybeSingle()
            const creator = creatorResult.data as CreatorLookup | null
            if (creator?.full_name) payload.created_by_name = creator.full_name
          }
        }
      }

      const { subject, html } = template(payload)

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: row.recipient_email,
            subject,
            html
          })
        })

        if (res.ok) {
          await supabase
            .from('notification_outbox')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              attempts: row.attempts + 1
            } as never)
            .eq('id', row.id)
          sent++
        } else {
          const errText = await res.text()
          await supabase
            .from('notification_outbox')
            .update({
              attempts: row.attempts + 1,
              last_error: `Resend API error: ${res.status} ${errText}`,
              status: row.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending'
            } as never)
            .eq('id', row.id)
          failed++
        }
      } catch (err) {
        await supabase
          .from('notification_outbox')
          .update({
            attempts: row.attempts + 1,
            last_error: String(err),
            status: row.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending'
          } as never)
          .eq('id', row.id)
        failed++
      }
    }

    return new Response(
      JSON.stringify({
        sent,
        failed,
        expired: expiredCount ?? 0,
        total: pending.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  })
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:55321/functions/v1/send-notifications' \
    --header 'apiKey: sb_secret_...' \
    --data '{}'

*/
