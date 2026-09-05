import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import {
  fetchUserReservations,
  fetchReservationById
} from '@/services/reservations'
import { fetchBusinessContactById } from '@/services/business'
import { useTenant } from '@/hooks/use-tenant'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { StatusBadge } from '@/components/common/badge'
import { Alert } from '@/components/common/alert'
import { ReservationSkeleton } from '@/components/common/skeleton'
import { ReservationDetailsSheet } from '@/components/common/reservation-details-sheet'
import { ReservationActionControls } from '@/components/common/reservation-action-controls'
import { canClientCancelReservation } from '@/lib/reservation-status'
import {
  CalendarPlusIcon,
  InboxIcon,
  WhatsAppIcon,
  ChevronRightIcon
} from '@/components/common/icon'
import { resolveWhatsAppLink, buildClientPendingMessage } from '@/lib/whatsapp'
import type { Reservation } from '@/types'
import { parseISO, isAfter } from 'date-fns'
import { formatLocal } from '@/lib/time'
import { useReservationsRealtime } from '@/hooks/use-reservations-realtime'
import { useSwipeTabs } from '@/hooks/use-swipe-tabs'
import { sortReservationsByPriority } from '@/lib/sort'

type Filter = 'upcoming' | 'pending' | 'confirmed' | 'past'

const filters: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'Próximas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'past', label: 'Pasadas' }
]

type MyReservationsPageProps = {
  slug?: string
}

