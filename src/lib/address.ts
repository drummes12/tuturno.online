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
 * Construye una dirección corta (calle + ciudad).
 * Ej: "Calle 123 #45-67, Medellín"
 */
export function formatShortAddress(parts: AddressParts): string {
  return [parts.street, parts.city].filter((s) => s && s.trim()).join(', ')
}

/**
 * Genera un link a Google Maps para una dirección o coordenadas.
 * Usa coordenadas si están disponibles (más preciso), sino usa la dirección.
 */
export function googleMapsLink(opts: AddressParts & { latitude?: number | null; longitude?: number | null }): string {
  if (opts.latitude != null && opts.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${opts.latitude},${opts.longitude}`
  }
  const address = formatFullAddress(opts)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
