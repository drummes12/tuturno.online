import type { ReactNode } from 'react'

/**
 * Papeleta del turno — la pieza de marca: kicker, hora protagonista,
 * recurso con icono y beam opcional.
 *
 * Sigue el tema de la app: papel claro de día, panel verde profundo
 * en dark mode. El acento cambia con el tema porque el mint no pasa
 * contraste sobre claro (verde de día, mint de noche).
 *
 * Reservar para "un turno concreto": éxito al reservar, la próxima
 * reserva, el resumen antes de confirmar. No usar como fondo genérico.
 *
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
  const body = (
    <>
      {/* Decoración: halo mint suave + anillo de reloj tenue */}
      <div aria-hidden='true' className='pointer-events-none absolute inset-0'>
        <div className='absolute inset-x-0 top-0 h-24 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(52,211,153,0.14),transparent)]' />
        <div className='absolute inset-y-0 left-1/2 w-px bg-black/10 dark:bg-white/10' />
        <div className='absolute left-1/2 top-1/2 size-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/10 dark:border-white/10' />
        <div
          className='absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full 
bg-black/10 dark:bg-white/10'
        />
      </div>

      <div className='relative flex items-center justify-between gap-3'>
        <span className='text-[10px] font-semibold uppercase tracking-[0.14em] text-pitch-700 dark:text-pitch-300'>
          {kicker}
        </span>
        {badge}
      </div>

      {/* Scoreboard — misma anatomía que el panel del sheet de detalle:
          fecha + meta en fila, hora protagonista, recurso con icono. */}
      <div className={`relative mt-2 ${contentClassName}`}>
        <div className='flex items-start justify-between gap-3'>
          <p className='text-[11px] font-medium uppercase tracking-[0.14em] text-graphite-500 dark:text-chalk-dim/70'>
            {dateLabel}
          </p>
          {meta && (
            <p className='nums shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-pitch-700 dark:text-flood-400'>
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
              <span className='shrink-0 text-pitch-600 dark:text-pitch-400'>
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
    </>
  )

  const panelClass = `relative overflow-hidden rounded-2xl bg-white px-6 py-5 text-graphite-900 shadow-(--shadow-lg) dark:bg-pitch-950 dark:text-chalk ${panelClassName}`

  return (
    <div
      className={`${beam ? `border-beam ${beam}` : ''} rounded-2xl ${className}`}
    >
      {onOpen ? (
        <button
          type='button'
          onClick={onOpen}
          className={`${panelClass} group w-full cursor-pointer text-left transition-transform duration-200 ease-spring hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch-600 focus-visible:ring-offset-2 dark:focus-visible:ring-flood-400`}
        >
          {body}
        </button>
      ) : (
        <div className={panelClass}>{body}</div>
      )}
    </div>
  )
}
