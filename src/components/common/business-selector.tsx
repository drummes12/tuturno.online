import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { StoreIcon, LinkIcon, CheckIcon } from '@/components/common/icon'

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
  const [copied, setCopied] = useState(false)

  if (memberships.length === 0) return null

  const active = memberships.find((m) => m.businessId === activeBusinessId)
  const publicUrl = active ? `${window.location.origin}/b/${active.slug}` : null

  async function copyLink() {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: seleccionar y copiar
      const input = document.createElement('input')
      input.value = publicUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const hasMultiple = memberships.length > 1

  return (
    <div className='flex items-center gap-1.5'>
      {/* Selector — solo si hay múltiples negocios */}
      {hasMultiple && (
        <div className='relative'>
          <select
            value={activeBusinessId ?? ''}
            onChange={(e) => setActiveBusinessId(e.target.value || null)}
            className='appearance-none bg-white/10 border border-white/15 rounded-lg pl-7 pr-6 py-1.5 text-sm font-medium text-white max-w-35 sm:max-w-50 truncate cursor-pointer hover:bg-white/15 focus:outline-none focus:border-white/40 transition-colors touch-target'
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
            size={14}
            className='absolute left-2 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none'
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
        <span className='hidden sm:inline text-sm font-medium text-white/80 max-w-40 truncate'>
          {active.businessName}
        </span>
      )}

      {/* Botón copiar enlace público */}
      {active && (
        <button
          onClick={copyLink}
          className='inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-medium text-white/85 hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-95 transition-[background-color,border-color,transform,color] touch-target'
          aria-label='Copiar enlace público del negocio'
          title={publicUrl ?? 'Copiar enlace'}
        >
          {copied ? (
            <>
              <CheckIcon size={14} className='text-pitch-300' />
              <span className='hidden sm:inline'>¡Copiado!</span>
            </>
          ) : (
            <>
              <LinkIcon size={14} />
              <span className='hidden sm:inline'>Copiar enlace</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
