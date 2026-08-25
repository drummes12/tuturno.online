import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { StatusBadge } from '@/components/common/badge'
import { Alert } from '@/components/common/alert'
import { ReservationSkeleton } from '@/components/common/skeleton'
import {
  CheckIcon,
  XIcon,
  UserIcon,
  CalendarIcon,
  InboxIcon,
  WhatsAppIcon
} from '@/components/common/icon'
import type { Reservation, ReservationFilter } from '@/types'
import { format } from 'date-fns'
import { dayRangeUtc, formatLocal, BUSINESS_TIMEZONE } from '@/lib/time'
import {
  resolveWhatsAppLink,
  buildBusinessContactMessage
} from '@/lib/whatsapp'
import { toZonedTime } from 'date-fns-tz'
import { useReservationsRealtime } from '@/hooks/use-reservations-realtime'
import { sortReservationsByPriority } from '@/lib/sort'
import {
  fetchReservationsByDate,
  confirmReservation,
  rejectReservation,
  cancelReservationByBusiness
} from '@/services/reservations'

const statusFilters: { key: ReservationFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'rejected', label: 'Rechazadas' },
  { key: 'cancelled', label: 'Canceladas' },
  { key: 'completed', label: 'Completadas' }
]

export function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ReservationFilter>('all')
  const [selectedDate, setSelectedDate] = useState(
    format(toZonedTime(new Date(), BUSINESS_TIMEZONE), 'yyyy-MM-dd')
  )

  function buildReservationWhatsAppLink(r: Reservation): string | null {
    const phone = r.client?.phone ?? r.profile?.phone
    if (!phone) return null
    const msg = buildBusinessContactMessage({
      clientName: r.client?.name ?? r.profile?.full_name ?? '',
      resourceName: r.resource?.name ?? null,
      dateLabel: formatLocal(r.starts_at, "EEEE d 'de' MMMM"),
      timeLabel: formatLocal(r.starts_at, 'HH:mm')
    })
    return resolveWhatsAppLink(null, phone, msg)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { start, end } = dayRangeUtc(selectedDate)

    try {
      const data = await fetchReservationsByDate(start, end, filter)
      setReservations(data)
    } catch {
      setError('No pudimos cargar las reservas.')
    }
    setLoading(false)
  }, [filter, selectedDate])

  async function handleConfirm(id: string) {
    setActingId(id)
    setError(null)
    try {
      await confirmReservation(id)
    } catch (err) {
      setError(
        'Error al confirmar: ' + (err instanceof Error ? err.message : '')
      )
      setActingId(null)
      return
    }
    setActingId(null)
    await load()
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      setError('Escribe un motivo para el rechazo.')
      return
    }
    setActingId(id)
    setError(null)
    try {
      await rejectReservation(id, rejectReason.trim())
    } catch (err) {
      setError(
        'Error al rechazar: ' + (err instanceof Error ? err.message : '')
      )
      setActingId(null)
      return
    }
    setActingId(null)
    setRejectingId(null)
    setRejectReason('')
    await load()
  }

  async function handleCancelByBusiness(id: string) {
    if (!cancelReason.trim()) {
      setError('Escribe un motivo para la cancelación.')
      return
    }
    setActingId(id)
    setError(null)
    try {
      await cancelReservationByBusiness(id, cancelReason.trim())
    } catch (err) {
      setError(
        'Error al cancelar: ' + (err instanceof Error ? err.message : '')
      )
      setActingId(null)
      return
    }
    setActingId(null)
    setCancellingId(null)
    setCancelReason('')
    await load()
  }

  useEffect(() => {
    load()
  }, [load])

  // Realtime: recargar cuando cambien reservas
  useReservationsRealtime(load)

  // Ordenar: 1) pendientes antiguas, 2) próximas, 3) vencidas
  const sortedReservations = useMemo(
    () => sortReservationsByPriority(reservations),
    [reservations]
  )

  return (
    <div className='flex flex-col gap-5'>
      {/* Header */}
      <div className='animate-fade-up'>
        <h1 className='text-2xl font-bold tracking-tight'>Reservas</h1>
        <p className='text-sm text-(--color-text-muted) mt-0.5'>
          Filtra por fecha y estado para gestionar.
        </p>
        <p className='text-xs text-(--color-text-muted) mt-1'>
          Cada reserva aparece una sola vez. Al terminar el turno, pasa a
          Completadas.
        </p>
      </div>

      {/* Date picker — styled */}
      <div
        className='flex items-center gap-2 animate-fade-up'
        data-tour='admin-reservations-date'
        style={{ animationDelay: '60ms' }}
      >
        <div className='relative flex-1'>
          <CalendarIcon
            size={18}
            className='absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none'
          />
          <input
            type='date'
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className='w-full rounded-xl border border-border bg-surface-inset pl-11 pr-4 py-3 text-base text-(--color-text) focus:bg-surface-elevated focus:border-(--color-primary) focus:outline-none focus:ring-4 focus:ring-(--color-primary)/15 transition-all duration-200 ease-spring touch-target'
          />
        </div>
      </div>

      {/* Filter chips */}
      <div
        className='scrollbar-none flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 animate-fade-up'
        data-tour='admin-reservations-filters'
        style={{ animationDelay: '60ms' }}
      >
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-medium border whitespace-nowrap transition-all duration-200 ease-spring snap-start ${
              filter === f.key
                ? 'bg-(--color-primary) text-white border-(--color-primary) shadow-(--shadow-pitch)'
                : 'bg-surface-elevated text-(--color-text-muted) border-border hover:border-graphite-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <Alert variant='error' onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <ReservationSkeleton key={i} />
          ))}
        </div>
      ) : sortedReservations.length === 0 ? (
        <Card className='p-8 text-center animate-fade-up'>
          <div className='flex flex-col items-center gap-3'>
            <div className='w-12 h-12 rounded-2xl bg-surface-inset flex items-center justify-center text-text-muted'>
              <InboxIcon size={24} />
            </div>
            <p className='text-text-muted text-sm'>
              No hay reservas para este filtro.
            </p>
          </div>
        </Card>
      ) : (
        <div className='flex flex-col gap-2.5'>
          {sortedReservations.map((r, index) => (
            <Card
              key={r.id}
              data-tour={index === 0 ? 'admin-reservations-card' : undefined}
              className={`p-4 animate-stagger ${r.status === 'pending' ? 'border-l-4 border-l-yellow-400' : ''}`}
              style={{ '--index': index } as React.CSSProperties}
            >
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0 flex-1'>
                  <p className='font-medium text-sm flex items-center gap-1.5'>
                    <span className='nums font-bold text-primary'>
                      {formatLocal(r.starts_at, 'HH:mm')}
                    </span>
                    <span className='text-text-muted'>·</span>
                    <span className='truncate'>{r.resource?.name}</span>
                  </p>
                  <p className='text-xs text-(--color-text-muted) mt-1 flex items-center gap-1.5'>
                    <UserIcon size={12} className='shrink-0' />
                    <span className='truncate'>
                      {r.client?.name ??
                        r.profile?.full_name ??
                        'Cliente sin nombre'}
                    </span>
                    {!r.client?.user_id && !r.profile && (
                      <span className='text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0'>
                        Invitado
                      </span>
                    )}
                    {(r.client?.phone || r.profile?.phone) && (
                      <>
                        <span>·</span>
                        <span className='nums'>
                          {r.client?.phone ?? r.profile?.phone}
                        </span>
                      </>
                    )}
                  </p>
                  {r.notes && (
                    <p className='text-xs italic text-(--color-text-muted) mt-1.5 border-l-2 border-border pl-2'>
                      {r.notes}
                    </p>
                  )}
                  {r.decision_reason && (
                    <p className='text-xs text-(--color-text-muted) mt-1.5'>
                      Motivo: {r.decision_reason}
                    </p>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </div>

              {/* Action bar — WhatsApp siempre disponible + acciones por estado */}
              <div className='mt-3 pt-3 border-t border-border'>
                {rejectingId === r.id ? (
                  <div className='flex flex-col gap-2.5 animate-fade-up'>
                    <Input
                      label='Motivo del rechazo'
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder='Ej: recurso en mantenimiento'
                      autoFocus
                    />
                    <div className='flex gap-2'>
                      <Button
                        variant='danger'
                        size='sm'
                        loading={actingId === r.id}
                        onClick={() => handleReject(r.id)}
                      >
                        Confirmar rechazo
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                          setRejectingId(null)
                          setRejectReason('')
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : cancellingId === r.id ? (
                  <div className='flex flex-col gap-2.5 animate-fade-up'>
                    <Input
                      label='Motivo de cancelación'
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder='Ej: el cliente no llegó'
                      autoFocus
                    />
                    <div className='flex gap-2'>
                      <Button
                        variant='danger'
                        size='sm'
                        loading={actingId === r.id}
                        onClick={() => handleCancelByBusiness(r.id)}
                      >
                        Confirmar cancelación
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                          setCancellingId(null)
                          setCancelReason('')
                        }}
                      >
                        Cerrar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className='flex items-center gap-2 flex-wrap'>
                    {/* WhatsApp — acción de contacto, sutil pero visible */}
                    {buildReservationWhatsAppLink(r) && (
                      <a
                        href={buildReservationWhatsAppLink(r)!}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors touch-target'
                        aria-label={`WhatsApp a ${r.client?.name ?? r.profile?.full_name ?? 'cliente'}`}
                      >
                        <WhatsAppIcon size={16} />
                        <span className='hidden sm:inline'>WhatsApp</span>
                      </a>
                    )}

                    {/* Spacer empuja las acciones a la derecha en desktop */}
                    <div className='flex gap-2 ml-auto'>
                      {r.status === 'pending' && (
                        <>
                          <Button
                            variant='success'
                            size='sm'
                            loading={actingId === r.id}
                            onClick={() => handleConfirm(r.id)}
                          >
                            <CheckIcon size={16} />
                            Confirmar
                          </Button>
                          <Button
                            variant='danger'
                            size='sm'
                            onClick={() => setRejectingId(r.id)}
                          >
                            <XIcon size={16} />
                            Rechazar
                          </Button>
                        </>
                      )}
                      {r.status === 'confirmed' && (
                        <Button
                          variant='danger'
                          size='sm'
                          data-tour='admin-reservations-cancel'
                          onClick={() => setCancellingId(r.id)}
                        >
                          <XIcon size={16} />
                          Cancelar reserva
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
