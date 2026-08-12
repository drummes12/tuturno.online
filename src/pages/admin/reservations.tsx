import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Spinner } from '@/components/common/spinner'
import { StatusBadge } from '@/components/common/badge'
import type { Reservation, ReservationStatus } from '@/types'
import { format } from 'date-fns'
import { dayRangeUtc, formatLocal, BUSINESS_TIMEZONE } from '@/lib/time'
import { toZonedTime } from 'date-fns-tz'

const statusFilters: { key: ReservationStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'rejected', label: 'Rechazadas' },
  { key: 'cancelled_by_client', label: 'Canceladas' },
  { key: 'completed', label: 'Completadas' }
]

export function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [filter, setFilter] = useState<ReservationStatus | 'all'>('all')
  const [selectedDate, setSelectedDate] = useState(
    format(toZonedTime(new Date(), BUSINESS_TIMEZONE), 'yyyy-MM-dd')
  )

  const load = useCallback(async () => {
    setLoading(true)
    const { start, end } = dayRangeUtc(selectedDate)
    let query = supabase
      .from('reservations')
      .select(
        '*, court:courts(*), profile:profiles!reservations_user_id_fkey(*)'
      )
      .gte('starts_at', start)
      .lte('starts_at', end)
      .order('starts_at', { ascending: true })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query
    setLoading(false)

    if (error) {
      console.error(error)
      return
    }

    setReservations((data as Reservation[]) ?? [])
  }, [filter, selectedDate])

  async function handleConfirm(id: string) {
    setActingId(id)
    const { error } = await supabase.rpc('confirm_reservation', {
      p_reservation_id: id
    })
    setActingId(null)
    if (error) {
      alert('Error al confirmar: ' + error.message)
      return
    }
    await load()
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      alert('Por favor escribe un motivo para el rechazo.')
      return
    }
    setActingId(id)
    const { error } = await supabase.rpc('reject_reservation', {
      p_reservation_id: id,
      p_reason: rejectReason.trim()
    })
    setActingId(null)
    setRejectingId(null)
    setRejectReason('')
    if (error) {
      alert('Error al rechazar: ' + error.message)
      return
    }
    await load()
  }

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-bold'>Reservas</h1>

      {/* Date picker */}
      <input
        type='date'
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className='rounded-lg border border-border bg-surface-inset px-4 py-2.5 text-base touch-target'
      />

      {/* Filter chips */}
      <div className='flex gap-2 overflow-x-auto pb-2 -mx-4 px-4'>
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors touch-target ${
              filter === f.key
                ? 'bg-(--color-primary) text-white border-(--color-primary)'
                : 'bg-surface-elevated text-(--color-text-muted) border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner size='lg' />
      ) : reservations.length === 0 ? (
        <Card className='p-6 text-center text-(--color-text-muted)'>
          No hay reservas para este filtro.
        </Card>
      ) : (
        <div className='flex flex-col gap-2'>
          {reservations.map((r) => (
            <Card
              key={r.id}
              className={`p-3 ${r.status === 'pending' ? 'border-l-4 border-l-yellow-400' : ''}`}
            >
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0 flex-1'>
                  <p className='font-medium text-sm'>
                    {formatLocal(r.starts_at, 'HH:mm')} — {r.court?.name}
                  </p>
                  <p className='text-xs text-(--color-text-muted) mt-0.5'>
                    {r.profile?.full_name} · {r.profile?.phone}
                  </p>
                  {r.notes && (
                    <p className='text-xs italic text-(--color-text-muted) mt-1'>
                      "{r.notes}"
                    </p>
                  )}
                  {r.decision_reason && (
                    <p className='text-xs text-(--color-text-muted) mt-1'>
                      Motivo: {r.decision_reason}
                    </p>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </div>

              {r.status === 'pending' && (
                <div className='mt-3'>
                  {rejectingId === r.id ? (
                    <div className='flex flex-col gap-2'>
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
                    <div className='flex gap-2'>
                      <Button
                        variant='success'
                        size='sm'
                        loading={actingId === r.id}
                        onClick={() => handleConfirm(r.id)}
                      >
                        Confirmar
                      </Button>
                      <Button
                        variant='danger'
                        size='sm'
                        onClick={() => setRejectingId(r.id)}
                      >
                        Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
