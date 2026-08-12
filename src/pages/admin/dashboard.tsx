import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Spinner } from '@/components/common/spinner'
import { StatusBadge } from '@/components/common/badge'
import { Input } from '@/components/common/input'
import type { Reservation } from '@/types'
import { format } from 'date-fns'
import { dayRangeUtc, formatLocal, BUSINESS_TIMEZONE } from '@/lib/time'
import { toZonedTime } from 'date-fns-tz'

export function AdminDashboardPage() {
  const [pending, setPending] = useState<Reservation[]>([])
  const [today, setToday] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
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

  async function handleConfirm(id: string) {
    setActingId(id)
    const { error } = await supabase.rpc('confirm_reservation', {
      p_reservation_id: id,
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
      p_reason: rejectReason.trim(),
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

  if (loading) {
    return <div className="py-12"><Spinner size="lg" /></div>
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Pending queue — priority */}
      <section>
        <div className='flex items-center justify-between mb-3'>
          <h1 className='text-2xl font-bold'>Operación</h1>
          {pending.length > 0 && (
            <span className='px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium border border-yellow-300'>
              {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <Card className='p-6 text-center'>
            <p className='text-(--color-text-muted)'>
              No hay solicitudes pendientes. 🎉
            </p>
          </Card>
        ) : (
          <div className='flex flex-col gap-3'>
            {pending.map((r) => (
              <Card
                key={r.id}
                elevated
                className='p-4 border-l-4 border-l-yellow-400'
              >
                <div className='flex items-start justify-between gap-3 mb-3'>
                  <div>
                    <p className='font-semibold'>{r.court?.name}</p>
                    <p className='text-sm text-(--color-text-muted) capitalize'>
                      {formatLocal(r.starts_at, "EEE d 'de' MMMM, HH:mm")}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                <div className='text-sm flex flex-col gap-1 mb-3'>
                  <p>
                    <span className='text-(--color-text-muted)'>Cliente:</span>{' '}
                    {r.profile?.full_name}
                  </p>
                  <p>
                    <span className='text-(--color-text-muted)'>Teléfono:</span>{' '}
                    {r.profile?.phone}
                  </p>
                  <p>
                    <span className='text-(--color-text-muted)'>Email:</span>{' '}
                    {r.profile?.id}
                  </p>
                  {r.notes && (
                    <p className='italic text-(--color-text-muted)'>
                      "{r.notes}"
                    </p>
                  )}
                </div>

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
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Today's schedule */}
      <section>
        <h2 className='text-lg font-semibold mb-3'>Reservas de hoy</h2>
        {today.length === 0 ? (
          <Card className='p-4 text-center text-sm text-(--color-text-muted)'>
            Sin reservas para hoy.
          </Card>
        ) : (
          <div className='flex flex-col gap-2'>
            {today.map((r) => (
              <Card key={r.id} className='p-3'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className='font-medium text-sm truncate'>
                      {formatLocal(r.starts_at, 'HH:mm')} — {r.court?.name}
                    </p>
                    <p className='text-xs text-(--color-text-muted) truncate'>
                      {r.profile?.full_name}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
