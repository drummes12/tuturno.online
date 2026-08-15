/**
 * Construye un link de WhatsApp (wa.me) limpio.
 * Acepta formatos como: +57 300 123 4567, 573001234567, 3001234567
 */
export function waLink(phone: string | null | undefined, message?: string): string | null {
  if (!phone) return null
  // Limpiar: quitar todo lo que no sea digito
  const digits = phone.replace(/[^\d]/g, '')
  if (!digits) return null
  const base = `https://wa.me/${digits}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/**
 * Resuelve el link de WhatsApp final para un negocio.
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
  // Override explícito
  if (whatsappLink && whatsappLink.trim()) {
    const trimmed = whatsappLink.trim()
    // Si ya es una URL completa, usarla
    if (/^https?:\/\//i.test(trimmed)) {
      if (message && !trimmed.includes('text=')) {
        // Añadir mensaje si la URL no lo tiene ya
        const sep = trimmed.includes('?') ? '&' : '?'
        return `${trimmed}${sep}text=${encodeURIComponent(message)}`
      }
      return trimmed
    }
    // Si es un username o número, normalizar a wa.me
    const cleaned = trimmed.replace(/^@/, '').replace(/[^\dA-Za-z_]/g, '')
    if (!cleaned) return null
    const base = `https://wa.me/${cleaned}`
    return message ? `${base}?text=${encodeURIComponent(message)}` : base
  }

  // Fallback al teléfono
  return waLink(phone, message)
}
