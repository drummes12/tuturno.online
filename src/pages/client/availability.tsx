import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'wouter'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/common/card'
import { Spinner } from '@/components/common/spinner'
import type { Court, AvailabilitySlot } from '@/types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function AvailabilityPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  )
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar canchas activas
  useEffect(() => {
    async function loadCourts() {
      const { data, error: err } = await supabase
        .from('courts')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (err) {
        setError('No pudimos cargar las canchas.')
        return
      }

      setCourts(data as Court[])
      if (data && data.length > 0) {
        setSelectedCourt(data[0].id)
      }
    }
    loadCourts()
  }, [])

  // Cargar disponibilidad
  const loadAvailability = useCallback(async () => {
    if (!selectedCourt || !selectedDate) return
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase.rpc('get_availability', {
      p_court_id: selectedCourt,
      p_date: selectedDate
    })

    setLoading(false)

    if (err) {
      setError('No pudimos cargar la disponibilidad.')
      setSlots([])
      return
    }

    setSlots((data as AvailabilitySlot[]) ?? [])
  }, [selectedCourt, selectedDate])

  useEffect(() => {
    loadAvailability()
  }, [loadAvailability])

  const dateLabel = useMemo(() => {
    try {
      return format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })
    } catch {
      return selectedDate
    }
  }, [selectedDate])

  return (
    <div className='flex flex-col gap-4'>
      {/* Header */}
      <div>
        <h1 className='text-2xl font-bold text-[var(--color-text)]'>
          Disponibilidad
        </h1>
        <p className='text-sm text-[var(--color-text-muted)] capitalize'>
          {dateLabel}
        </p>
      </div>

      {/* Date picker — mobile-first horizontal scroll */}
      <div className='flex gap-2 overflow-x-auto pb-2 -mx-4 px-4'>
        {Array.from({ length: 14 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() + i)
          const dateStr = format(d, 'yyyy-MM-dd')
          const isSelected = dateStr === selectedDate
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`flex flex-col items-center justify-center min-w-[64px] py-2 px-3 rounded-lg border transition-colors touch-target ${
                isSelected
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-surface-elevated)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              <span className='text-xs font-medium capitalize'>
                {format(d, 'EEE', { locale: es })}
              </span>
              <span className='text-lg font-bold'>{format(d, 'd')}</span>
              <span className='text-xs capitalize'>
                {format(d, 'MMM', { locale: es })}
              </span>
            </button>
          )
        })}
      </div>

      {/* Court selector — chips */}
      {courts.length > 1 && (
        <div className='flex gap-2 overflow-x-auto pb-2 -mx-4 px-4'>
          {courts.map((court) => {
            const isSelected = court.id === selectedCourt
            return (
              <button
                key={court.id}
                onClick={() => setSelectedCourt(court.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors touch-target ${
                  isSelected
                    ? 'bg-[var(--color-pitch-100)] text-[var(--color-pitch-800)] border-[var(--color-pitch-400)]'
                    : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                }`}
              >
                {court.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Slots grid */}
      {error && (
        <Card className='p-4 text-center text-sm text-[var(--color-danger)]'>
          {error}
        </Card>
      )}

      {loading ? (
        <div className='py-12'>
          <Spinner size='lg' />
        </div>
      ) : slots.length === 0 ? (
        <Card className='p-6 text-center'>
          <p className='text-[var(--color-text-muted)]'>
            No hay turnos disponibles para esta fecha.
          </p>
        </Card>
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'>
          {slots.map((slot) => {
            const time = format(parseISO(slot.starts_at), 'HH:mm')
            const isAvailable = slot.status === 'available'

            const statusConfig = {
              available: {
                className:
                  'bg-[var(--color-pitch-100)] text-[var(--color-pitch-800)] border-[var(--color-pitch-400)] hover:bg-[var(--color-pitch-200)]',
                label: 'Disponible'
              },
              held: {
                className: 'bg-yellow-50 text-yellow-800 border-yellow-300',
                label: 'En espera'
              },
              reserved: {
                className:
                  'bg-[var(--color-surface-inset)] text-[var(--color-text-muted)] border-[var(--color-border)]',
                label: 'Reservado'
              },
              blocked: {
                className: 'bg-red-50 text-red-700 border-red-200',
                label: 'Bloqueado'
              }
            }
            const config = statusConfig[slot.status]

            return isAvailable ? (
              <Link
                key={`${slot.court_id}-${slot.starts_at}`}
                href={`/reservar?court=${slot.court_id}&date=${selectedDate}&start=${encodeURIComponent(slot.starts_at)}`}
              >
                <button
                  className={`w-full flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-sm font-medium transition-colors touch-target ${config.className}`}
                >
                  <span className='text-lg font-bold'>{time}</span>
                  <span className='text-xs'>{config.label}</span>
                </button>
              </Link>
            ) : (
              <div
                key={`${slot.court_id}-${slot.starts_at}`}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-sm font-medium ${config.className} opacity-70`}
                aria-label={`${time} — ${config.label}`}
              >
                <span className='text-lg font-bold'>{time}</span>
                <span className='text-xs'>{config.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className='flex flex-wrap gap-3 mt-2 text-xs text-[var(--color-text-muted)]'>
        <span className='flex items-center gap-1.5'>
          <span className='w-3 h-3 rounded bg-[var(--color-pitch-100)] border border-[var(--color-pitch-400)]' />
          Disponible
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='w-3 h-3 rounded bg-yellow-50 border border-yellow-300' />
          En espera
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='w-3 h-3 rounded bg-[var(--color-surface-inset)] border border-[var(--color-border)]' />
          Reservado
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='w-3 h-3 rounded bg-red-50 border border-red-200' />
          Bloqueado
        </span>
      </div>
    </div>
  )
}
