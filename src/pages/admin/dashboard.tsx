import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode
} from 'react'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { StatusBadge } from '@/components/common/badge'
import { Input } from '@/components/common/input'
import { Alert } from '@/components/common/alert'
import { ReservationCard } from '@/components/common/reservation-card'
import { ReservationDetailsSheet } from '@/components/common/reservation-details-sheet'
import { ReservationActionControls } from '@/components/common/reservation-action-controls'
import { ReservationSkeleton } from '@/components/common/skeleton'
import {
  CheckIcon,
  XIcon,
  UserIcon,
  PhoneIcon,
  ClockIcon,
  InboxIcon,
  CalendarIcon,
  WhatsAppIcon
} from '@/components/common/icon'
import type { Reservation } from '@/types'
import { format } from 'date-fns'
import { dayRangeUtc, formatLocal, BUSINESS_TIMEZONE } from '@/lib/time'
import {
  resolveWhatsAppLink,
  buildBusinessContactMessage
} from '@/lib/whatsapp'
import { toZonedTime } from 'date-fns-tz'
import { useReservationsRealtime } from '@/hooks/use-reservations-realtime'
import { useBusinessId } from '@/hooks/use-business-id'
import { useIsOffline } from '@/hooks/use-connectivity'
import { sortReservationsByPriority } from '@/lib/sort'
import { parseISO, isAfter, differenceInMinutes } from 'date-fns'
import {
  fetchPendingReservations,
  fetchTodayReservations,
  fetchReservationById,
  confirmReservation,
  rejectReservation
} from '@/services/reservations'
import { Page } from '@/components/layout/page'

/** Antigüedad compacta de una solicitud: "15 min", "3 h", "2 d". */
function waitLabel(createdAt: string): string {
  const mins = differenceInMinutes(new Date(), parseISO(createdAt))
  if (mins < 60) return `${Math.max(mins, 1)} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h`
  return `${Math.floor(hours / 24)} d`
}

/** Fila del board "Reservas de hoy": hora mono + recurso + cliente + estado. */
function TodayRow({
  reservation: r,
  whatsappHref,
  past,
  onOpen
}: {
  reservation: Reservation
  whatsappHref: string | null
  past?: boolean
  onOpen: (reservation: Reservation) => void
}) {
  return (
    <li className={past ? 'opacity-60' : ''}>
      <div
        role='button'
        tabIndex={0}
        onClick={() => onOpen(r)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen(r)
          }
        }}
        className='group flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) focus-visible:ring-inset dark:hover:bg-white/6'
        aria-label={`Ver detalles de la reserva de ${r.resource?.name ?? 'recurso'} a las ${formatLocal(r.starts_at, 'HH:mm')}`}
      >
        <span
          className={`w-12 shrink-0 nums font-mono text-sm font-semibold ${past ? 'text-text-muted dark:text-chalk-dim/60' : 'text-(--color-text) dark:text-chalk'}`}
        >
          {formatLocal(r.starts_at, 'HH:mm')}
        </span>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium dark:text-chalk'>
            {r.resource?.name}
          </p>
          <p className='mt-0.5 flex items-center gap-1 truncate text-xs text-(--color-text-muted) dark:text-chalk-dim/70'>
            <UserIcon size={12} className='shrink-0' />
            <span className='truncate'>
              {r.client?.name ?? r.profile?.full_name ?? 'Cliente'}
            </span>
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-1.5'>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target='_blank'
              rel='noopener noreferrer'
              onClick={(e) => e.stopPropagation()}
              className='flex h-8 w-8 items-center justify-center rounded-lg text-pitch-700 transition-colors hover:bg-pitch-100 dark:text-pitch-300 dark:hover:bg-pitch-500/15'
              aria-label={`WhatsApp a ${r.client?.name ?? r.profile?.full_name ?? 'cliente'}`}
            >
              <WhatsAppIcon size={16} />
            </a>
          )}
          <StatusBadge status={r.status} />
        </div>
      </div>
    </li>
  )
}

