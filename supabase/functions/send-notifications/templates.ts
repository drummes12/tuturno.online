// Plantillas de correo para TuTurno.
//
// Archivo compartido entre la Edge Function (Deno) y los tests (Vitest/node).
// No importa nada de Deno ni de Supabase, así es puramente portable.
//
// La URL base del frontend se inyecta vía createTemplates(appUrl) para que
// los tests puedan verificar los enlaces sin depender de variables de entorno.

export interface TemplatePayload {
  business_name?: string
  resource_name?: string
  starts_at?: string
  recipient_name?: string | null
  client_name?: string
  client_email?: string
  reason?: string
  desired_slug?: string
  slug?: string
  city?: string
  business_type?: string
  contact_phone?: string
  notes?: string
}

export type TemplateResult = { subject: string; html: string }
export type TemplateFn = (p: TemplatePayload) => TemplateResult

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** Escapa caracteres HTML para evitar XSS en campos controlados por el usuario. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Fila de detalle para la lista de datos de la reserva. */
function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 0;color:#6b7280;font-size:14px;width:40%;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:#1a1a1a;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>`
}

/** Botón CTA con estilos inline (compatibilidad con clientes de correo). */
function ctaButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
      <tr>
        <td align="center" bgcolor="#0a7d3b" style="border-radius:10px;">
          <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:Georgia,serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
        </td>
      </tr>
    </table>`
}

/**
 * Envoltorio HTML branded para todos los correos.
 * Usa estilos inline porque la mayoría de clientes de correo no soportan <style>.
 */
function emailWrapper(
  appUrl: string,
  opts: {
    preheader: string
    heading: string
    bodyHtml: string
    cta?: { href: string; label: string }
  }
): string {
  const { preheader, heading, bodyHtml, cta } = opts
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Georgia,serif;">
  <!-- preheader oculto -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#0a5226;padding:24px 28px;text-align:left;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">TuTurno</span>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="padding:32px 28px 8px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0a5226;line-height:1.3;">${heading}</h1>
              ${bodyHtml}
            </td>
          </tr>

          <!-- CTA -->
          ${cta ? `<tr><td style="padding:0 28px;">${ctaButton(cta.href, cta.label)}</td></tr>` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding:28px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">
                Este correo fue enviado por TuTurno. Si crees que llegó por error, ignóralo.<br>
                <a href="${appUrl}" style="color:#0a7d3b;text-decoration:none;font-weight:600;">tuturno.online</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Construye un enlace absoluto hacia una ruta del frontend. */
function link(appUrl: string, path: string): string {
  return `${appUrl}${path.startsWith('/') ? '' : '/'}${path}`
}

/**
 * Crea el conjunto de plantillas de correo parametrizado con la URL base
 * del frontend.
 */
export function createTemplates(appUrl: string): Record<string, TemplateFn> {
  return {
    reservation_created_client: (p) => {
      const details = [
        detailRow('Negocio', p.business_name ?? ''),
        detailRow('Espacio', p.resource_name ?? ''),
        detailRow('Fecha y hora', formatDate(p.starts_at ?? ''))
      ].join('')
      return {
        subject: `Solicitud de reserva recibida — ${p.business_name}`,
        html: emailWrapper(appUrl, {
          preheader: 'Tu solicitud está pendiente de confirmación',
          heading: 'Solicitud recibida',
          bodyHtml: `
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Hola <strong>${escapeHtml(p.recipient_name ?? '')}</strong>,</p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Tu solicitud de reserva está <strong style="color:#b45309;">pendiente de confirmación</strong>. Te avisaremos en cuanto el negocio la revise.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${details}</table>`,
          cta: {
            href: link(appUrl, '/mis-reservas'),
            label: 'Ver mis reservas'
          }
        })
      }
    },

    reservation_created_business: (p) => {
      const details = [
        detailRow('Cliente', p.client_name ?? ''),
        detailRow('Email', p.client_email ?? ''),
        detailRow('Espacio', p.resource_name ?? ''),
        detailRow('Fecha y hora', formatDate(p.starts_at ?? ''))
      ].join('')
      return {
        subject: `Nueva solicitud de reserva — ${p.client_name}`,
        html: emailWrapper(appUrl, {
          preheader: `Nueva solicitud de ${escapeHtml(p.client_name ?? '')}`,
          heading: 'Nueva solicitud de reserva',
          bodyHtml: `
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Tienes una nueva solicitud esperando confirmación.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${details}</table>`,
          cta: {
            href: link(appUrl, '/admin/reservas'),
            label: 'Confirmar o rechazar'
          }
        })
      }
    },

    reservation_created_by_business: (p) => {
      const details = [
        detailRow('Cliente', p.client_name ?? ''),
        detailRow('Email', p.client_email ?? 'No registrado'),
        detailRow('Espacio', p.resource_name ?? ''),
        detailRow('Fecha y hora', formatDate(p.starts_at ?? ''))
      ].join('')
      return {
        subject: `Reserva creada por el negocio — ${p.client_name ?? 'Cliente'}`,
        html: emailWrapper(appUrl, {
          preheader: 'Se creó una reserva confirmada desde el panel',
          heading: 'Reserva creada por el negocio',
          bodyHtml: `
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Se creó una reserva <strong style="color:#0a7d3b;">confirmada</strong> desde el panel del negocio.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${details}</table>`,
          cta: { href: link(appUrl, '/admin/reservas'), label: 'Ver reserva' }
        })
      }
    },

    reservation_confirmed: (p) => {
      const details = [
        detailRow('Negocio', p.business_name ?? ''),
        detailRow('Espacio', p.resource_name ?? ''),
        detailRow('Fecha y hora', formatDate(p.starts_at ?? ''))
      ].join('')
      return {
        subject: `Reserva confirmada — ${p.business_name}`,
        html: emailWrapper(appUrl, {
          preheader: '¡Tu reserva fue confirmada!',
          heading: '¡Reserva confirmada!',
          bodyHtml: `
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Hola <strong>${escapeHtml(p.recipient_name ?? '')}</strong>, tu reserva fue confirmada.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${details}</table>`,
          cta: {
            href: link(appUrl, '/mis-reservas'),
            label: 'Ver mis reservas'
          }
        })
      }
    },

    reservation_rejected: (p) => {
      const details = [
        detailRow('Negocio', p.business_name ?? ''),
        detailRow('Espacio', p.resource_name ?? ''),
        detailRow('Fecha y hora', formatDate(p.starts_at ?? ''))
      ].join('')
      const reasonRow = p.reason ? detailRow('Motivo', p.reason) : ''
      return {
        subject: `Reserva rechazada — ${p.business_name}`,
        html: emailWrapper(appUrl, {
          preheader: 'Tu solicitud fue rechazada',
          heading: 'Reserva rechazada',
          bodyHtml: `
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Hola <strong>${escapeHtml(p.recipient_name ?? '')}</strong>, tu solicitud fue rechazada por el negocio.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${details}${reasonRow}</table>
            <p style="margin:16px 0 0;font-size:15px;color:#374151;line-height:1.6;">Puedes solicitar otro turno cuando quieras.</p>`,
          cta: { href: link(appUrl, '/'), label: 'Buscar otro turno' }
        })
      }
    },

    reservation_cancelled_client: (p) => {
      const details = [
        detailRow('Negocio', p.business_name ?? ''),
        detailRow('Espacio', p.resource_name ?? ''),
        detailRow('Fecha y hora', formatDate(p.starts_at ?? ''))
      ].join('')
      return {
        subject: `Cancelaste tu reserva — ${p.business_name}`,
        html: emailWrapper(appUrl, {
          preheader: 'Tu cancelación fue registrada',
          heading: 'Reserva cancelada por ti',
          bodyHtml: `
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Registramos la cancelación de tu reserva.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${details}</table>`,
          cta: { href: link(appUrl, '/'), label: 'Reservar otro turno' }
        })
      }
    },

    reservation_cancelled_business: (p) => {
      const details = [
        detailRow('Cliente', p.client_name ?? ''),
        detailRow('Espacio', p.resource_name ?? ''),
        detailRow('Fecha y hora', formatDate(p.starts_at ?? ''))
      ].join('')
      return {
        subject: `Reserva cancelada por el cliente — ${p.client_name}`,
        html: emailWrapper(appUrl, {
          preheader: `${escapeHtml(p.client_name ?? '')} canceló su reserva`,
          heading: 'Reserva cancelada por el cliente',
          bodyHtml: `
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">El cliente canceló su reserva.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${details}</table>`,
          cta: {
            href: link(appUrl, '/admin/reservas'),
            label: 'Ver panel de reservas'
          }
        })
      }
    },

    reservation_cancelled_by_business: (p) => {
      const details = [
        detailRow('Negocio', p.business_name ?? ''),
        detailRow('Espacio', p.resource_name ?? ''),
        detailRow('Fecha y hora', formatDate(p.starts_at ?? ''))
      ].join('')
      const reasonRow = p.reason ? detailRow('Motivo', p.reason) : ''
      return {
        subject: `El negocio canceló tu reserva — ${p.business_name}`,
        html: emailWrapper(appUrl, {
          preheader: 'El negocio canceló tu reserva',
          heading: 'Reserva cancelada por el negocio',
          bodyHtml: `
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Hola <strong>${escapeHtml(p.recipient_name ?? '')}</strong>, el negocio canceló tu reserva.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${details}${reasonRow}</table>
            <p style="margin:16px 0 0;font-size:15px;color:#374151;line-height:1.6;">Puedes solicitar otro turno cuando quieras.</p>`,
          cta: { href: link(appUrl, '/'), label: 'Buscar otro turno' }
        })
      }
    },

    reservation_expired: (p) => {
      const details = [
        detailRow('Negocio', p.business_name ?? ''),
        detailRow('Espacio', p.resource_name ?? ''),
        detailRow('Fecha y hora', formatDate(p.starts_at ?? ''))
      ].join('')
      return {
        subject: `Solicitud expirada — ${p.business_name}`,
        html: emailWrapper(appUrl, {
          preheader: 'Tu solicitud expiró sin confirmación',
          heading: 'Solicitud expirada',
          bodyHtml: `
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Tu solicitud expiró porque el negocio no la confirmó a tiempo.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${details}</table>
            <p style="margin:16px 0 0;font-size:15px;color:#374151;line-height:1.6;">Puedes solicitar un nuevo turno cuando quieras.</p>`,
          cta: { href: link(appUrl, '/'), label: 'Buscar otro turno' }
        })
      }
    },

    business_signup_requested: (p) => {
      const details = [
        detailRow('Negocio', p.business_name ?? ''),
        detailRow('Enlace solicitado', `/b/${p.desired_slug ?? ''}`),
        p.business_type ? detailRow('Tipo', p.business_type) : '',
        p.city ? detailRow('Ciudad', p.city) : '',
        p.contact_phone ? detailRow('Teléfono', p.contact_phone) : '',
        p.notes ? detailRow('Notas', p.notes) : ''
      ].join('')
      return {
        subject: `Nueva solicitud de negocio — ${p.business_name}`,
        html: emailWrapper(appUrl, {
          preheader: `${escapeHtml(p.business_name ?? '')} quiere activar su cuenta`,
          heading: 'Nueva solicitud de negocio',
          bodyHtml: `
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Revisa la solicitud en el panel de plataforma y apruébala o recházala desde ahí.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${details}</table>`,
          cta: { href: link(appUrl, '/plataforma'), label: 'Revisar solicitud' }
        })
      }
    },

    business_approved: (p) => {
      const details = [
        detailRow('Negocio', p.business_name ?? ''),
        detailRow('Página pública', link(appUrl, `/b/${p.slug ?? ''}`))
      ].join('')
      return {
        subject: `Tu negocio ya está activo — ${p.business_name}`,
        html: emailWrapper(appUrl, {
          preheader: 'Ya puedes configurar tus espacios y horarios',
          heading: '¡Tu negocio ya está activo!',
          bodyHtml: `
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Hola <strong>${escapeHtml(p.recipient_name ?? '')}</strong>,</p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Creamos tu negocio en TuTurno. El siguiente paso es cargar tus espacios y tus horarios para empezar a recibir reservas.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${details}</table>`,
          cta: { href: link(appUrl, '/admin'), label: 'Configurar mi negocio' }
        })
      }
    },

    business_rejected: (p) => {
      const reasonRow = p.reason ? detailRow('Motivo', p.reason) : ''
      return {
        subject: `Sobre tu solicitud — ${p.business_name}`,
        html: emailWrapper(appUrl, {
          preheader: 'No pudimos activar tu negocio por ahora',
          heading: 'No pudimos activar tu negocio',
          bodyHtml: `
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Hola <strong>${escapeHtml(p.recipient_name ?? '')}</strong>,</p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Revisamos tu solicitud para <strong>${escapeHtml(p.business_name ?? '')}</strong> y por ahora no podemos activarla.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${reasonRow}</table>
            <p style="margin:16px 0 0;font-size:15px;color:#374151;line-height:1.6;">Si crees que fue un error, responde este correo y lo revisamos contigo.</p>`,
          cta: {
            href: link(appUrl, '/crear-negocio'),
            label: 'Enviar otra solicitud'
          }
        })
      }
    }
  }
}
