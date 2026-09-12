import { useAuthStore } from '@/stores/auth'
import { StoreIcon, CalendarPlusIcon } from '@/components/common/icon'

/**
 * Selector de negocio para usuarios con múltiples memberships.
 * Se renderiza en el header junto al botón de cerrar sesión.
 * Incluye un botón para copiar el enlace público del negocio activo.
 *
 * Solo aparece si el usuario pertenece a más de un negocio.
 * Si pertenece a uno solo, muestra solo el botón de copiar enlace.
 */
export function BusinessSelector() {
  const { memberships, activeBusinessId, setActiveBusinessId } = useAuthStore()

  if (memberships.length === 0) return null

  const active = memberships.find((m) => m.businessId === activeBusinessId)
  const publicUrl = active ? `${window.location.origin}/b/${active.slug}` : null

  const hasMultiple = memberships.length > 1

  return (
    <div className='flex items-center gap-1 sm:gap-2'>
      {/* Selector — solo si hay múltiples negocios */}
      {hasMultiple && (
        <div className='relative'>
          <select
            value={activeBusinessId ?? ''}
            onChange={(e) => setActiveBusinessId(e.target.value || null)}
            className='appearance-none h-11 w-11 min-w-0 sm:w-auto sm:max-w-32 md:max-w-50 rounded-lg border border-white/15 bg-white/5 pl-8 pr-7 py-2 text-sm font-medium text-transparent sm:text-white truncate cursor-pointer shadow-sm transition-[background-color,border-color,transform,color] hover:border-white/30 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flood-400 active:scale-95 touch-target'
            aria-label='Seleccionar negocio'
          >
            {memberships.map((m) => (
              <option
                key={m.businessId}
                value={m.businessId}
                className='text-text bg-surface'
              >
                {m.businessName}
                {m.role === 'owner' ? ' · owner' : ' · manager'}
              </option>
            ))}
          </select>
          <StoreIcon
            size={16}
            className='absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none'
          />
          {/* Chevron */}
          <svg
            className='absolute right-1.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none'
            width='12'
            height='12'
            viewBox='0 0 12 12'
            fill='none'
          >
            <path
              d='M3 4.5L6 7.5L9 4.5'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </div>
      )}

      {/* Nombre del negocio cuando solo hay uno (mobile: oculto, desktop: visible) */}
      {!hasMultiple && active && (
        <span className='hidden min-w-0 max-w-24 truncate text-sm font-medium text-white/80 sm:inline md:max-w-40'>
          {active.businessName}
        </span>
      )}

      {/* Botón crear reserva — abre la página pública en nueva pestaña */}
      {active && (
        <a
          href={publicUrl ?? '#'}
          className='inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-sm font-medium text-white/85 hover:border-white/30 hover:bg-white/15 hover:text-white transition-colors touch-target'
          aria-label='Crear reserva a nombre de un cliente'
          title='Crear reserva a nombre de un cliente'
        >
          <CalendarPlusIcon size={16} className='shrink-0' />
          <span className='hidden sm:inline truncate'>Nueva reserva</span>
        </a>
      )}
    </div>
  )
}