/** Grupo del board "Reservas de hoy": header (icono + label + rango + conteo) + board con filas divididas. */
function TodayGroup({
  icon,
  label,
  reservations,
  past,
  buildWhatsAppLink,
  onOpen
}: {
  icon: ReactNode
  label: string
  reservations: Reservation[]
  past?: boolean
  buildWhatsAppLink: (r: Reservation) => string | null
  onOpen: (reservation: Reservation) => void
}) {
  const first = formatLocal(reservations[0].starts_at, 'HH:mm')
  const last = formatLocal(
    reservations[reservations.length - 1].starts_at,
    'HH:mm'
  )
  return (
    <section className='self-start w-full'>
      <div className='mb-3 flex items-center justify-between'>
        <div className='flex items-center gap-2.5'>
          <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-surface-inset text-text-muted'>
            {icon}
          </span>
          <div>
            <h3 className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text)'>
              {label}
            </h3>
            <p className='text-[11px] text-text-muted nums font-mono'>
              {first} – {last}
            </p>
          </div>
        </div>
        <span className='rounded-full border border-border bg-surface-inset px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted nums dark:border-white/10 dark:bg-white/5'>
          {reservations.length} turno{reservations.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className='overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-(--shadow-sm) dark:border-white/10 dark:bg-pitch-950 dark:text-chalk'>
        <ul className='flex flex-col divide-y divide-border dark:divide-white/10'>
          {reservations.map((r) => (
            <TodayRow
              key={r.id}
              reservation={r}
              whatsappHref={buildWhatsAppLink(r)}
              past={past}
              onOpen={onOpen}
            />
          ))}
        </ul>
      </div>
    </section>
  )
}

