import { useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  processTenantTheme,
  tenantVarsStyle
} from '@/lib/tenant-theme'

/**
 * Papeleta del turno — la pieza de marca: kicker, hora protagonista,
 * recurso con icono y beam opcional.
 *
 * Sigue el tema del tenant: papel claro de día, panel carbón neutro
 * en dark mode. Los acentos usan las vars --tenant-* — en páginas de
 * negocio toman su marca y en el resto quedan en verde TuTurno.
 *
 * Reservar para "un turno concreto": éxito al reservar, la próxima
 * reserva, el resumen antes de confirmar. No usar como fondo genérico.
 *
 * - `business`: co-branding de la reserva — logo + nombre arriba con
 *   el badge justificado a la derecha en la misma fila, firma Powered
 *   by TuTurno al pie y tema propio si trae brandColor (cada tarjeta
 *   puede pintarse con el color de SU negocio en la lista global).
 * - `beam`: clases beam-* para el borde animado (p.ej.
 *   RESERVATION_BEAM_CLASS[status] o 'beam-pitch-500 dark:beam-pitch-400')
 * - `onOpen`: la convierte en botón clickeable (abre el detalle)
 */
export function PitchTicket({
  kicker,
  badge,
  dateLabel,
  timeLabel,
  resourceName,
  resourceIcon,
  resourceLabel,
  meta,
  note,
  business,
  beam,
  onOpen,
  className = '',
  panelClassName = '',
  contentClassName = '',
  timeClassName = ''
}: {
  kicker: ReactNode
  badge?: ReactNode
  dateLabel: string
  timeLabel: ReactNode
  resourceName?: ReactNode
  resourceIcon?: ReactNode
  resourceLabel?: ReactNode
  meta?: ReactNode
  note?: ReactNode
  business?: {
    name: string
    /** null/ausente → isotipo TuTurno, igual que el header tenant. */
    logoUrl?: string | null
    /** HEX del negocio — tema acotado a esta tarjeta. */
    brandColor?: string | null
  }
  beam?: string
  onOpen?: () => void
  className?: string
  /** Clases extra del panel interno (p.ej. full-bleed en desktop). */
  panelClassName?: string
  /** Clases extra del bloque principal (centrado vertical, etc.). */
  contentClassName?: string
  /** Clases extra de la hora protagonista. */
  timeClassName?: string
}) {
  const brandStyle = useMemo(() => {
    if (!business?.brandColor) return undefined
    try {
      return tenantVarsStyle(processTenantTheme(business.brandColor))
    } catch {
      return undefined
    }
  }, [business?.brandColor])

  const body = (
    <>
      {/* Decoración: halo mint suave + anillo de reloj tenue */}
      <div aria-hidden='true' className='pointer-events-none absolute inset-0'>
        <div className='absolute inset-x-0 top-0 h-24 bg-[radial-gradient(60%_100%_at_50%_0%,var(--tenant-primary-soft),transparent)]' />
        <div className='absolute inset-y-0 left-1/2 w-px bg-black/10 dark:bg-white/10' />
        <div className='absolute left-1/2 top-1/2 size-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/10 dark:border-white/10' />
        <div
          className='absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full 
bg-black/10 dark:bg-white/10'
        />
      </div>

      {/* Marca del negocio — logo + nombre protagonistas, badge del
          estado justificado a la derecha en la misma fila. El nombre
          cede (truncate) para que el badge nunca salte de línea. */}
      {business && (
        <div className='relative flex items-center gap-2.5'>
          <img
            src={business.logoUrl ?? '/logo-mark.svg'}
            alt={business.logoUrl ? `Logo de ${business.name}` : 'TuTurno'}
            className='size-8 shrink-0 rounded-lg bg-white/95 object-contain'
          />
          <span className='min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight'>
            {business.name}
          </span>
          {badge}
        </div>
      )}

      <div
        className={`relative flex items-center justify-between gap-3 ${business ? 'mt-3' : ''}`}
      >
        <span className='text-[10px] font-semibold uppercase tracking-[0.14em] text-tenant'>
          {kicker}
        </span>
        {!business && badge}
      </div>

      {/* Scoreboard — misma anatomía que el panel del sheet de detalle:
          fecha + meta en fila, hora protagonista, recurso con icono. */}
      <div className={`relative mt-2 ${contentClassName}`}>
        <div className='flex items-start justify-between gap-3'>
          <p className='text-[11px] font-medium uppercase tracking-[0.14em] text-graphite-500 dark:text-chalk-dim/70'>
            {dateLabel}
          </p>
          {meta && (
            <p className='nums shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-tenant'>
              {meta}
            </p>
          )}
        </div>

        <p
          className={`nums mt-2.5 text-center font-mono font-bold leading-none tracking-tight ${timeClassName || 'text-[34px]'}`}
        >
          {timeLabel}
        </p>

        {resourceName && (
          <div className='mt-3 flex items-center gap-2 border-t border-pitch-900/10 pt-3 dark:border-chalk/10'>
            {resourceIcon && (
              <span className='shrink-0 text-tenant'>
                {resourceIcon}
              </span>
            )}
            <div className='min-w-0 flex-1 truncate text-base font-semibold tracking-tight'>
              {resourceName}
            </div>
            {resourceLabel && (
              <span className='shrink-0 text-xs uppercase tracking-[0.14em] text-graphite-500 dark:text-chalk-dim/60'>
                {resourceLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {note && (
        <div className='relative mt-3 border-t border-pitch-900/10 pt-4 text-center text-xs leading-relaxed text-graphite-500 dark:border-chalk/10 dark:text-chalk-dim/60'>
          {note}
        </div>
      )}

      {/* Firma discreta: mismo gesto que la segunda fila de la píldora
          del header tenant. */}
      {business && (
        <div className='relative mt-3 flex items-center justify-center gap-1 border-t border-pitch-900/10 pt-2.5 text-[9px] font-medium tracking-[0.06em] text-graphite-400 dark:border-chalk/10 dark:text-chalk-dim/50'>
          Powered by
          <img src='/logo-mark.svg' alt='' className='size-2.5 rounded' />
          TuTurno
        </div>
      )}
    </>
  )

  const panelClass = `relative overflow-hidden rounded-2xl bg-white px-6 py-5 text-graphite-900 shadow-(--shadow-lg) dark:bg-graphite-900 dark:text-chalk ${panelClassName}`

  return (
    <div
      className={`${beam ? `border-beam ${beam}` : ''} rounded-2xl ${className}`}
    >
      {onOpen ? (
        <button
          type='button'
          onClick={onOpen}
          style={brandStyle}
          className={`${panelClass} group w-full cursor-pointer text-left transition-transform duration-200 ease-spring hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tenant focus-visible:ring-offset-2`}
        >
          {body}
        </button>
      ) : (
        <div className={panelClass} style={brandStyle}>
          {body}
        </div>
      )}
    </div>
  )
}
