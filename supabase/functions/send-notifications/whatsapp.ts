// Resolución de links de WhatsApp y builders de mensaje pre-rellenado.
//
// Archivo compartido entre la Edge Function (Deno) y los tests (Vitest/node).
// Espejo de src/lib/whatsapp.ts del frontend para mantener una sola lógica
// de generación de links entre la app y los correos.

/** Subset de TemplatePayload con los campos que usa la generación de WhatsApp. */
export interface WhatsAppPayload {
  business_name?: string
  resource_name?: string
  starts_at?: string
  recipient_name?: string | null
  client_name?: string
  business_whatsapp?: string
  client_whatsapp?: string
}

/**
 * Resuelve el link de WhatsApp final para un negocio o contacto.
 *
 * Prioridad:
 * 1. `whatsappLink` — override explícito (ej: username o link personalizado)
 * 2. `phone` — número telefónico (se limpia a dígitos)
 *
 * Si `whatsappLink` es una URL completa, se usa tal cual (con mensaje adjunto
 * si se proporciona). Si es un valor simple (username o número), se normaliza
 * a wa.me/<valor>.
 */
export function resolveBusinessWhatsApp(
  whatsappLink?: string | null,
  phone?: string | null,
  message?: string
): string | null {
  const configuredLink = whatsappLink?.trim()
  if (configuredLink) {
    if (/^https?:\/\//i.test(configuredLink)) {
      if (message && !configuredLink.includes('text=')) {
        const sep = configuredLink.includes('?') ? '&' : '?'
        return `${configuredLink}${sep}text=${encodeURIComponent(message)}`
      }
      return configuredLink
    }
    const cleaned = configuredLink
      .replace(/^@/, '')
      .replace(/[^\dA-Za-z_]/g, '')
    if (!cleaned) return null
    const base = `https://wa.me/${cleaned}`
    return message ? `${base}?text=${encodeURIComponent(message)}` : base
  }

  const digits = phone?.replace(/[^\d]/g, '')
  if (!digits) return null
  const base = `https://wa.me/${digits}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

// ---------------------------------------------------------------------------
// Helpers de fecha/hora para mensajes
// ---------------------------------------------------------------------------

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}

function formatTimeShort(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ---------------------------------------------------------------------------
// Builders de mensajes — espejo de src/lib/whatsapp.ts
// ---------------------------------------------------------------------------

/** Mensaje del cliente al negocio sobre su reserva. */
export function buildClientWhatsAppMessage(p: WhatsAppPayload): string {
  const space = p.resource_name ?? 'espacio'
  return [
    `Hola ${p.business_name ?? ''}, te contacto sobre mi reserva:`,
    `- Espacio o servicio: ${space}`,
    `- Fecha: ${formatDateShort(p.starts_at ?? '')}`,
    `- Hora: ${formatTimeShort(p.starts_at ?? '')}`,
    `- Cliente: ${p.recipient_name ?? p.client_name ?? ''}`,
    '',
    'Quedo atento/a. ¡Gracias!'
  ].join('\n')
}

/** Mensaje del negocio al cliente sobre su reserva. */
export function buildBusinessWhatsAppMessage(p: WhatsAppPayload): string {
  const space = p.resource_name ?? ''
  const parts: string[] = [
    `Hola ${p.client_name ?? ''}, te contacto sobre tu reserva`
  ]
  if (space) parts.push(` en ${space}`)
  parts.push(
    ` del ${formatDateShort(p.starts_at ?? '')} a las ${formatTimeShort(p.starts_at ?? '')}.`
  )
  return parts.join('')
}

// ---------------------------------------------------------------------------
// Resolución con mensaje pre-rellenado
// ---------------------------------------------------------------------------

/** Resuelve el link de WhatsApp del negocio con un mensaje pre-rellenado. */
export function resolveBusinessWhatsAppWithMessage(
  p: WhatsAppPayload,
  message: string
): string | null {
  return resolveBusinessWhatsApp(p.business_whatsapp, undefined, message)
}

/**
 * Resuelve el link de WhatsApp del cliente con un mensaje pre-rellenado.
 * El client_whatsapp ya viene resuelto desde index.ts como URL,
 * pero le adjuntamos el mensaje si no lo tiene.
 */
export function resolveClientWhatsAppWithMessage(
  p: WhatsAppPayload,
  message: string
): string | null {
  const link = p.client_whatsapp
  if (!link) return null
  return resolveBusinessWhatsApp(link, undefined, message)
}