export function AdminDashboardPage() {
  const businessId = useBusinessId()
  const offline = useIsOffline()
  const [pending, setPending] = useState<Reservation[]>([])
  const [today, setToday] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null)
  const closeReservationDetails = useCallback(
    () => setSelectedReservation(null),
    []
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
    if (!businessId) return
    setLoading(true)
    setError(null)
    const now = new Date()
    const todayStr = format(toZonedTime(now, BUSINESS_TIMEZONE), 'yyyy-MM-dd')
    const { start, end } = dayRangeUtc(todayStr)

    try {
      const [pendingData, todayData] = await Promise.all([
        fetchPendingReservations(businessId),
        fetchTodayReservations(start, end, businessId)
      ])
      setPending(pendingData)
      setToday(todayData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    }
    setLoading(false)
  }, [businessId])

  useEffect(() => {
    load()
  }, [load])

  // Tras una acción en el sheet: recargar y refrescar la reserva abierta
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

  // Realtime: recargar cuando cambien reservas del negocio activo
  useReservationsRealtime(
    load,
    businessId ? `business_id=eq.${businessId}` : undefined
  )

  // Pendientes ordenadas: más antiguas primero (mayor urgencia)
  const sortedPending = useMemo(
    () => sortReservationsByPriority(pending),
    [pending]
  )

  // Reservas de hoy separadas en próximas y ya pasadas
  const { todayUpcoming, todayPast } = useMemo(() => {
    const now = new Date()
    const upcoming: Reservation[] = []
    const past: Reservation[] = []
    for (const r of today) {
      if (isAfter(parseISO(r.starts_at), now)) {
        upcoming.push(r)
      } else {
        past.push(r)
      }
    }
    return { todayUpcoming: upcoming, todayPast: past }
  }, [today])

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

  if (loading) {
    return (
      <div className='flex flex-col gap-6'>
        <div>
          <div className='h-8 w-40 skeleton rounded-lg' />
        </div>
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 2 }).map((_, i) => (
            <ReservationSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Page>
      {/* Header */}
      <div className='animate-fade-up'>
        <p className='text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted'>
          {formatLocal(new Date().toISOString(), "EEEE d 'de' MMMM")}
        </p>
        <h1 className='text-2xl font-bold tracking-tight mt-1'>Operación</h1>
        <p className='text-sm text-(--color-text-muted) mt-0.5'>
          Solicitudes pendientes y agenda de hoy.
        </p>
      </div>

      {error && (
        <Alert variant='error' onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Pending queue — priority */}
      <section data-tour='admin-pending-section'>
        <div className='flex items-center gap-2 mb-3'>
          <ClockIcon size={16} className='text-text-muted' />
          <h2 className='text-xs font-medium uppercase tracking-[0.14em] text-text-muted'>
            Solicitudes pendientes
          </h2>
          {sortedPending.length > 0 && (
            <span className='flex items-center gap-1.5 ml-auto px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-800 dark:text-orange-300 text-[11px] font-medium uppercase tracking-[0.14em] border border-orange-500/40 nums whitespace-nowrap'>
              <span className='w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse' />
              {sortedPending.length}
            </span>
          )}
        </div>

        {sortedPending.length === 0 ? (
          <Card className='p-8 text-center animate-fade-up'>
            <div className='flex flex-col items-center gap-3'>
              <div className='w-12 h-12 rounded-2xl bg-pitch-100 flex items-center justify-center text-pitch-600 dark:bg-pitch-500/15 dark:text-pitch-300'>
                <CheckIcon size={24} />
              </div>
              <p className='text-text-muted text-sm'>
                No hay solicitudes pendientes.
              </p>
            </div>
          </Card>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
            {sortedPending.map((r, index) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                elevated
                showStatus={false}
                index={index}
                tourKey={index === 0 ? 'admin-pending-card' : undefined}
                meta={
                  <span className='flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-orange-800 dark:text-orange-300 nums'>
                    <ClockIcon size={12} />
                    {waitLabel(r.created_at)}
                  </span>
                }
                info={
                  <div className='text-sm flex flex-col gap-1.5 mt-2 bg-surface-inset rounded-lg p-3'>
                    <p className='flex items-center gap-2'>
                      <UserIcon
                        size={14}
                        className='text-text-muted shrink-0'
                      />
                      <span className='font-medium'>
                        {r.client?.name ?? r.profile?.full_name ?? 'Cliente'}
                      </span>
                    </p>
                    <p className='flex items-center gap-2'>
                      <PhoneIcon
                        size={14}
                        className='text-text-muted shrink-0'
                      />
                      <span className='font-medium nums'>
                        {r.client?.phone ?? r.profile?.phone}
                      </span>
                    </p>
                  </div>
                }
                footer={
                  rejectingId === r.id ? (
                    <div className='flex w-full flex-col gap-2.5 animate-fade-up'>
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
                          disabled={offline}
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
                  ) : (
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
                        <Button
                          variant='success'
                          size='sm'
                          data-tour='admin-confirm-btn'
                          loading={actingId === r.id}
                          disabled={offline}
                          onClick={() => handleConfirm(r.id)}
                        >
                          <CheckIcon size={16} />
                          Confirmar
                        </Button>
                        <Button
                          variant='danger'
                          size='sm'
                          data-tour='admin-reject-btn'
                          disabled={offline}
                          onClick={() => setRejectingId(r.id)}
                        >
                          <XIcon size={16} />
                          Rechazar
                        </Button>
                      </div>
                    </>
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Today's schedule — separadas en próximas y pasadas */}
      <section data-tour='admin-today-section'>
        <div className='flex items-center gap-2 mb-3'>
          <CalendarIcon size={16} className='text-text-muted' />
          <h2 className='text-xs font-medium uppercase tracking-[0.14em] text-text-muted'>
            Reservas de hoy
          </h2>
        </div>
        {today.length === 0 ? (
          <Card className='p-6 text-center animate-fade-up'>
            <div className='flex flex-col items-center gap-2'>
              <InboxIcon size={20} className='text-text-muted' />
              <p className='text-sm text-text-muted'>Sin reservas para hoy.</p>
            </div>
          </Card>
        ) : (
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            {todayUpcoming.length > 0 && (
              <TodayGroup
                icon={<ClockIcon size={16} />}
                label='Próximas'
                reservations={todayUpcoming}
                buildWhatsAppLink={buildReservationWhatsAppLink}
                onOpen={setSelectedReservation}
              />
            )}
            {todayPast.length > 0 && (
              <TodayGroup
                icon={<CheckIcon size={16} />}
                label='Ya pasadas'
                reservations={todayPast}
                past
                buildWhatsAppLink={buildReservationWhatsAppLink}
                onOpen={setSelectedReservation}
              />
            )}
          </div>
        )}
      </section>
      {selectedReservation && (
        <ReservationDetailsSheet
          reservation={selectedReservation}
          onClose={closeReservationDetails}
          viewer='business'
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
    </Page>
  )
}
