import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/common/card'
import { Spinner } from '@/components/common/spinner'
import { StatusBadge } from '@/components/common/badge'
import type { Reservation, ReservationStatus } from '@/types'
import { format, parseISO } from 'date-fns'

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
  const [filter, setFilter] = useState<ReservationStatus | 'all'>('all')
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  )

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('reservations')
      .select('*, court:courts(*), profile:profiles(*)')
      .gte('starts_at', `${selectedDate}T00:00:00`)
      .lte('starts_at', `${selectedDate}T23:59:59`)
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
        className='rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-4 py-2.5 text-base touch-target'
      />

      {/* Filter chips */}
      <div className='flex gap-2 overflow-x-auto pb-2 -mx-4 px-4'>
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors touch-target ${
              filter === f.key
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border-[var(--color-border)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner size='lg' />
      ) : reservations.length === 0 ? (
        <Card className='p-6 text-center text-[var(--color-text-muted)]'>
          No hay reservas para este filtro.
        </Card>
      ) : (
        <div className='flex flex-col gap-2'>
          {reservations.map((r) => (
            <Card key={r.id} className='p-3'>
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <p className='font-medium text-sm'>
                    {format(parseISO(r.starts_at), 'HH:mm')} — {r.court?.name}
                  </p>
                  <p className='text-xs text-[var(--color-text-muted)] mt-0.5'>
                    {r.profile?.full_name} · {r.profile?.phone}
                  </p>
                  {r.notes && (
                    <p className='text-xs italic text-[var(--color-text-muted)] mt-1'>
                      "{r.notes}"
                    </p>
                  )}
                  {r.decision_reason && (
                    <p className='text-xs text-[var(--color-text-muted)] mt-1'>
                      Motivo: {r.decision_reason}
                    </p>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
