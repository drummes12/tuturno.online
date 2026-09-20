import type { ReactNode } from 'react'

/**
 * Ticket del turno — la misma fila del tablero de disponibilidad,
 * como resumen de una reserva (seleccionada o existente).
 */
export function SlotTicket({
  resourceName,
  dateLabel,
  timeLabel,
  durationMinutes,
  badge
}: {
  resourceName: string | null
  dateLabel: string
  timeLabel: string
  durationMinutes: number
  badge?: ReactNode
}) {
  return (
    <div
      className='overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-(--shadow-sm) animate-fade-up dark:border-white/10 dark:bg-pitch-950 dark:text-chalk'
      data-tour='reservation-summary'
    >
      <div className='flex items-center justify-between border-b border-border px-5 py-3 dark:border-white/10'>
        <span className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted) dark:text-chalk-dim/70'>
          Tu turno
        </span>
        <span className='text-[11px] capitalize text-(--color-text-muted) dark:text-chalk-dim/70'>
          {dateLabel}
        </span>
      </div>
      <div className='flex items-center gap-4 px-5 py-4'>
        <span className='nums font-mono text-2xl font-bold text-(--color-text) dark:text-chalk'>
          {timeLabel}
        </span>
        <div className='flex-1 min-w-0'>
          <p className='truncate text-sm font-medium'>{resourceName}</p>
          <p className='text-xs text-(--color-text-muted) nums dark:text-chalk-dim/60'>
            {durationMinutes} min
          </p>
        </div>
        {badge ?? (
          <span className='rounded-md border border-flood-500/40 bg-flood-500/10 px-2 py-0.5 text-[11px] font-medium text-pitch-700 dark:border-flood-400/40 dark:text-flood-300'>
            Seleccionado
          </span>
        )}
      </div>
    </div>
  )
}
