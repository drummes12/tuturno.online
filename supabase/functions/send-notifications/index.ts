// Edge Function: procesa la bandeja de notificaciones y envía correos con Resend.
// Se ejecuta periódicamente (cron) o manualmente.
// Solo accesible con secret key (server-to-server / cron).

// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL =
  Deno.env.get('RESEND_FROM_EMAIL') ?? 'reservas@tudominio.com'

interface OutboxRow {
  id: string
  type: string
  recipient_email: string
  recipient_name: string | null
  payload: Record<string, unknown>
  attempts: number
}

const MAX_ATTEMPTS = 3

// Plantillas de correo
const templates: Record<
  string,
  (p: Record<string, unknown>) => { subject: string; html: string }
> = {
  reservation_created_client: (p) => ({
    subject: `Solicitud de reserva recibida — ${p.business_name}`,
    html: `
      <h2>Solicitud recibida</h2>
      <p>Hola ${p.recipient_name ?? ''},</p>
      <p>Tu solicitud de reserva está <strong>pendiente de confirmación</strong>.</p>
      <ul>
        <li><strong>Negocio:</strong> ${p.business_name}</li>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
      </ul>
      <p>Te avisaremos cuando el negocio confirme o rechace tu solicitud.</p>
    `
  }),
  reservation_created_business: (p) => ({
    subject: `Nueva solicitud de reserva — ${p.client_name}`,
    html: `
      <h2>Nueva solicitud de reserva</h2>
      <ul>
        <li><strong>Cliente:</strong> ${p.client_name}</li>
        <li><strong>Email:</strong> ${p.client_email}</li>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
      </ul>
      <p>Entra al panel para confirmar o rechazar.</p>
    `
  }),
  reservation_confirmed: (p) => ({
    subject: `Reserva confirmada — ${p.business_name}`,
    html: `
      <h2>¡Reserva confirmada!</h2>
      <p>Hola ${p.recipient_name ?? ''}, tu reserva fue confirmada.</p>
      <ul>
        <li><strong>Negocio:</strong> ${p.business_name}</li>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
      </ul>
    `
  }),
  reservation_rejected: (p) => ({
    subject: `Reserva rechazada — ${p.business_name}`,
    html: `
      <h2>Reserva rechazada</h2>
      <p>Hola ${p.recipient_name ?? ''}, tu solicitud fue rechazada.</p>
      <ul>
        <li><strong>Negocio:</strong> ${p.business_name}</li>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
        ${p.reason ? `<li><strong>Motivo:</strong> ${p.reason}</li>` : ''}
      </ul>
      <p>Puedes solicitar otro turno desde la app.</p>
    `
  }),
  reservation_cancelled_client: (p) => ({
    subject: `Reserva cancelada — ${p.business_name}`,
    html: `
      <h2>Reserva cancelada</h2>
      <p>Tu reserva fue cancelada.</p>
      <ul>
        <li><strong>Negocio:</strong> ${p.business_name}</li>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
      </ul>
    `
  }),
  reservation_cancelled_business: (p) => ({
    subject: `Reserva cancelada por el cliente — ${p.client_name}`,
    html: `
      <h2>Reserva cancelada por el cliente</h2>
      <ul>
        <li><strong>Cliente:</strong> ${p.client_name}</li>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
      </ul>
    `
  }),
  reservation_expired: (p) => ({
    subject: `Solicitud expirada — ${p.business_name}`,
    html: `
      <h2>Solicitud expirada</h2>
      <p>Tu solicitud expiró porque el negocio no la confirmó a tiempo.</p>
      <ul>
        <li><strong>Cancha:</strong> ${p.court_name}</li>
        <li><strong>Fecha y hora:</strong> ${new Date(p.starts_at as string).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</li>
      </ul>
    `
  })
}

// This endpoint uses 'secret' access, apiKey is required.
// Use secret for Server-to-server, internal calls (e.g. cron).
export default {
  fetch: withSupabase({ auth: ['secret'] }, async (_req, ctx) => {
    if (!RESEND_API_KEY) {
      return new Response('Missing RESEND_API_KEY', { status: 500 })
    }

    // ctx.supabaseAdmin bypasses RLS — use for privileged operations
    const supabase = ctx.supabaseAdmin

    // Obtener notificaciones pendientes
    const { data: pending, error } = await supabase
      .from('notification_outbox')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500
      })
    }

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No pending notifications' }),
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
          })
          .eq('id', row.id)
        failed++
        continue
      }

      const payload = { ...row.payload, recipient_name: row.recipient_name }
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
            })
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
            })
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
          })
          .eq('id', row.id)
        failed++
      }
    }

    // También expirar reservas pendientes cuyo hold venció
    await supabase.rpc('expire_pending_reservations')

    return new Response(
      JSON.stringify({ sent, failed, total: pending.length }),
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
