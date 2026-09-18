import type { ReactNode } from 'react'

/**
 * Contenedor estándar de página.
 *
 * Todas las páginas envuelven su contenido en <Page> para compartir
 * el mismo ritmo vertical (gap-5) y uno de los anchos del sistema:
 *
 * - `narrow`  (max-w-2xl) — formularios, listas operativas, preferencias
 * - `default` (max-w-3xl) — contenido de lectura / paneles compactos
 * - `wide`    (max-w-5xl) — boards, grills de reservas, dashboards
 * - `full`    (sin tope propio) — la página maneja su ancho vía className
 *
 * El padding horizontal y el tope absoluto (max-w-5xl) los pone el
 * <main> de AppLayout: Page nunca añade px propio.
 */
const widths = {
  narrow: 'max-w-2xl',
  default: 'max-w-3xl',
  wide: 'max-w-5xl',
  full: ''
} as const

export function Page({
  width = 'wide',
  className = '',
  children
}: {
  width?: keyof typeof widths
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`mx-auto flex w-full flex-col gap-5 ${widths[width]} ${className}`.trim()}
    >
      {children}
    </div>
  )
}
