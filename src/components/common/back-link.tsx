import { Link, useLocation } from 'wouter'
import { ChevronLeftIcon } from '@/components/common/icon'
import { isDemoPath, adminToDemoPath } from '@/lib/demo'

type BackLinkProps = {
  href: string
  label: string
}

/**
 * Botón de volver estilo chevron, integrado en la misma fila del título
 * de la página (ej: las sub-pantallas agrupadas bajo /admin/negocio).
 * Ícono-only: el label solo se usa para accesibilidad (aria-label/title).
 * En la demo pública (/demo/*) los hrefs /admin se remapean a /demo.
 */
export function BackLink({ href, label }: BackLinkProps) {
  const [location] = useLocation()
  const target = isDemoPath(location) ? adminToDemoPath(href) : href
  return (
    <Link
      href={target}
      aria-label={`Volver a ${label}`}
      title={`Volver a ${label}`}
      className='inline-flex shrink-0 items-center justify-center -ml-1.5 rounded-lg p-1.5 text-(--color-text-muted) hover:text-(--color-text) hover:bg-surface-inset transition-colors touch-target'
    >
      <ChevronLeftIcon size={22} />
    </Link>
  )
}
