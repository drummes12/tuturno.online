import type { ReactNode } from 'react'

/**
 * Papeleta del turno — la pieza de marca: panel pitch siempre nocturno
 * con líneas de cancha, kicker mono, hora protagonista y beam opcional.
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
  /** Clases extra del bloque scoreboard (centrado vertical, etc.). */
  contentClassName?: string
  /** Clases extra de la hora protagonista. */
  timeClassName?: string
}) {
  const body = (
    <>
      {/* Líneas de cancha — decorativas */}
      <div aria-hidden='true' className='pointer-events-none absolute inset-0'>
        <span className='absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-chalk/5' />
        <span className='absolute top-1/2 left-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-chalk/5' />
        <span className='absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chalk/15' />
      </div>

      <div className='relative flex items-center justify-between gap-3'>
        <span className='font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-pitch-300'>
          {kicker}
        </span>
        {badge}
      </div>

      {/* Scoreboard — misma anatomía que el panel del sheet de detalle:
          fecha + meta en fila, hora protagonista, recurso con icono. */}
      <div className={`relative mt-5 ${contentClassName}`}>
        <div className='flex items-center justify-between gap-3'>
          <p className='font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-chalk-dim/70'>
            {dateLabel}
          </p>
          {meta && (
            <p className='nums shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-flood-400'>
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
          <div className='mt-3 flex items-center gap-2 border-t border-chalk/10 pt-3'>
            {resourceIcon && (
              <span className='shrink-0 text-pitch-400'>{resourceIcon}</span>
            )}
            <div className='min-w-0 flex-1 truncate text-base font-semibold tracking-tight'>
              {resourceName}
            </div>
            {resourceLabel && (
              <span className='shrink-0 font-mono text-xs uppercase tracking-[0.14em] text-chalk-dim/60'>
                {resourceLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {note && (
        <div className='relative mt-5 border-t border-chalk/10 pt-4 text-center text-xs leading-relaxed text-chalk-dim/60'>
          {note}
        </div>
      )}
    </>
  )

  const panelClass = `dark relative overflow-hidden rounded-2xl bg-pitch-950 px-6 py-5 text-chalk shadow-(--shadow-lg) ${panelClassName}`

  return (
    <div
      className={`${beam ? `border-beam ${beam}` : ''} rounded-2xl ${className}`}
    >
      {onOpen ? (
        <button
          type='button'
          onClick={onOpen}
          className={`${panelClass} group w-full cursor-pointer text-left transition-transform duration-200 ease-spring hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flood-400 focus-visible:ring-offset-2`}
        >
          {body}
        </button>
      ) : (
        <div className={panelClass}>{body}</div>
      )}
    </div>
  )
}