export function MyReservationsPage({ slug }: MyReservationsPageProps = {}) {
  const { user, profile } = useAuthStore()
  const { business } = useTenant(slug)
  const tenantBusinessId = business?.id ?? null
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null)
  const closeReservationDetails = useCallback(
    () => setSelectedReservation(null),
    []
  )
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [error, setError] = useState<string | null>(null)
  // Deep link desde correos: /b/{slug}/mis-reservas?reservation={id}
  const [deepLinkId] = useState(() =>
    new URLSearchParams(window.location.search).get('reservation')
  )
  const deepLinkHandled = useRef(false)
  const [businessPhone, setBusinessPhone] = useState<string | null>(null)
  const [businessWhatsappLink, setBusinessWhatsappLink] = useState<
    string | null
  >(null)
  const [businessName, setBusinessName] = useState<string>('')
  const [resourceLabelSingular, setResourceLabelSingular] = useState('Recurso')

  const loadReservations = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const data = await fetchUserReservations(user.id)
      setReservations(data)
    } catch {
      setError('No pudimos cargar tus reservas.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  // Cargar teléfono del negocio para el botón de WhatsApp
  useEffect(() => {
    if (!tenantBusinessId) return
    fetchBusinessContactById(tenantBusinessId)
      .then((data) => {
        if (data) {
          setBusinessPhone(data.phone)
          setBusinessWhatsappLink(data.whatsapp_link)
          setBusinessName(data.name)
          setResourceLabelSingular(data.resource_label_singular || 'Recurso')
        }
      })
      .catch(() => {})
  }, [tenantBusinessId])

  // Realtime: recargar cuando el admin confirme/rechace/cancele
  useReservationsRealtime(
    loadReservations,
    user?.id ? `user_id=eq.${user.id}` : undefined
  )

  const filtered = reservations.filter((r) => {
    const now = new Date()
    const start = parseISO(r.starts_at)
    switch (filter) {
      case 'upcoming':
        return (
          isAfter(start, now) && ['pending', 'confirmed'].includes(r.status)
        )
      case 'pending':
        return r.status === 'pending'
      case 'confirmed':
        return r.status === 'confirmed'
      case 'past':
        return (
          !isAfter(start, now) ||
          [
            'completed',
            'cancelled_by_client',
            'cancelled_by_business',
            'rejected',
            'expired'
          ].includes(r.status)
        )
      default:
        return true
    }
  })

  // Ordenar: 1) pendientes antiguas, 2) próximas, 3) vencidas
  const sorted = sortReservationsByPriority(filtered)

  const cancellationLimitHours = business?.cancellation_limit_hours ?? 2

  function canCancel(r: Reservation): boolean {
    return canClientCancelReservation(r, cancellationLimitHours)
  }

  // Tras una acción: recargar el listado y refrescar la reserva abierta
  const handleReservationChanged = useCallback(
    async (reservationId: string) => {
      await loadReservations()
      try {
        const updated = await fetchReservationById(reservationId)
        setSelectedReservation(updated)
      } catch {
        setSelectedReservation(null)
      }
    },
    [loadReservations]
  )

  // Deep link: abrir la reserva del correo aunque no esté en el filtro visible
  useEffect(() => {
    if (deepLinkHandled.current || !deepLinkId || loading) return
    deepLinkHandled.current = true
    const match = reservations.find((r) => r.id === deepLinkId)
    if (match) {
      setSelectedReservation(match)
      return
    }
    fetchReservationById(deepLinkId)
      .then((reservation) => {
        if (reservation) {
          setSelectedReservation(reservation)
        } else {
          setError('No encontramos esa reserva o no tienes acceso a ella.')
        }
      })
      .catch(() => setError('No pudimos cargar la reserva.'))
  }, [deepLinkId, loading, reservations])

  function buildReservationWhatsAppLink(r: Reservation): string | null {
    const msg = buildClientPendingMessage({
      businessName,
      resourceName: r.resource?.name ?? resourceLabelSingular,
      resourceLabel: resourceLabelSingular,
      dateLabel: formatLocal(r.starts_at, "EEEE d 'de' MMMM"),
      timeLabel: formatLocal(r.starts_at, 'HH:mm'),
      clientName: profile?.full_name ?? ''
    })
    return resolveWhatsAppLink(businessWhatsappLink, businessPhone, msg)
  }

  const handleFilterSwipe = useCallback((index: number) => {
    const nextFilter = filters[index]
    if (nextFilter) setFilter(nextFilter.key)
  }, [])
  const swipeHandlers = useSwipeTabs({
    activeIndex: filters.findIndex((item) => item.key === filter),
    tabCount: filters.length,
    onIndexChange: handleFilterSwipe
  })

  return (
    <div className='flex flex-col gap-5'>
      <div className='animate-fade-up'>
        <h1 className='text-2xl font-bold tracking-tight'>Mis reservas</h1>
        <p className='text-sm text-(--color-text-muted) mt-0.5'>
          Gestiona tus solicitudes de turnos.
        </p>
      </div>

      {/* Filter chips */}
      <div
        className='scrollbar-none flex touch-pan-x overscroll-x-contain gap-2 overflow-x-auto pb-2 -mx-4 px-4 animate-fade-up'
        style={{ animationDelay: '60ms' }}
        data-tour='reservations-filters'
      >
        {filters.map((f) => (
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
        <Alert variant='error' className='animate-fade-up'>
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
        ) : sorted.length === 0 ? (
          <Card className='p-8 text-center animate-fade-up'>
            <div className='flex flex-col items-center gap-4'>
              <div className='w-14 h-14 rounded-2xl bg-surface-inset flex items-center justify-center text-text-muted'>
                <InboxIcon size={28} />
              </div>
              <div>
                <p className='font-medium text-(--color-text) mb-1'>
                  No tienes reservas aquí
                </p>
                <p className='text-sm text-text-muted'>
                  {filter === 'upcoming' &&
                    'Busca un turno disponible y solicita tu reserva.'}
                  {filter === 'pending' &&
                    'No tienes reservas esperando confirmación.'}
                  {filter === 'confirmed' && 'No tienes reservas confirmadas.'}
                  {filter === 'past' && 'No hay historial de reservas pasadas.'}
                </p>
              </div>
              <Link href={slug ? `/b/${slug}` : '/'}>
                <Button variant='secondary'>
                  <CalendarPlusIcon size={18} />
                  Ver disponibilidad
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className='flex flex-col gap-3'>
            {sorted.map((r, index) => (
              <Card
                key={r.id}
                className={`p-4 animate-stagger ${r.status === 'pending' ? 'border-l-4 border-l-yellow-400' : ''}`}
                style={{ '--index': index } as React.CSSProperties}
                data-tour={index === 0 ? 'reservation-card' : undefined}
              >
                <button
                  type='button'
                  onClick={() => setSelectedReservation(r)}
                  className='w-full cursor-pointer rounded-xl p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) focus-visible:ring-offset-2'
                  aria-label={`Ver detalles de tu reserva de ${r.resource?.name ?? resourceLabelSingular} a las ${formatLocal(r.starts_at, 'HH:mm')}`}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2'>
                        <p className='font-semibold text-(--color-text) tracking-tight'>
                          {r.resource?.name ?? resourceLabelSingular}
                        </p>
                        {r.reservation_number && (
                          <span className='shrink-0 rounded-md bg-surface-inset px-1.5 py-0.5 text-xs font-semibold text-text-muted'>
                            #{r.reservation_number}
                          </span>
                        )}
                      </div>
                      <p className='text-sm text-(--color-text-muted) capitalize mt-0.5'>
                        {formatLocal(r.starts_at, "EEE d 'de' MMMM, HH:mm")}
                      </p>
                    </div>
                    <div className='flex shrink-0 items-center gap-1'>
                      <StatusBadge status={r.status} />
                      <ChevronRightIcon size={18} className='text-text-muted' />
                    </div>
                  </div>

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
                </button>

                {canCancel(r) && (
                  <div className='mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2'>
                    {r.status === 'pending' &&
                      buildReservationWhatsAppLink(r) && (
                        <a
                          href={buildReservationWhatsAppLink(r)!}
                          target='_blank'
                          rel='noopener noreferrer'
                          data-tour={
                            index === 0 ? 'reservation-whatsapp' : undefined
                          }
                          className='flex items-center justify-center gap-2 rounded-lg bg-green-600 text-white font-medium text-sm py-2.5 px-4 hover:bg-green-700 active:scale-95 transition-all duration-200 ease-spring touch-target'
                        >
                          <WhatsAppIcon size={18} />
                          Confirmar por WhatsApp
                        </a>
                      )}
                    <ReservationActionControls
                      reservation={r}
                      viewer='client'
                      cancellationLimitHours={cancellationLimitHours}
                      onChanged={handleReservationChanged}
                      cancelTourKey={
                        index === 0 ? 'reservation-cancel' : undefined
                      }
                    />
                  </div>
                )}

                {r.status === 'confirmed' && !canCancel(r) && business && (
                  <p className='text-xs text-text-muted mt-2 pt-2 border-t border-border'>
                    La cancelación directa está disponible hasta{' '}
                    {cancellationLimitHours}{' '}
                    {cancellationLimitHours === 1 ? 'hora' : 'horas'} antes del
                    turno.
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
      {selectedReservation && (
        <ReservationDetailsSheet
          reservation={selectedReservation}
          onClose={closeReservationDetails}
          resourceLabel={resourceLabelSingular}
          whatsappHref={buildReservationWhatsAppLink(selectedReservation)}
          actions={
            <ReservationActionControls
              reservation={selectedReservation}
              viewer='client'
              cancellationLimitHours={cancellationLimitHours}
              onChanged={handleReservationChanged}
              framed
            />
          }
        />
      )}
    </div>
  )
}
