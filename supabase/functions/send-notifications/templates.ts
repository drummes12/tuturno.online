// Plantillas de correo para TuTurno.
//
// Archivo compartido entre la Edge Function (Deno) y los tests (Vitest/node).
// No importa nada de Deno ni de Supabase, así es puramente portable.
//
// La URL base del frontend se inyecta vía createTemplates(appUrl) para que
// los tests puedan verificar los enlaces sin depender de variables de entorno.

import {
  alertCircleIcon,
  buildingStoreIcon,
  calendarIcon,
  categoryIcon,
  circleCheckIcon,
  clockIcon,
  externalLinkIcon,
  layoutGridIcon,
  mailIcon,
  mapPinIcon,
  minusIcon,
  noteIcon,
  phoneIcon,
  plusIcon,
  userCircleIcon,
  whatsappIcon,
  xIcon
} from './icons.ts'
import {
  buildBusinessWhatsAppMessage,
  buildClientWhatsAppMessage,
  resolveBusinessWhatsAppWithMessage,
  resolveClientWhatsAppWithMessage
} from './whatsapp.ts'

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
  business_whatsapp?: string
  client_whatsapp?: string
  created_by_name?: string
}

export type TemplateResult = { subject: string; html: string }
export type TemplateFn = (p: TemplatePayload) => TemplateResult

type DetailIcon = {
  icon: string
  color: string
  background: string
}

type EmailWrapperOptions = {
  preheader: string
  badge: { label: string; icon: string }
  heading: string
  description?: string
  bodyHtml: string
  cta?: { href: string; label: string }
  whatsapp?: { href: string; label: string }
}

type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'expired'

const statusConfig: Record<
  ReservationStatus,
  { label: string; icon: string; color: string; background: string }
> = {
  pending: {
    label: 'Pendiente',
    icon: clockIcon(),
    color: '#9a5b00',
    background: '#fff5d8'
  },
  confirmed: {
    label: 'Confirmada',
    icon: circleCheckIcon(),
    color: '#087333',
    background: '#e7f7ec'
  },
  rejected: {
    label: 'Rechazada',
    icon: xIcon(),
    color: '#a52a2a',
    background: '#fdecec'
  },
  cancelled: {
    label: 'Cancelada',
    icon: minusIcon(),
    color: '#5c6a60',
    background: '#eef2ef'
  },
  expired: {
    label: 'Expirada',
    icon: clockIcon(),
    color: '#5c6a60',
    background: '#eef2ef'
  }
}

const detailIcons = {
  business: {
    icon: buildingStoreIcon(),
    color: '#087333',
    background: '#e7f7ec'
  },
  resource: { icon: layoutGridIcon(), color: '#087333', background: '#e7f7ec' },
  date: { icon: calendarIcon(), color: '#087333', background: '#e7f7ec' },
  time: { icon: clockIcon(), color: '#087333', background: '#e7f7ec' },
  client: { icon: userCircleIcon(), color: '#087333', background: '#e7f7ec' },
  email: { icon: mailIcon(), color: '#087333', background: '#e7f7ec' },
  reason: { icon: alertCircleIcon(), color: '#9a5b00', background: '#fff5d8' },
  type: { icon: categoryIcon(), color: '#087333', background: '#e7f7ec' },
  city: { icon: mapPinIcon(), color: '#087333', background: '#e7f7ec' },
  phone: { icon: phoneIcon(), color: '#087333', background: '#e7f7ec' },
  notes: { icon: noteIcon(), color: '#087333', background: '#e7f7ec' },
  publicLink: {
    icon: externalLinkIcon(),
    color: '#087333',
    background: '#e7f7ec'
  }
} satisfies Record<string, DetailIcon>

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
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

function iconMarkup(icon: DetailIcon, size = 26): string {
  const iconSize = size >= 36 ? 22 : 16
  const iconHtml = icon.icon.replace(
    'width="24" height="24"',
    `width="${iconSize}" height="${iconSize}"`
  )
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-radius:8px;background-color:${icon.background};color:${icon.color};border-collapse:separate;line-height:0;"><tr><td width="${size}" height="${size}" align="center" valign="middle" style="width:${size}px;height:${size}px;text-align:center;vertical-align:middle;padding:0;line-height:0;">${iconHtml}</td></tr></table>`
}

