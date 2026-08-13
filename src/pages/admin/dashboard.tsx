import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { StatusBadge } from '@/components/common/badge'
import { Input } from '@/components/common/input'
import { Alert } from '@/components/common/alert'
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
import { waLink } from '@/lib/whatsapp'
import { toZonedTime } from 'date-fns-tz'
import { useReservationsRealtime } from '@/hooks/use-reservations-realtime'
import { sortReservationsByPriority } from '@/lib/sort'
import { parseISO, isAfter } from 'date-fns'

export function AdminDashboardPage() {
  const [pending, setPending] = useState<Reservation[]>([])
  const [today, setToday] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const now = new Date()
    const todayStr = format(toZonedTime(now, BUSINESS_TIMEZONE), 'yyyy-MM-dd')
    const { start, end } = dayRangeUtc(todayStr)

    const [pendingRes, todayRes] = await Promise.all([
      supabase
        .from('reservations')
        .select(
          '*, court:courts(*), profile:profiles!reservations_user_id_fkey(*)'
        )
        .eq('status', 'pending')
        .order('starts_at', { ascending: true }),
      supabase
        .from('reservations')
        .select(
          '*, court:courts(*), profile:profiles!reservations_user_id_fkey(*)'
        )
        .gte('starts_at', start)
        .lte('starts_at', end)
        .order('starts_at', { ascending: true })
    ])

    setPending((pendingRes.data as Reservation[]) ?? [])
    setToday((todayRes.data as Reservation[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: recargar cuando cambien reservas
  useReservationsRealtime(load)

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
    const { error: rpcError } = await supabase.rpc('confirm_reservation', {
      p_reservation_id: id
    })
    setActingId(null)
    if (rpcError) {
      setError('Error al confirmar: ' + rpcError.message)
      return
    }
    await load()
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      setError('Escribe un motivo para el rechazo.')
      return
    }
    setActingId(id)
    setError(null)
    const { error: rpcError } = await supabase.rpc('reject_reservation', {
      p_reservation_id: id,
      p_reason: rejectReason.trim()
    })
    setActingId(null)
    setRejectingId(null)
    setRejectReason('')
    if (rpcError) {
      setError('Error al rechazar: ' + rpcError.message)
      return
    }
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
    <div className='flex flex-col gap-6'>
      {/* Header */}
      <div className='flex items-center justify-between animate-fade-up'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Operación</h1>
          <p className='text-sm text-(--color-text-muted) mt-0.5'>
            Solicitudes pendientes y agenda de hoy.
          </p>
        </div>
        {pending.length > 0 && (
          <span className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 text-yellow-800 text-sm font-medium border border-yellow-300 nums'>
            <span className='w-2 h-2 rounded-full bg-yellow-500 animate-pulse' />
            {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {error && (
        <Alert variant='error' onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Pending queue — priority */}
      <section>
        <div className='flex items-center gap-2 mb-3'>
          <ClockIcon size={18} className='text-text-muted' />
          <h2 className='text-lg font-semibold tracking-tight'>
            Solicitudes pendientes
          </h2>
        </div>

        {sortedPending.length === 0 ? (
          <Card className='p-8 text-center animate-fade-up'>
            <div className='flex flex-col items-center gap-3'>
              <div className='w-12 h-12 rounded-2xl bg-pitch-100 flex items-center justify-center text-pitch-600'>
                <CheckIcon size={24} />
              </div>
              <p className='text-text-muted text-sm'>
                No hay solicitudes pendientes.
              </p>
            </div>
          </Card>
        ) : (
          <div className='flex flex-col gap-3'>
            {sortedPending.map((r, index) => (
              <Card
                key={r.id}
                elevated
                className={`p-4 border-l-4 border-l-yellow-400 animate-stagger`}
                style={{ '--index': index } as React.CSSProperties}
              >
                <div className='flex items-start justify-between gap-3 mb-3'>
                  <div className='min-w-0 flex-1'>
                    <p className='font-semibold tracking-tight'>
                      {r.court?.name}
                    </p>
                    <p className='text-sm text-(--color-text-muted) capitalize mt-0.5 flex items-center gap-1.5'>
                      <CalendarIcon size={14} />
                      {formatLocal(r.starts_at, "EEE d 'de' MMMM, HH:mm")}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className='text-sm flex flex-col gap-1.5 mb-3 bg-surface-inset rounded-lg p-3'>
                  <p className='flex items-center gap-2'>
                    <UserIcon
                      size={14}
                      className='text-graphite-400 shrink-0'
                    />
                    <span className='text-(--color-text-muted)'>Cliente:</span>
                    <span className='font-medium'>{r.profile?.full_name}</span>
                  </p>
                  <p className='flex items-center gap-2'>
                    <PhoneIcon
                      size={14}
                      className='text-graphite-400 shrink-0'
                    />
                    <span className='text-(--color-text-muted)'>Teléfono:</span>
                    <span className='font-medium nums'>{r.profile?.phone}</span>
                  </p>
                  {r.notes && (
                    <p className='italic text-(--color-text-muted) border-l-2 border-border pl-2 mt-1'>
                      {r.notes}
                    </p>
                  )}
                </div>

                {rejectingId === r.id ? (
                  <div className='flex flex-col gap-2.5 animate-fade-up'>
                    <Input
                      label='Motivo del rechazo'
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder='Ej: cancha en mantenimiento'
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
                ) : (
                  <div className='flex items-center gap-2 flex-wrap'>
                    {waLink(r.profile?.phone) && (
                      <a
                        href={
                          waLink(
                            r.profile?.phone,
                            `Hola ${r.profile?.full_name ?? ''}, te contacto desde la cancha ${r.court?.name ?? ''} sobre tu reserva.`
                          )!
                        }
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors touch-target'
                        aria-label={`WhatsApp a ${r.profile?.full_name ?? 'cliente'}`}
                      >
                        <WhatsAppIcon size={16} />
                        <span className='hidden sm:inline'>WhatsApp</span>
                      </a>
                    )}
                    <div className='flex gap-2 ml-auto'>
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
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Today's schedule — separadas en próximas y pasadas */}
      <section>
        <div className='flex items-center gap-2 mb-3'>
          <CalendarIcon size={18} className='text-text-muted' />
          <h2 className='text-lg font-semibold tracking-tight'>
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
          <div className='flex flex-col gap-4'>
            {/* Próximas de hoy */}
            {todayUpcoming.length > 0 && (
              <div className='flex flex-col gap-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>
                  Próximas
                </p>
                {todayUpcoming.map((r, index) => (
                  <Card
                    key={r.id}
                    className='p-3 animate-stagger'
                    style={{ '--index': index } as React.CSSProperties}
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <div className='min-w-0 flex-1'>
                        <p className='font-medium text-sm truncate flex items-center gap-1.5'>
                          <span className='nums font-bold text-primary'>
                            {formatLocal(r.starts_at, 'HH:mm')}
                          </span>
                          <span className='text-text-muted'>·</span>
                          <span className='truncate'>{r.court?.name}</span>
                        </p>
                        <p className='text-xs text-(--color-text-muted) truncate mt-0.5 flex items-center gap-1'>
                          <UserIcon size={12} />
                          <span className='truncate'>
                            {r.profile?.full_name}
                          </span>
                          {waLink(r.profile?.phone) && (
                            <a
                              href={
                                waLink(
                                  r.profile?.phone,
                                  `Hola ${r.profile?.full_name ?? ''}, te contacto sobre tu reserva.`
                                )!
                              }
                              target='_blank'
                              rel='noopener noreferrer'
                              className='ml-auto flex items-center justify-center w-7 h-7 -mr-1 text-green-700 hover:bg-green-50 rounded-lg transition-colors touch-target shrink-0'
                              aria-label={`WhatsApp a ${r.profile?.full_name ?? 'cliente'}`}
                            >
                              <WhatsAppIcon size={14} />
                            </a>
                          )}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Ya pasadas de hoy */}
            {todayPast.length > 0 && (
              <div className='flex flex-col gap-2'>
                <p className='text-xs font-semibold uppercase tracking-wide text-text-muted'>
                  Ya pasadas
                </p>
                {todayPast.map((r, index) => (
                  <Card
                    key={r.id}
                    className={`p-3 animate-stagger opacity-60 ${r.status === 'completed' ? '' : ''}`}
                    style={{ '--index': index } as React.CSSProperties}
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <div className='min-w-0 flex-1'>
                        <p className='font-medium text-sm truncate flex items-center gap-1.5'>
                          <span className='nums font-bold text-text-muted'>
                            {formatLocal(r.starts_at, 'HH:mm')}
                          </span>
                          <span className='text-text-muted'>·</span>
                          <span className='truncate'>{r.court?.name}</span>
                        </p>
                        <p className='text-xs text-(--color-text-muted) truncate mt-0.5 flex items-center gap-1'>
                          <UserIcon size={12} />
                          <span className='truncate'>
                            {r.profile?.full_name}
                          </span>
                          {waLink(r.profile?.phone) && (
                            <a
                              href={
                                waLink(
                                  r.profile?.phone,
                                  `Hola ${r.profile?.full_name ?? ''}, te contacto sobre tu reserva.`
                                )!
                              }
                              target='_blank'
                              rel='noopener noreferrer'
                              className='ml-auto flex items-center justify-center w-7 h-7 -mr-1 text-green-700 hover:bg-green-50 rounded-lg transition-colors touch-target shrink-0'
                              aria-label={`WhatsApp a ${r.profile?.full_name ?? 'cliente'}`}
                            >
                              <WhatsAppIcon size={14} />
                            </a>
                          )}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
