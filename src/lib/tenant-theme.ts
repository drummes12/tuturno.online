/**
 * Tenant Branding — procesa el color de marca del negocio (1 solo HEX)
 * y genera automáticamente las variantes, el color de texto sobre el
 * primario y la validación de contraste WCAG AA contra las superficies
 * de la app en modo claro y oscuro.
 *
 * Flujo:
 *   const theme = processTenantTheme(business.brand_color)
 *   applyTenantTheme(theme)   // inyecta las vars --tenant-* en :root
 *   resetTenantTheme()        // vuelve al fallback verde TuTurno
 */

/** Superficies de referencia — deben coincidir con index.css. */
export const LIGHT_SURFACE = '#f8f9fa'
export const DARK_SURFACE = '#0a0d11'

/** Ratio mínimo WCAG AA para texto/UI dibujado sobre superficies. */
const AA_RATIO = 4.5
/** Ratio mínimo para fills (componentes no-texto, WCAG 1.4.11). */
const FILL_RATIO = 3

export interface ContrastCheck {
  /** Superficie contra la que se evaluó. */
  surface: string
  /** Ratio de contraste WCAG (1–21). */
  ratio: number
  /** Cumple el mínimo AA (4.5:1). */
  passesAA: boolean
  /** Tono ajustado más cercano que sí cumple — presente cuando !passesAA. */
  suggested?: string
}

export interface TenantTheme {
  /** HEX normalizado del color de marca (el que se aplica como fill). */
  primary: string
  /** Texto/ícono sobre primary: '#ffffff' o '#000000'. */
  onPrimary: string
  /** Fondo suave para estados/chips (color-mix al 15%). */
  primarySoft: string
  /** Hover del primario (color-mix hacia on-primary). */
  hover: string
  /** Active/pressed del primario (color-mix hacia on-primary). */
  active: string
  /**
   * Variante del color de marca validada ≥4.5:1 sobre la superficie
   * de cada modo — para texto, íconos, bordes y focus rings.
   */
  onSurface: { light: string; dark: string }
  /** Fill por modo: el original salvo que sea casi invisible sobre la
   *  superficie (ratio < 3:1), en cuyo caso se ajusta al tono más
   *  cercano legible. */
  fill: { light: string; dark: string }
  /** Resultado de la validación AA por modo. */
  contrast: { light: ContrastCheck; dark: ContrastCheck }
  /** Contraste del on-primary elegido contra el fill (≥4.5 ideal). */
  onPrimaryContrast: ContrastCheck
  /** true si el color original cumplía AA en ambos modos sin ajuste. */
  valid: boolean
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  let h = m[1].toLowerCase()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** sRGB canal → lineal (IEC 61966-2-1). */
function linearize(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Luminancia relativa WCAG (0 = negro, 1 = blanco). */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  return (
    0.2126 * linearize(rgb.r) +
    0.7152 * linearize(rgb.g) +
    0.0722 * linearize(rgb.b)
  )
}

/** Ratio de contraste WCAG entre dos colores (1–21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const [l1, l2] = [relativeLuminance(hexA), relativeLuminance(hexB)]
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

/** Mezcla `amount` (0–1) de `target` sobre `base` en sRGB. */
function mixHex(base: string, target: string, amount: number): string {
  const a = hexToRgb(base)!
  const b = hexToRgb(target)!
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount
  )
}

/**
 * Tono más cercano a `color` que alcance `minRatio` contra `surface`,
 * desplazándolo hacia el extremo que aumenta el contraste (negro si la
 * superficie es clara, blanco si es oscura). Devuelve el color mismo si
 * ya cumple. El ajuste se hace en pasos del 1% para quedarse lo más
 * cerca posible de la marca original.
 */
function adjustToContrast(color: string, surface: string, minRatio: number): string {
  if (contrastRatio(color, surface) >= minRatio) return color
  const target = relativeLuminance(surface) > 0.5 ? '#000000' : '#ffffff'
  for (let i = 1; i <= 100; i++) {
    const candidate = mixHex(color, target, i / 100)
    if (contrastRatio(candidate, surface) >= minRatio) return candidate
  }
  return target
}