/** Ajusta un icono inline para acompañar texto: tamaño y alineamiento vertical óptico. */
function inlineIcon(svg: string, size = 16, marginRight = 6): string {
  return svg
    .replace('width="24" height="24"', `width="${size}" height="${size}"`)
    .replace(
      '<svg ',
      `<svg style="display:inline-block;vertical-align:text-bottom;margin-right:${marginRight}px;" `
    )
}

/** Badge superior de notificación — siempre verde TuTurno, consistente entre todos los correos. */
function notificationBadge(badge: { label: string; icon: string }): string {
  return `<span style="display:inline-block;padding:6px 12px;border-radius:8px;background-color:#e7f7ec;color:#087333;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;line-height:1.2;">${inlineIcon(badge.icon, 14, 5)}${escapeHtml(badge.label)}</span>`
}

/** Badge de estado de la reserva — color sutil según el estado, va dentro de la card. */
function statusBadge(status: ReservationStatus): string {
  const config = statusConfig[status]
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:${config.background};color:${config.color};font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;line-height:1.2;">${inlineIcon(config.icon, 12, 4)}${escapeHtml(config.label)}</span>`
}

/** Fila de detalle para la lista de datos de la reserva. */
function detailRow(
  label: string,
  value: string,
  icon: DetailIcon = detailIcons.resource
): string {
  return `
    <tr>
      <td width="38" style="padding:13px 0;border-bottom:1px solid #e8eeea;vertical-align:center;">${iconMarkup(icon, 26)}</td>
      <td style="padding:13px 10px 13px 10px;border-bottom:1px solid #e8eeea;color:#718078;font-size:13px;line-height:1.45;width:36%;vertical-align:center;">${escapeHtml(label)}</td>
      <td style="padding:13px 0;border-bottom:1px solid #e8eeea;color:#17211b;font-size:14px;font-weight:700;line-height:1.45;vertical-align:center;">${escapeHtml(value)}</td>
    </tr>`
}

/** Tabla de detalles simple (para emails de plataforma sin card de reserva). */
function detailTable(rows: string[]): string {
  const visibleRows = rows.filter(Boolean)
  const rowsHtml = visibleRows
    .map((row, index) =>
      index === visibleRows.length - 1
        ? row.replaceAll('border-bottom:1px solid #e8eeea;', '')
        : row
    )
    .join('')

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dfe9e2;border-radius:14px;background-color:#f9fbfa;border-collapse:separate;border-spacing:0;width:100%;"><tr><td style="padding:4px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${rowsHtml}</table></td></tr></table>`
}

/**
 * Card de reserva con encabezado "[icono] Detalles de la reserva  [StatusBadge]"
 * y filas de detalles debajo. Usada por todos los emails de reserva.
 */
