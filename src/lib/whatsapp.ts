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
