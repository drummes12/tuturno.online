import { Link } from 'wouter'
import { ChevronLeftIcon } from '@/components/common/icon'

type BackLinkProps = {
  href: string
  label: string
}

/**
 * Botón de volver estilo chevron, integrado en la misma fila del título
 * de la página (ej: las sub-pantallas agrupadas bajo /admin/negocio).
 * Ícono-only: el label solo se usa para accesibilidad (aria-label/title).
 */
export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      aria-label={`Volver a ${label}`}
      title={`Volver a ${label}`}
      className='inline-flex shrink-0 items-center justify-center -ml-1.5 rounded-lg p-1.5 text-(--color-text-muted) hover:text-(--color-text) hover:bg-surface-inset transition-colors touch-target'
    >
      <ChevronLeftIcon size={22} />
    </Link>
  )
}
