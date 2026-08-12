import { useState, useEffect, useCallback } from 'react'
import { Link } from 'wouter'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { StatusBadge } from '@/components/common/badge'
import { Alert } from '@/components/common/alert'
import { ReservationSkeleton } from '@/components/common/skeleton'
import { CalendarPlusIcon, InboxIcon } from '@/components/common/icon'
import type { Reservation } from '@/types'
import { parseISO, isAfter, subHours } from 'date-fns'
import { formatLocal } from '@/lib/time'

type Filter = 'upcoming' | 'pending' | 'confirmed' | 'past'

export function MyReservationsPage() {
  const { user } = useAuthStore()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadReservations = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data, error: err } = await supabase
      .from('reservations')
      .select('*, court:courts(*)')
      .eq('user_id', user.id)
      .order('starts_at', { ascending: false })

    setLoading(false)

    if (err) {
      setError('No pudimos cargar tus reservas.')
      return
    }

    setReservations((data as Reservation[]) ?? [])
  }, [user])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  const filtered = reservations.filter((r) => {
    const now = new Date()
    const start = parseISO(r.starts_at)
    switch (filter) {
      case 'upcoming':
        return isAfter(start, now) && ['pending', 'confirmed'].includes(r.status)
      case 'pending':
        return r.status === 'pending'
      case 'confirmed':
        return r.status === 'confirmed'
      case 'past':
        return !isAfter(start, now) || ['completed', 'cancelled_by_client', 'cancelled_by_business', 'rejected', 'expired'].includes(r.status)
      default:
        return true
    }
  })

  function canCancel(r: Reservation): boolean {
    if (!['pending', 'confirmed'].includes(r.status)) return false
    if (r.status === 'pending') return true
    const start = parseISO(r.starts_at)
    const limit = subHours(start, 2)
    return isAfter(limit, new Date())
  }

  async function handleCancel(id: string) {
    if (!confirm('¿Seguro que quieres cancelar esta reserva?')) return
    setCancellingId(id)
    setError(null)

    const { error: rpcError } = await supabase.rpc(
      'cancel_reservation_by_client',
      {
        p_reservation_id: id
      }
    )

    setCancellingId(null)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    await loadReservations()
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'upcoming', label: 'Próximas' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'confirmed', label: 'Confirmadas' },
    { key: 'past', label: 'Pasadas' },
  ]

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
        className='flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 animate-fade-up'
        style={{ animationDelay: '60ms' }}
      >
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-all duration-200 ease-spring touch-target ${
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

      {loading ? (
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <ReservationSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
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
            <Link href='/'>
              <Button variant='secondary'>
                <CalendarPlusIcon size={18} />
                Ver disponibilidad
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className='flex flex-col gap-3'>
          {filtered.map((r, index) => (
            <Card
              key={r.id}
              className={`p-4 animate-stagger ${r.status === 'pending' ? 'border-l-4 border-l-yellow-400' : ''}`}
              style={{ '--index': index } as React.CSSProperties}
            >
              <div className='flex items-start justify-between gap-3 mb-2'>
                <div className='min-w-0 flex-1'>
                  <p className='font-semibold text-(--color-text) tracking-tight'>
                    {r.court?.name ?? 'Cancha'}
                  </p>
                  <p className='text-sm text-(--color-text-muted) capitalize mt-0.5'>
                    {formatLocal(r.starts_at, "EEE d 'de' MMMM, HH:mm")}
                  </p>
                </div>
                <StatusBadge status={r.status} />
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

              {canCancel(r) && (
                <div className='mt-3 pt-3 border-t border-border'>
                  <Button
                    variant='danger'
                    size='sm'
                    loading={cancellingId === r.id}
                    onClick={() => handleCancel(r.id)}
                  >
                    Cancelar reserva
                  </Button>
                </div>
              )}

              {r.status === 'confirmed' && !canCancel(r) && (
                <p className='text-xs text-text-muted mt-2 pt-2 border-t border-border'>
                  La cancelación directa está disponible hasta 2 horas antes del
                  turno.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