function reservationCard(status: ReservationStatus, rows: string[]): string {
  const visibleRows = rows.filter(Boolean)
  const rowsHtml = visibleRows
    .map((row, index) =>
      index === visibleRows.length - 1
        ? row.replaceAll('border-bottom:1px solid #e8eeea;', '')
        : row
    )
    .join('')

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="overflow:hidden;border:1px solid #dfe9e2;border-radius:14px;background-color:#ffffff;border-collapse:separate;border-spacing:0;width:100%;">
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid #e8eeea;background-color:#f3f9f5;border-radius:14px 14px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td style="vertical-align:middle;">
              <span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#0a7d3b;letter-spacing:0.2px;">${inlineIcon(calendarIcon(), 16, 6)}Detalles de la reserva</span>
            </td>
            <td align="right" style="vertical-align:middle;">
              ${statusBadge(status)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 16px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${rowsHtml}</table>
      </td>
    </tr>
  </table>`
}

/** Botón CTA con estilos inline (compatibilidad con clientes de correo). */
function ctaButton(href: string, label: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="padding:0 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:340px;margin:0 auto;background-color:#0a7d3b;border-radius:10px;">
            <tr>
              <td align="center" style="padding:14px 24px;border-radius:10px;">
                <a href="${escapeHtml(href)}" target="_blank" style="display:block;width:100%;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;box-sizing:border-box;">${inlineIcon(calendarIcon(), 16, 8)}${escapeHtml(label)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
}

function whatsappContact(href: string, label: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px;background-color:#f5faf7;border-collapse:separate;width:100%;">
      <tr>
        <td style="padding:18px 16px;text-align:center;">
          <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#31583d;line-height:1.45;">${escapeHtml(label)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td bgcolor="#25D366" style="border-radius:9px;">
                <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:9px 18px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap;">${inlineIcon(whatsappIcon(), 16, 6)}Abrir WhatsApp</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
}

/**
 * Envoltorio HTML branded para todos los correos.
 * Usa estilos inline porque la mayoría de clientes de correo no soportan <style>.
 */
function emailWrapper(appUrl: string, opts: EmailWrapperOptions): string {
  const { preheader, badge, heading, description, bodyHtml, cta, whatsapp } =
    opts
  const logoUrl = link(appUrl, '/logo-mark.svg')
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f6f4;font-family:Arial,Helvetica,sans-serif;color:#17211b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f6f4;width:100%;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e1e9e3;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:0;background-color:#0a7d3b;background-image:linear-gradient(135deg,#0a7d3b 0%,#0d9c4a 100%);">
            <!--[if !mso]><!-->
            <div style="position:relative;overflow:hidden;">
            <!--<![endif]-->

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;position:relative;z-index:2;">
                <tr>
                  <td style="padding:26px 28px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;line-height:1.15;color:#ffffff;">
                      TuTurno
                    </div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;letter-spacing:0.2px;line-height:1.3;color:#d9f2e1;margin-top:4px;">
                      Reservas que funcionan
                    </div>
                  </td>
                </tr>
              </table>

            <!--[if !mso]><!-->
              <img src="${escapeHtml(logoUrl)}" alt="" width="120" height="120" style="position:absolute;right:-32px;bottom:-40px;opacity:0.14;transform:rotate(-14deg);display:block;border:0;z-index:1;">
            </div>
            <!--<![endif]-->
          </td>
        </tr>
          <tr>
            <td style="padding:28px 28px;">
              <div style="margin-bottom:16px;">${notificationBadge(badge)}</div>
              <h1 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;line-height:1.25;color:#0a5226;">${escapeHtml(heading)}</h1>
              ${description ? `<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#5b6a60;line-height:1.55;">${description}</p>` : ''}
              ${bodyHtml}
            </td>
          </tr>
          ${cta ? `<tr><td align="center" style="padding:8px 12px 28px;"><table role="presentation" align="center" cellpadding="0" cellspacing="0" style="width:100%;"><tr><td align="center">${ctaButton(cta.href, cta.label)}</td></tr></table></td></tr>` : ''}
          ${whatsapp ? `<tr><td style="padding:12px 28px">${whatsappContact(whatsapp.href, whatsapp.label)}</td></tr>` : ''}
          <tr>
            <td align="center" style="padding:25px 28px 28px;border-top:1px solid #e8eeea;text-align:center;">
              <p style="margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9aa59d;line-height:1.6;text-align:center;max-width:40ch;">Este correo fue enviado por TuTurno. Si crees que llegó por error, puedes ignorarlo.</p>
              <a href="${escapeHtml(appUrl)}" style="display:inline-block;margin-top:7px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#0a7d3b;text-decoration:none;font-weight:700;">tuturno.online</a>
              <p style="margin:7px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7b887f;line-height:1.6;text-align:center;">&copy; ${year} TuTurno. Todos los derechos reservados.</p>
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

function paragraph(content: string, margin = '0 0 18px'): string {
  return `<p style="margin:${margin};font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#3c4a41;line-height:1.65;">${content}</p>`
}

function clientReservationDetails(
  p: TemplatePayload,
  status: ReservationStatus,
  extraRows = ''
): string {
  return reservationCard(status, [
    detailRow('Negocio', p.business_name ?? '', detailIcons.business),
    detailRow(
      'Espacio o servicio',
      p.resource_name ?? '',
      detailIcons.resource
    ),
    detailRow('Fecha', formatDate(p.starts_at ?? ''), detailIcons.date),
    detailRow('Hora', formatTime(p.starts_at ?? ''), detailIcons.time),
    extraRows
  ])
}

function businessReservationDetails(
  p: TemplatePayload,
  status: ReservationStatus,
  extraRows = ''
): string {
  return reservationCard(status, [
    detailRow('Cliente', p.client_name ?? '', detailIcons.client),
    p.client_email ? detailRow('Email', p.client_email, detailIcons.email) : '',
    detailRow(
      'Espacio o servicio',
      p.resource_name ?? '',
      detailIcons.resource
    ),
    detailRow('Fecha', formatDate(p.starts_at ?? ''), detailIcons.date),
    detailRow('Hora', formatTime(p.starts_at ?? ''), detailIcons.time),
    extraRows
  ])
}

function clientReservationBody(
  p: TemplatePayload,
  status: ReservationStatus,
  extraRows = ''
): string {
  return clientReservationDetails(p, status, extraRows)
}

/**
 * Crea el conjunto de plantillas de correo parametrizado con la URL base
 * del frontend.
 */
export function createTemplates(appUrl: string): Record<string, TemplateFn> {
  return {
    reservation_created_client: (p) => ({
      subject: `Solicitud de reserva recibida — ${p.business_name}`,
      html: emailWrapper(appUrl, {
        preheader: 'Tu solicitud está pendiente de confirmación',
        badge: { label: 'Nueva solicitud', icon: plusIcon() },
        heading: 'Solicitud de reserva recibida',
        description: `Hola <strong>${escapeHtml(p.recipient_name ?? '')}</strong>, tu solicitud fue enviada y está esperando confirmación.`,
        bodyHtml: clientReservationBody(p, 'pending'),
        cta: {
          href: link(appUrl, '/mis-reservas'),
          label: 'Ver mis reservas'
        },
        whatsapp: p.business_whatsapp
          ? {
              href:
                resolveBusinessWhatsAppWithMessage(
                  p,
                  buildClientWhatsAppMessage(p)
                ) ?? p.business_whatsapp,
              label: '¿Necesitas comunicarte con el negocio?'
            }
          : undefined
      })
    }),

    reservation_created_business: (p) => ({
      subject: `Nueva solicitud de reserva — ${p.client_name}`,
      html: emailWrapper(appUrl, {
        preheader: `Nueva solicitud de ${p.client_name ?? 'cliente'}`,
        badge: { label: 'Nueva solicitud', icon: plusIcon() },
        heading: 'Nueva solicitud de reserva',
        description: 'Hay una solicitud nueva pendiente de confirmar.',
        bodyHtml: businessReservationDetails(p, 'pending'),
        cta: {
          href: link(appUrl, '/admin/reservas'),
          label: 'Confirmar o rechazar'
        },
        whatsapp: p.client_whatsapp
          ? {
              href:
                resolveClientWhatsAppWithMessage(
                  p,
                  buildBusinessWhatsAppMessage(p)
                ) ?? p.client_whatsapp,
              label: '¿Necesitas comunicarte con el cliente?'
            }
          : undefined
      })
    }),

    reservation_created_by_business: (p) => ({
      subject: `Reserva creada por el negocio — ${p.client_name ?? 'Cliente'}`,
      html: emailWrapper(appUrl, {
        preheader: 'Se creó una reserva confirmada desde el panel',
        badge: { label: 'Reserva confirmada', icon: circleCheckIcon() },
        heading: 'Reserva creada por el negocio',
        description: 'Una reserva confirmada fue creada desde el panel.',
        bodyHtml: businessReservationDetails(
          p,
          'confirmed',
          p.created_by_name
            ? detailRow('Creada por', p.created_by_name, detailIcons.client)
            : ''
        ),
        cta: { href: link(appUrl, '/admin/reservas'), label: 'Ver reserva' },
        whatsapp: p.client_whatsapp
          ? {
              href:
                resolveClientWhatsAppWithMessage(
                  p,
                  buildBusinessWhatsAppMessage(p)
                ) ?? p.client_whatsapp,
              label: '¿Necesitas comunicarte con el cliente?'
            }
          : undefined
      })
    }),

    reservation_confirmed: (p) => ({
      subject: `Reserva confirmada — ${p.business_name}`,
      html: emailWrapper(appUrl, {
        preheader: 'Tu reserva fue confirmada',
        badge: { label: 'Reserva confirmada', icon: circleCheckIcon() },
        heading: 'Tu reserva está confirmada',
        description: `Hola <strong>${escapeHtml(p.recipient_name ?? '')}</strong>, el negocio confirmó tu turno.`,
        bodyHtml: clientReservationBody(p, 'confirmed'),
        cta: {
          href: link(appUrl, '/mis-reservas'),
          label: 'Ver mis reservas'
        },
        whatsapp: p.business_whatsapp
          ? {
              href:
                resolveBusinessWhatsAppWithMessage(
                  p,
                  buildClientWhatsAppMessage(p)
                ) ?? p.business_whatsapp,
              label: '¿Necesitas comunicarte con el negocio?'
            }
          : undefined
      })
    }),

    reservation_rejected: (p) => ({
      subject: `Reserva rechazada — ${p.business_name}`,
      html: emailWrapper(appUrl, {
        preheader: 'Tu solicitud fue rechazada',
        badge: { label: 'Reserva rechazada', icon: xIcon() },
        heading: 'Tu reserva fue rechazada',
        description: `Hola <strong>${escapeHtml(p.recipient_name ?? '')}</strong>, el negocio no pudo aceptar tu solicitud.`,
        bodyHtml: `${clientReservationBody(p, 'rejected', p.reason ? detailRow('Motivo', p.reason, detailIcons.reason) : '')}${paragraph('Puedes buscar otro turno cuando quieras.', '16px 0 0')}`,
        cta: { href: link(appUrl, '/'), label: 'Buscar otro turno' },
        whatsapp: p.business_whatsapp
          ? {
              href:
                resolveBusinessWhatsAppWithMessage(
                  p,
                  buildClientWhatsAppMessage(p)
                ) ?? p.business_whatsapp,
              label: '¿Necesitas comunicarte con el negocio?'
            }
          : undefined
      })
    }),

    reservation_cancelled_client: (p) => ({
      subject: `Cancelaste tu reserva — ${p.business_name}`,
      html: emailWrapper(appUrl, {
        preheader: 'Tu cancelación fue registrada',
        badge: { label: 'Reserva cancelada', icon: minusIcon() },
        heading: 'Cancelaste tu reserva',
        description: 'La cancelación de tu reserva quedó registrada.',
        bodyHtml: clientReservationBody(p, 'cancelled'),
        cta: { href: link(appUrl, '/'), label: 'Reservar otro turno' },
        whatsapp: p.business_whatsapp
          ? {
              href:
                resolveBusinessWhatsAppWithMessage(
                  p,
                  buildClientWhatsAppMessage(p)
                ) ?? p.business_whatsapp,
              label: '¿Necesitas comunicarte con el negocio?'
            }
          : undefined
      })
    }),

    reservation_cancelled_business: (p) => ({
      subject: `Reserva cancelada por el cliente — ${p.client_name}`,
      html: emailWrapper(appUrl, {
        preheader: `${p.client_name ?? 'El cliente'} canceló su reserva`,
        badge: { label: 'Reserva cancelada', icon: minusIcon() },
        heading: 'El cliente canceló su reserva',
        description: 'El cliente liberó este turno.',
        bodyHtml: businessReservationDetails(p, 'cancelled'),
        cta: {
          href: link(appUrl, '/admin/reservas'),
          label: 'Ver panel de reservas'
        },
        whatsapp: p.client_whatsapp
          ? {
              href:
                resolveClientWhatsAppWithMessage(
                  p,
                  buildBusinessWhatsAppMessage(p)
                ) ?? p.client_whatsapp,
              label: '¿Necesitas comunicarte con el cliente?'
            }
          : undefined
      })
    }),

    reservation_cancelled_by_business: (p) => ({
      subject: `El negocio canceló tu reserva — ${p.business_name}`,
      html: emailWrapper(appUrl, {
        preheader: 'El negocio canceló tu reserva',
        badge: { label: 'Reserva cancelada', icon: minusIcon() },
        heading: 'El negocio canceló tu reserva',
        description: `Hola <strong>${escapeHtml(p.recipient_name ?? '')}</strong>, el negocio canceló tu reserva.`,
        bodyHtml: `${clientReservationBody(p, 'cancelled', p.reason ? detailRow('Motivo', p.reason, detailIcons.reason) : '')}${paragraph('Puedes buscar otro turno cuando quieras.', '16px 0 0')}`,
        cta: { href: link(appUrl, '/'), label: 'Buscar otro turno' },
        whatsapp: p.business_whatsapp
          ? {
              href:
                resolveBusinessWhatsAppWithMessage(
                  p,
                  buildClientWhatsAppMessage(p)
                ) ?? p.business_whatsapp,
              label: '¿Necesitas comunicarte con el negocio?'
            }
          : undefined
      })
    }),

    reservation_expired: (p) => ({
      subject: `Solicitud expirada — ${p.business_name}`,
      html: emailWrapper(appUrl, {
        preheader: 'Tu solicitud expiró sin confirmación',
        badge: { label: 'Solicitud expirada', icon: clockIcon() },
        heading: 'Tu solicitud expiró',
        description:
          'La solicitud venció porque el negocio no la confirmó a tiempo.',
        bodyHtml: `${clientReservationBody(p, 'expired')}${paragraph('Puedes solicitar un nuevo turno cuando quieras.', '16px 0 0')}`,
        cta: { href: link(appUrl, '/'), label: 'Buscar otro turno' },
        whatsapp: p.business_whatsapp
          ? {
              href:
                resolveBusinessWhatsAppWithMessage(
                  p,
                  buildClientWhatsAppMessage(p)
                ) ?? p.business_whatsapp,
              label: '¿Necesitas comunicarte con el negocio?'
            }
          : undefined
      })
    }),

    business_signup_requested: (p) => ({
      subject: `Nueva solicitud de negocio — ${p.business_name}`,
      html: emailWrapper(appUrl, {
        preheader: `${p.business_name ?? 'Un negocio'} quiere activar su cuenta`,
        badge: { label: 'Nueva solicitud', icon: plusIcon() },
        heading: 'Nueva solicitud de negocio',
        description: 'Hay una solicitud nueva para revisar.',
        bodyHtml: `${detailTable([
          detailRow('Negocio', p.business_name ?? '', detailIcons.business),
          detailRow(
            'Enlace solicitado',
            `/b/${p.desired_slug ?? ''}`,
            detailIcons.publicLink
          ),
          p.business_type
            ? detailRow('Tipo', p.business_type, detailIcons.type)
            : '',
          p.city ? detailRow('Ciudad', p.city, detailIcons.city) : '',
          p.contact_phone
            ? detailRow('Teléfono', p.contact_phone, detailIcons.phone)
            : '',
          p.notes ? detailRow('Notas', p.notes, detailIcons.notes) : ''
        ])}`,
        cta: { href: link(appUrl, '/plataforma'), label: 'Revisar solicitud' }
      })
    }),

    business_approved: (p) => ({
      subject: `Tu negocio ya está activo — ${p.business_name}`,
      html: emailWrapper(appUrl, {
        preheader: 'Ya puedes configurar tus espacios y horarios',
        badge: { label: 'Negocio activo', icon: circleCheckIcon() },
        heading: 'Tu negocio ya está activo',
        description: `Hola <strong>${escapeHtml(p.recipient_name ?? '')}</strong>, creamos tu negocio en TuTurno.`,
        bodyHtml: `${detailTable([
          detailRow('Negocio', p.business_name ?? '', detailIcons.business),
          detailRow(
            'Página pública',
            link(appUrl, `/b/${p.slug ?? ''}`),
            detailIcons.publicLink
          )
        ])}${paragraph('El siguiente paso es configurar tus espacios o servicios y horarios.', '16px 0 0')}`,
        cta: { href: link(appUrl, '/admin'), label: 'Configurar mi negocio' }
      })
    }),

    business_rejected: (p) => ({
      subject: `Sobre tu solicitud — ${p.business_name}`,
      html: emailWrapper(appUrl, {
        preheader: 'No pudimos activar tu negocio por ahora',
        badge: { label: 'Solicitud rechazada', icon: xIcon() },
        heading: 'No pudimos activar tu negocio',
        description: `Hola <strong>${escapeHtml(p.recipient_name ?? '')}</strong>, revisamos tu solicitud para <strong>${escapeHtml(p.business_name ?? '')}</strong> y por ahora no podemos activarla.`,
        bodyHtml: `${p.reason ? detailTable([detailRow('Motivo', p.reason, detailIcons.reason)]) : ''}${paragraph('Si crees que fue un error, responde este correo y lo revisamos contigo.', '16px 0 0')}`,
        cta: {
          href: link(appUrl, '/crear-negocio'),
          label: 'Enviar otra solicitud'
        }
      })
    })
  }
}
