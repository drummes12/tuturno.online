import { useState, useEffect, useCallback } from 'react'
import { Link } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import {
  fetchUserReservations,
  cancelReservationByClient
} from '@/services/reservations'
import { fetchBusinessContact } from '@/services/business'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { StatusBadge } from '@/components/common/badge'
import { Alert } from '@/components/common/alert'
import { ReservationSkeleton } from '@/components/common/skeleton'
import {
  CalendarPlusIcon,
  InboxIcon,
  WhatsAppIcon
} from '@/components/common/icon'
import { waLink } from '@/lib/whatsapp'
import type { Reservation } from '@/types'
import { parseISO, isAfter, subHours } from 'date-fns'
import { formatLocal } from '@/lib/time'
import { useReservationsRealtime } from '@/hooks/use-reservations-realtime'
import { sortReservationsByPriority } from '@/lib/sort'

type Filter = 'upcoming' | 'pending' | 'confirmed' | 'past'

export function MyReservationsPage() {
  const { user, profile } = useAuthStore()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [businessPhone, setBusinessPhone] = useState<string | null>(null)
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
    fetchBusinessContact()
      .then((data) => {
        if (data) {
          setBusinessPhone(data.phone)
          setBusinessName(data.name)
          setResourceLabelSingular(data.resource_label_singular || 'Recurso')
        }
      })
      .catch(() => {})
  }, [])

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

    try {
      await cancelReservationByClient(id)
      await loadReservations()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No pudimos cancelar la reserva.'
      )
    } finally {
      setCancellingId(null)
    }
  }

  function buildReservationWhatsAppLink(r: Reservation): string | null {
    if (!businessPhone) return null
    const resourceName = r.resource?.name ?? resourceLabelSingular
    const dateLabel = formatLocal(r.starts_at, "EEEE d 'de' MMMM")
    const timeLabel = formatLocal(r.starts_at, 'HH:mm')
    const clientName = profile?.full_name ?? ''
    const msg =
      `Hola ${businessName}, tengo una reserva pendiente:\n\n` +
      `- Lugar: ${resourceName}\n` +
      `- Fecha: ${dateLabel}\n` +
      `- Hora: ${timeLabel}\n` +
      `- Cliente: ${clientName}\n` +
      `_Quisiera validar la confirmación._\n` +
      `¡Gracias!`
    return waLink(businessPhone, msg)
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'upcoming', label: 'Próximas' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'confirmed', label: 'Confirmadas' },
    { key: 'past', label: 'Pasadas' }
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
        className='scrollbar-none flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 animate-fade-up'
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
          {sorted.map((r, index) => (
            <Card
              key={r.id}
              className={`p-4 animate-stagger ${r.status === 'pending' ? 'border-l-4 border-l-yellow-400' : ''}`}
              style={{ '--index': index } as React.CSSProperties}
              data-tour={index === 0 ? 'reservation-card' : undefined}
            >
              <div className='flex items-start justify-between gap-3 mb-2'>
                <div className='min-w-0 flex-1'>
                  <p className='font-semibold text-(--color-text) tracking-tight'>
                    {r.resource?.name ?? resourceLabelSingular}
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
                <div className='mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2'>
                  {r.status === 'pending' && businessPhone && (
                    <a
                      href={buildReservationWhatsAppLink(r) ?? '#'}
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
                  <Button
                    variant='danger'
                    size='sm'
                    loading={cancellingId === r.id}
                    onClick={() => handleCancel(r.id)}
                    data-tour={index === 0 ? 'reservation-cancel' : undefined}
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
