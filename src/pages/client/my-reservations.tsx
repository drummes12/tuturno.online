import { useState, useEffect, useCallback } from 'react'
import { Link } from 'wouter'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { StatusBadge } from '@/components/common/badge'
import { Spinner } from '@/components/common/spinner'
import type { Reservation } from '@/types'
import { format, parseISO, isAfter, subHours } from 'date-fns'
import { es } from 'date-fns/locale'

type Filter = 'upcoming' | 'pending' | 'confirmed' | 'past'

export function MyReservationsPage() {
  const { user } = useAuthStore()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const loadReservations = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data, error } = await supabase
      .from('reservations')
      .select('*, court:courts(*)')
      .eq('user_id', user.id)
      .order('starts_at', { ascending: false })

    setLoading(false)

    if (error) {
      console.error('Error loading reservations:', error)
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
    // Las pendientes se pueden cancelar siempre (sin límite de tiempo)
    if (r.status === 'pending') return true
    // Las confirmadas solo hasta N horas antes (el RPC valida con cancellation_limit_hours del negocio)
    const start = parseISO(r.starts_at)
    const limit = subHours(start, 2)
    return isAfter(limit, new Date())
  }

  async function handleCancel(id: string) {
    if (!confirm('¿Seguro que quieres cancelar esta reserva?')) return
    setCancellingId(id)

    const { error } = await supabase.rpc('cancel_reservation_by_client', {
      p_reservation_id: id,
    })

    setCancellingId(null)

    if (error) {
      alert('No pudimos cancelar la reserva: ' + error.message)
      return
    }

    await loadReservations()
  }

  if (loading) {
    return <div className="py-12"><Spinner size="lg" /></div>
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'upcoming', label: 'Próximas' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'confirmed', label: 'Confirmadas' },
    { key: 'past', label: 'Pasadas' },
  ]

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-bold'>Mis reservas</h1>

      {/* Filter chips */}
      <div className='flex gap-2 overflow-x-auto pb-2 -mx-4 px-4'>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors touch-target ${
              filter === f.key
                ? 'bg-(--color-primary) text-white border-(--color-primary)'
                : 'bg-surface-elevated text-(--color-text-muted) border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className='p-6 text-center'>
          <p className='text-(--color-text-muted) mb-4'>
            No tienes reservas aquí.
          </p>
          <Link href='/'>
            <Button variant='secondary'>Ver disponibilidad</Button>
          </Link>
        </Card>
      ) : (
        <div className='flex flex-col gap-3'>
          {filtered.map((r) => (
            <Card key={r.id} className='p-4'>
              <div className='flex items-start justify-between gap-3 mb-2'>
                <div>
                  <p className='font-semibold text-(--color-text)'>
                    {r.court?.name ?? 'Cancha'}
                  </p>
                  <p className='text-sm text-(--color-text-muted) capitalize'>
                    {format(parseISO(r.starts_at), "EEE d 'de' MMMM, HH:mm", {
                      locale: es
                    })}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              {r.notes && (
                <p className='text-sm text-(--color-text-muted) mt-2 italic'>
                  "{r.notes}"
                </p>
              )}

              {r.decision_reason && (
                <p className='text-sm text-(--color-text-muted) mt-2'>
                  Motivo: {r.decision_reason}
                </p>
              )}

              {canCancel(r) && (
                <div className='mt-3'>
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
                <p className='text-xs text-(--color-text-muted) mt-2'>
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
