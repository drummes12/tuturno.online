import { Card } from '@/components/common/card'
import { StatusBadge } from '@/components/common/badge'
import { ChevronRightIcon } from '@/components/common/icon'
import type { Reservation } from '@/types'
import { formatLocal } from '@/lib/time'
import { differenceInMinutes, parseISO } from 'date-fns'

interface ReservationCardProps {
  reservation: Reservation
  /** Abre el detalle de la reserva (sheet/modal). Si no se pasa, la card no es clickeable. */
  onOpen?: (reservation: Reservation) => void
  /** Kicker mono superior izquierdo. Por defecto: fecha "EEE d MMM". */
  kicker?: React.ReactNode
  /** Contenido a la derecha del kicker (chip de espera, contador...). Default: #número. */
  meta?: React.ReactNode
  /** Muestra el StatusBadge junto a la hora. Default: true. */
  showStatus?: boolean
  /** Nombre del recurso si hay fallback externo (labels del negocio). */
  resourceName?: string
  /** Bloque extra bajo el recurso (info de cliente en vista admin). */
  info?: React.ReactNode
  /** Barra de acciones bajo la card (separada con border-t). */
  footer?: React.ReactNode
  /** Variante con sombra (cola de pendientes del dashboard). */
  elevated?: boolean
  /** Índice para animate-stagger. */
  index?: number
  tourKey?: string
  className?: string
}

/**
 * Anatomía "ticket" compartida para una reserva: kicker mono, hora
 * protagonista, recurso + duración, notas y barra de acciones.
 * La usan la vista cliente (mis reservas), el listado admin y el
 * dashboard de operación.
 */
export function ReservationCard({
  reservation: r,
  onOpen,
  kicker,
  meta,
  showStatus = true,
  resourceName,
  info,
  footer,
  index = 0,
  tourKey,
  elevated,
  className = ''
}: ReservationCardProps) {
  const content = (
    <>
      <div className='flex items-center justify-between gap-2'>
        <p className='font-mono text-[11px] font-medium tracking-[0.14em] text-(--color-text-muted)'>
          {kicker ?? formatLocal(r.starts_at, "EEE d 'de' MMM")}
        </p>
        {meta ??
          (r.reservation_number ? (
            <span className='font-mono text-[11px] uppercase tracking-wider text-text-muted/70'>
              #{r.reservation_number}
            </span>
          ) : null)}
      </div>
      <div className='mt-1 flex flex-col'>
        <div className='min-w-0 flex items-start justify-between gap-3'>
          <p className='font-mono text-[26px] font-bold leading-none tracking-tight'>
            {formatLocal(r.starts_at, 'HH:mm')}
          </p>
          {showStatus && <StatusBadge status={r.status} />}
        </div>
        <div className='flex shrink-0 items-end justify-between gap-1'>
          <p className='mt-1.5 flex items-baseline font-semibold text-(--color-text) tracking-tight gap-1'>
            <span className='truncate'>{r.resource?.name ?? resourceName}</span>
            <span className='shrink-0 text-(--color-text-muted)'>&bull;</span>
            <span className='shrink-0 font-normal text-(--color-text-muted)'>
              {differenceInMinutes(parseISO(r.ends_at), parseISO(r.starts_at))}{' '}
              min
            </span>
          </p>
          {onOpen && (
            <ChevronRightIcon
              size={18}
              className='text-text-muted transition-transform duration-200 ease-spring group-hover:translate-x-0.5'
            />
          )}
        </div>
      </div>

      {info}

      {r.notes && (
        <p className='text-sm text-(--color-text-muted) mt-2 italic border-l-2 border-border pl-3'>
          {r.notes}
        </p>
      )}
      {r.decision_reason && (
        <p className='text-sm text-(--color-text-muted) mt-2'>
          Motivo: {r.decision_reason}
        </p>
      )}
    </>
  )

  const isPending = r.status === 'pending'

  const card = (
    <Card
      elevated={elevated}
      bordered={!isPending}
      className={`group flex h-full flex-col p-4 ${isPending ? '' : 'animate-stagger'} transition-all duration-200 ease-spring ${onOpen ? 'hover:-translate-y-0.5 hover:border-strong' : ''} ${className}`}
      style={{ '--index': index } as React.CSSProperties}
      data-tour={tourKey}
    >
      {onOpen ? (
        <button
          type='button'
          onClick={() => onOpen(r)}
          className='w-full flex-1 cursor-pointer rounded-xl p-2 text-left flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) focus-visible:ring-offset-2'
          aria-label={`Ver detalles de la reserva de ${r.resource?.name ?? resourceName ?? 'recurso'} a las ${formatLocal(r.starts_at, 'HH:mm')}`}
        >
          {content}
        </button>
      ) : (
        <div className='w-full flex-1 p-2 flex flex-col'>{content}</div>
      )}

      {footer && (
        <div className='mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2'>
          {footer}
        </div>
      )}
    </Card>
  )

  // Pendiente: un arco de luz flood recorre el borde — el estado de
  // espera pide atención sin competir con el contenido del ticket.
  if (isPending) {
    return (
      <div
        className='border-beam h-full animate-stagger rounded-xl'
        style={{ '--index': index } as React.CSSProperties}
        data-tour={tourKey}
      >
        {card}
      </div>
    )
  }

  return card
}
