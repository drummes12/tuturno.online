/**
 * Utilidades para construir enlaces de WhatsApp y mensajes pre-rellenados.
 *
 * Exporta una sola función para links: `resolveWhatsAppLink`.
 * Los builders de mensajes centralizan el texto que se envía en cada escenario,
 * con lenguaje neutral orientado a cualquier tipo de espacio.
 */

/**
 * Etiqueta neutral para referirse a un recurso/espacio cuando el negocio
 * no tiene un `resource_label_singular` configurado.
 */
export const DEFAULT_RESOURCE_LABEL = 'espacio'

/**
 * Construye un link de WhatsApp (wa.me) limpio.
 * Acepta formatos como: +57 300 123 4567, 573001234567, 3001234567
 */
function waLink(
  phone: string | null | undefined,
  message?: string
): string | null {
  if (!phone) return null
  const digits = phone.replace(/[^\d]/g, '')
  if (!digits) return null
  const base = `https://wa.me/${digits}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/**
 * Resuelve el link de WhatsApp final para un negocio o contacto.
 *
 * Prioridad:
 * 1. `whatsappLink` — override explícito (ej: username o link personalizado)
 * 2. `phone` — número telefónico (se limpia a dígitos)
 *
 * Si `whatsappLink` es una URL completa (wa.me, whatsapp.com, api.whatsapp.com),
 * se usa tal cual (con mensaje adjunto si se proporciona).
 * Si es un valor simple (username o número), se normaliza a wa.me/<valor>.
 */
export function resolveWhatsAppLink(
  whatsappLink: string | null | undefined,
  phone: string | null | undefined,
  message?: string
): string | null {
  if (whatsappLink && whatsappLink.trim()) {
    const trimmed = whatsappLink.trim()
    if (/^https?:\/\//i.test(trimmed)) {
      if (message && !trimmed.includes('text=')) {
        const sep = trimmed.includes('?') ? '&' : '?'
        return `${trimmed}${sep}text=${encodeURIComponent(message)}`
      }
      return trimmed
    }
    const cleaned = trimmed.replace(/^@/, '').replace(/[^\dA-Za-z_]/g, '')
    if (!cleaned) return null
    const base = `https://wa.me/${cleaned}`
    return message ? `${base}?text=${encodeURIComponent(message)}` : base
  }
  return waLink(phone, message)
}

// ---------------------------------------------------------------------------
// Builders de mensajes
// ---------------------------------------------------------------------------

type ReservationMessageOpts = {
  businessName: string
  resourceName?: string | null
  resourceLabel?: string | null
  dateLabel?: string | null
  timeLabel: string
  clientName: string
}

type BusinessContactOpts = {
  clientName: string
  resourceName?: string | null
  dateLabel?: string | null
  timeLabel?: string | null
}

function resolveLabel(label?: string | null): string {
  const l = (label ?? '').trim()
  return l || DEFAULT_RESOURCE_LABEL
}

/**
 * Mensaje del cliente al negocio tras enviar una solicitud de reserva.
 * Usa lenguaje neutral ("espacio" o el label custom del negocio).
 */
export function buildClientReservationMessage(
  opts: ReservationMessageOpts
): string {
  const label = resolveLabel(opts.resourceLabel)
  const space = opts.resourceName ?? label
  return (
    `Hola ${opts.businessName}, acabo de enviar una solicitud de reserva:\n\n` +
    `- ${label.charAt(0).toUpperCase() + label.slice(1)}: ${space}\n` +
    (opts.dateLabel ? `- Fecha: ${opts.dateLabel}\n` : '') +
    `- Hora: ${opts.timeLabel}\n` +
    `- Cliente: ${opts.clientName}\n\n` +
    `Quedo atento/a a la confirmación. ¡Gracias!`
  )
}

/**
 * Mensaje del cliente al negocio sobre una reserva pendiente existente
 * (desde "Mis reservas").
 */
export function buildClientPendingMessage(
  opts: ReservationMessageOpts
): string {
  const label = resolveLabel(opts.resourceLabel)
  const space = opts.resourceName ?? label
  return (
    `Hola ${opts.businessName}, tengo una reserva pendiente por confirmar:\n\n` +
    `- ${label.charAt(0).toUpperCase() + label.slice(1)}: ${space}\n` +
    (opts.dateLabel ? `- Fecha: ${opts.dateLabel}\n` : '') +
    `- Hora: ${opts.timeLabel}\n` +
    `- Cliente: ${opts.clientName}\n\n` +
    `Quisiera validar el estado de mi reserva. ¡Gracias!`
  )
}

/**
 * Mensaje del negocio al cliente sobre una reserva específica.
 * Incluye fecha y hora para que el cliente pueda identificarla fácilmente.
 */
export function buildBusinessContactMessage(opts: BusinessContactOpts): string {
  const space = opts.resourceName ?? ''
  const parts: string[] = [
    `Hola ${opts.clientName}, te contacto sobre tu reserva`
  ]
  if (space) parts.push(` en ${space}`)
  if (opts.dateLabel && opts.timeLabel) {
    parts.push(` del ${opts.dateLabel} a las ${opts.timeLabel}`)
  } else if (opts.dateLabel) {
    parts.push(` del ${opts.dateLabel}`)
  } else if (opts.timeLabel) {
    parts.push(` de las ${opts.timeLabel}`)
  }
  parts.push('.')
  return parts.join('')
}

/**
 * Mensaje genérico de consulta general (FAB de WhatsApp, botón de prueba).
 */
export function buildGeneralInquiryMessage(businessName: string): string {
  return `Hola ${businessName}, tengo una consulta sobre las reservas.`
}