/** Blanco o negro según cuál contraste mejor con `hex`. */
export function pickOnColor(hex: string): '#ffffff' | '#000000' {
  return contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#000000')
    ? '#ffffff'
    : '#000000'
}

/**
 * Procesa el HEX de marca del negocio.
 *
 * A) Luminancia → on-primary automático (blanco sobre colores oscuros o
 *    saturados, negro sobre claros/amarillos/neón).
 * B) Variantes: soft 15% y hover/active por color-mix (declarados en
 *    index.css; aquí se devuelven listos para documentar/previsualizar).
 * C) Contraste AA del color contra las superficies clara y oscura —
 *    reporta validez y, si falla, el tono ajustado más cercano.
 */
export function processTenantTheme(hexColor: string): TenantTheme {
  const normalized = rgbToHex(...(() => {
    const rgb = hexToRgb(hexColor)
    if (!rgb) throw new Error(`Color de marca inválido: ${hexColor}`)
    return [rgb.r, rgb.g, rgb.b] as const
  })())

  const onPrimary = pickOnColor(normalized)

  const check = (surface: string): ContrastCheck => {
    const ratio = contrastRatio(normalized, surface)
    const passesAA = ratio >= AA_RATIO
    return {
      surface,
      ratio: Math.round(ratio * 100) / 100,
      passesAA,
      ...(passesAA ? {} : { suggested: adjustToContrast(normalized, surface, AA_RATIO) })
    }
  }

  const light = check(LIGHT_SURFACE)
  const dark = check(DARK_SURFACE)

  const onPrimaryContrast: ContrastCheck = {
    surface: normalized,
    ratio: Math.round(contrastRatio(onPrimary, normalized) * 100) / 100,
    passesAA: contrastRatio(onPrimary, normalized) >= AA_RATIO
  }

  return {
    primary: normalized,
    onPrimary,
    primarySoft: `color-mix(in srgb, ${normalized} 15%, transparent)`,
    hover: `color-mix(in srgb, ${normalized} 88%, ${onPrimary})`,
    active: `color-mix(in srgb, ${normalized} 78%, ${onPrimary})`,
    onSurface: {
      light: light.suggested ?? normalized,
      dark: dark.suggested ?? normalized
    },
    fill: {
      light: adjustToContrast(normalized, LIGHT_SURFACE, FILL_RATIO),
      dark: adjustToContrast(normalized, DARK_SURFACE, FILL_RATIO)
    },
    contrast: { light, dark },
    onPrimaryContrast,
    valid: light.passesAA && dark.passesAA
  }
}

const TENANT_VARS = [
  '--tenant-primary',
  '--tenant-on-primary',
  '--tenant-primary-contrast',
  '--tenant-primary-dark',
  '--tenant-on-primary-dark',
  '--tenant-primary-contrast-dark'
] as const

/**
 * Inyecta el tema en las custom properties de :root. El fill conserva
 * el color de marca original (ajustado solo si quedaría invisible
 * sobre la superficie); la variante on-surface siempre cumple AA.
 */
export function applyTenantTheme(theme: TenantTheme): void {
  const style = document.documentElement.style
  style.setProperty('--tenant-primary', theme.fill.light)
  style.setProperty('--tenant-on-primary', theme.onPrimary)
  style.setProperty('--tenant-primary-contrast', theme.onSurface.light)
  style.setProperty('--tenant-primary-dark', theme.fill.dark)
  style.setProperty('--tenant-on-primary-dark', pickOnColor(theme.fill.dark))
  style.setProperty('--tenant-primary-contrast-dark', theme.onSurface.dark)
}

/** Quita las vars inyectadas — vuelve al fallback verde TuTurno del CSS. */
export function resetTenantTheme(): void {
  const style = document.documentElement.style
  for (const name of TENANT_VARS) style.removeProperty(name)
}
