// Catálogo de iconos Tabler para correos.
//
// Gmail (web y móvil) elimina las etiquetas <svg> inline Y los data URIs
// en el atributo src de <img>. La única forma compatible con todos los
// clientes de correo es hostear los SVGs como archivos estáticos y
// referenciarlos por URL HTTPS.
//
// Los SVGs se generan con generate-email-icons.ts y viven en
// public/email-icons/. Cada icono tiene variantes de color horneadas
// (ej: calendar-green.svg, calendar-white.svg).

/** URL base de los iconos — se settea desde templates.ts con el appUrl. */
let iconBaseUrl = ''

/** Establece la URL base para construir los src de los iconos. */
export function setIconBaseUrl(url: string): void {
  iconBaseUrl = url.replace(/\/$/, '')
}

/** Construye la URL de un icono hosted. */
function iconUrl(name: string, color: string): string {
  return `${iconBaseUrl}/email-icons/${name}-${color}.svg`
}

/** Renderiza un <img> con el icono hosted. */
export function iconImg(
  name: string,
  color: string,
  size: number,
  marginRight = 0,
  verticalAlign = 'middle'
): string {
  const src = iconUrl(name, color)
  const style = marginRight
    ? `display:inline-block;vertical-align:${verticalAlign};margin-right:${marginRight}px;`
    : `display:inline-block;vertical-align:${verticalAlign};`
  return `<img src="${src}" width="${size}" height="${size}" alt="" style="${style}border:0;" />`
}

// ---------------------------------------------------------------------------
// Funciones por icono — devuelven el nombre base para construir la URL.
// El color se pasa en el momento de renderizar via iconImg().
// ---------------------------------------------------------------------------

export function calendarIcon(): string {
  return 'calendar'
}

export function whatsappIcon(): string {
  return 'whatsapp'
}

export function buildingStoreIcon(): string {
  return 'building-store'
}

export function layoutGridIcon(): string {
  return 'layout-grid'
}

export function circleCheckIcon(): string {
  return 'circle-check'
}

export function userCircleIcon(): string {
  return 'user-circle'
}

export function mailIcon(): string {
  return 'mail'
}

export function alertCircleIcon(): string {
  return 'alert-circle'
}

export function categoryIcon(): string {
  return 'category'
}

export function mapPinIcon(): string {
  return 'map-pin'
}

export function phoneIcon(): string {
  return 'phone'
}

export function noteIcon(): string {
  return 'note'
}

export function externalLinkIcon(): string {
  return 'external-link'
}

export function plusIcon(): string {
  return 'plus'
}

export function xIcon(): string {
  return 'x'
}

export function minusIcon(): string {
  return 'minus'
}

export function clockIcon(): string {
  return 'clock'
}

export function shieldCheckIcon(): string {
  return 'shield-check'
}

export function helpCircleIcon(): string {
  return 'help-circle'
}

export function infoCircleIcon(): string {
  return 'info-circle'
}
