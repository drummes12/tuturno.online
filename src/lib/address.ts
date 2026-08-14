/**
 * Utilidades para formatear y construir direcciones.
 */

interface AddressParts {
  street?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
}

/**
 * Construye una dirección completa a partir de sus partes.
 * Ej: "Calle 123 #45-67, El Poblado, Medellín, Antioquia, Colombia"
 */
export function formatFullAddress(parts: AddressParts): string {
  return [parts.street, parts.neighborhood, parts.city, parts.state, parts.country]
    .filter((s) => s && s.trim())
    .join(', ')
}

/**
 * Genera un enlace a Google Maps a partir de la dirección textual.
 * No requiere API key ni acceso a la API de Google.
 */
export function googleMapsLink(parts: AddressParts): string {
  const address = formatFullAddress(parts)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
