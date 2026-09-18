import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearch } from 'wouter'
import { Card } from '@/components/common/card'
import { Alert } from '@/components/common/alert'
import { ReservationCard } from '@/components/common/reservation-card'
import { ReservationSkeleton } from '@/components/common/skeleton'
import { ReservationDetailsSheet } from '@/components/common/reservation-details-sheet'
import { ReservationActionControls } from '@/components/common/reservation-action-controls'
import {
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
import { useBusinessId } from '@/hooks/use-business-id'
import { useSwipeTabs } from '@/hooks/use-swipe-tabs'
import { sortReservationsByPriority } from '@/lib/sort'
import {
  fetchReservationsByDate,
  fetchReservationById
} from '@/services/reservations'
import { markReservationNotificationsRead } from '@/services/notifications'

const statusFilters: { key: ReservationFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'rejected', label: 'Rechazadas' },
  { key: 'cancelled', label: 'Canceladas' },
  { key: 'completed', label: 'Completadas' }
]

export function AdminReservationsPage() {
  const businessId = useBusinessId()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null)
  const closeReservationDetails = useCallback(
    () => setSelectedReservation(null),
    []
  )
  // Deep link desde correos/notificaciones: /admin/reservas?reservation={id}
  const search = useSearch()
  const deepLinkId = new URLSearchParams(search).get('reservation')
  const deepLinkHandled = useRef<string | null>(null)
  const [filter, setFilter] = useState<ReservationFilter>('all')
  const [selectedDate, setSelectedDate] = useState(
    format(toZonedTime(new Date(), BUSINESS_TIMEZONE), 'yyyy-MM-dd')
  )
  const handleFilterSwipe = useCallback((index: number) => {
    const nextFilter = statusFilters[index]
    if (nextFilter) setFilter(nextFilter.key)
  }, [])
  const swipeHandlers = useSwipeTabs({
    activeIndex: statusFilters.findIndex((item) => item.key === filter),
    tabCount: statusFilters.length,
    onIndexChange: handleFilterSwipe
  })

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
    if (!businessId) return
    setLoading(true)
    setError(null)
    const { start, end } = dayRangeUtc(selectedDate)

    try {
      const data = await fetchReservationsByDate(start, end, filter, businessId)
      setReservations(data)
    } catch {
      setError('No pudimos cargar las reservas.')
    }
    setLoading(false)
  }, [filter, selectedDate, businessId])

  // Tras una acción: recargar el listado y refrescar la reserva abierta
  const handleReservationChanged = useCallback(
    async (reservationId: string) => {
      await load()
      try {
        const updated = await fetchReservationById(reservationId)
        setSelectedReservation(updated)
      } catch {
        setSelectedReservation(null)
      }
    },
    [load]
  )

  useEffect(() => {
    load()
  }, [load])

  // Deep link: abrir la reserva aunque no coincida con fecha/filtro actuales
  useEffect(() => {
    if (!deepLinkId || deepLinkHandled.current === deepLinkId) return
    deepLinkHandled.current = deepLinkId
    void markReservationNotificationsRead(deepLinkId).catch(() => {})
    fetchReservationById(deepLinkId)
      .then((reservation) => {
        if (reservation) {
          setSelectedReservation(reservation)
        } else {
          setError('No encontramos la reserva o no tienes acceso a ella.')
        }
      })
      .catch(() => setError('No pudimos cargar la reserva.'))
  }, [deepLinkId])

  // Realtime: recargar cuando cambien reservas del negocio activo
  useReservationsRealtime(
    load,
    businessId ? `business_id=eq.${businessId}` : undefined
  )

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
        className='scrollbar-none flex touch-pan-x overscroll-x-contain gap-2 overflow-x-auto pb-2 -mx-4 px-4 animate-fade-up'
        data-tour='admin-reservations-filters'
        style={{ animationDelay: '60ms' }}
      >
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-4 py-2.5 rounded-full font-mono text-[11px] font-medium uppercase tracking-[0.14em] border whitespace-nowrap transition-all duration-200 ease-spring snap-start ${
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

      <div {...swipeHandlers} className='swipe-track touch-pan-y'>
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
          <div className='grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3'>
            {sortedReservations.map((r, index) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                onOpen={setSelectedReservation}
                index={index}
                tourKey={index === 0 ? 'admin-reservations-card' : undefined}
                info={
                  <p className='text-xs text-(--color-text-muted) mt-1.5 flex items-center gap-1.5'>
                    <UserIcon size={12} className='shrink-0' />
                    <span className='truncate'>
                      {r.client?.name ??
                        r.profile?.full_name ??
                        'Cliente sin nombre'}
                    </span>
                    {!r.client?.user_id && !r.profile && (
                      <span className='font-mono text-[11px] font-medium uppercase tracking-wide text-yellow-800 bg-flood-500/15 dark:text-flood-300 px-1.5 py-0.5 rounded-full shrink-0'>
                        Invitado
                      </span>
                    )}
                  </p>
                }
                footer={
                  <>
                    {buildReservationWhatsAppLink(r) && (
                      <a
                        href={buildReservationWhatsAppLink(r)!}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center gap-1.5 text-sm font-medium text-pitch-700 hover:bg-pitch-100 dark:text-pitch-300 dark:hover:bg-pitch-500/15 px-3 py-1.5 rounded-lg transition-colors touch-target'
                        aria-label={`WhatsApp a ${r.client?.name ?? r.profile?.full_name ?? 'cliente'}`}
                      >
                        <WhatsAppIcon size={16} />
                        <span className='hidden sm:inline'>WhatsApp</span>
                      </a>
                    )}
                    <div className='flex gap-2 ml-auto'>
                      <ReservationActionControls
                        reservation={r}
                        viewer='business'
                        onChanged={handleReservationChanged}
                        cancelTourKey='admin-reservations-cancel'
                      />
                    </div>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>
      {selectedReservation && (
        <ReservationDetailsSheet
          reservation={selectedReservation}
          onClose={closeReservationDetails}
          whatsappHref={buildReservationWhatsAppLink(selectedReservation)}
          actions={
            <ReservationActionControls
              reservation={selectedReservation}
              viewer='business'
              onChanged={handleReservationChanged}
              framed
            />
          }
        />
      )}
    </div>
  )
}
