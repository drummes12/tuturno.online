import type { CSSProperties, ReactNode } from 'react'

/**
 * Loader de marca: reloj de solapas HH:MM (definido en `.digit-clock`,
 * index.css). Pensado para estados de carga a nivel página — boot,
 * Suspense, sesión. Para contextos inline/botones usar `Spinner`.
 */
export function ClockLoader({
  size = 'lg',
  label = 'Cargando'
}: {
  size?: 'md' | 'lg'
  label?: string
}) {
  return (
    <span role='status' aria-label={label} className='inline-flex'>
      <span
        className='digit-clock'
        aria-hidden='true'
        style={
          { '--clock-fs': size === 'lg' ? '30px' : '22px' } as CSSProperties
        }
      />
    </span>
  )
}

/**
 * Loader compacto: arco giratorio (definido en `.arc-loader`, index.css).
 * Para carga a nivel página usar `ClockLoader`, el loader de marca.
 */
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const px = { sm: 16, md: 24, lg: 40 }[size]

  return (
    <span
      role='status'
      aria-label='Cargando'
      className='arc-loader text-primary'
      style={{ '--arc-size': `${px / 48}px` } as CSSProperties}
    />
  )
}

/**
 * Carga de página centrada en el área de contenido — misma posición que
 * el fallback de Suspense, así el handoff reloj → arco no "salta" por
 * la pantalla. Por defecto muestra el arco; `children` permite el reloj
 * de marca para cargas de ruta.
 */
export function PageLoader({ children }: { children?: ReactNode }) {
  return (
    <div className='flex flex-1 items-center justify-center py-20 min-h-[40dvh]'>
      {children ?? <Spinner size='lg' />}
    </div>
  )
}
