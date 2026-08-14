import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'wouter'
import { fetchActiveCourts } from '@/services/courts'
import { fetchAvailability } from '@/services/availability'
import { fetchBusinessContact } from '@/services/business'
import { Card } from '@/components/common/card'
import {
  SlotGridSkeleton,
  DatePickerSkeleton
} from '@/components/common/skeleton'
import {
  CalendarIcon,
  InboxIcon,
  SunIcon,
  CloudSunIcon,
  MoonIcon,
  MapPinIcon,
  ExternalLinkIcon
} from '@/components/common/icon'
import { formatFullAddress, googleMapsLink } from '@/lib/address'
import type { Court, AvailabilitySlot } from '@/types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { BUSINESS_TIMEZONE } from '@/lib/time'
import { toZonedTime } from 'date-fns-tz'
import type { ReactNode } from 'react'

export function AvailabilityPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(
    format(toZonedTime(new Date(), BUSINESS_TIMEZONE), 'yyyy-MM-dd')
  )
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCourts, setLoadingCourts] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{
    street: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
    country: string | null
  } | null>(null)

  // Cargar canchas activas
  useEffect(() => {
    async function loadCourts() {
      try {
        const data = await fetchActiveCourts()
        setCourts(data)
        if (data.length > 0) {
          setSelectedCourt(data[0].id)
        }
      } catch {
        setError('No pudimos cargar las canchas.')
      } finally {
        setLoadingCourts(false)
      }
    }
    loadCourts()
  }, [])

  // Cargar ubicación del negocio
  useEffect(() => {
    async function loadLocation() {
      try {
        const data = await fetchBusinessContact()
        if (data) {
          setLocation({
            street: data.street,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            country: data.country
          })
        }
      } catch {
        // Silencioso: la ubicación es opcional
      }
    }
    loadLocation()
  }, [])

  // Cargar disponibilidad
  const loadAvailability = useCallback(async () => {
    if (!selectedCourt || !selectedDate) return
    setLoading(true)
    setError(null)

    try {
      const data = await fetchAvailability(selectedCourt, selectedDate)
      setSlots((data as AvailabilitySlot[]) ?? [])
    } catch {
      setError('No pudimos cargar la disponibilidad.')
      setSlots([])
    } finally {
      setLoading(false)
    }
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

  // Agrupar slots por turno (Mañana / Tarde / Noche)
  const slotGroups = useMemo(() => {
    const groups: {
      key: string
      label: string
      range: string
      icon: ReactNode
      slots: AvailabilitySlot[]
    }[] = [
      {
        key: 'morning',
        label: 'Mañana',
        range: '6:00 — 12:00',
        icon: <SunIcon size={18} />,
        slots: []
      },
      {
        key: 'afternoon',
        label: 'Tarde',
        range: '12:00 — 18:00',
        icon: <CloudSunIcon size={18} />,
        slots: []
      },
      {
        key: 'evening',
        label: 'Noche',
        range: '18:00 — 24:00',
        icon: <MoonIcon size={18} />,
        slots: []
      }
    ]

    for (const slot of slots) {
      const hour = parseISO(slot.starts_at).getHours()
      if (hour >= 6 && hour < 12) groups[0].slots.push(slot)
      else if (hour >= 12 && hour < 18) groups[1].slots.push(slot)
      else groups[2].slots.push(slot)
    }

    return groups
  }, [slots])

  return (
    <div className='flex flex-col gap-5'>
      {/* Header */}
      <div className='flex items-start justify-between gap-3 animate-fade-up'>
        <div>
          <h1 className='text-2xl font-bold text-(--color-text) tracking-tight text-balance'>
            Disponibilidad
          </h1>
          <p className='text-sm text-(--color-text-muted) capitalize mt-0.5'>
            {dateLabel}
          </p>
        </div>
        <div className='flex items-center gap-1.5 text-xs font-medium text-text-muted bg-surface-inset px-3 py-1.5 rounded-full'>
          <CalendarIcon size={14} />
          <span className='nums'>{courts.length}</span>
          <span>canchas</span>
        </div>
      </div>

      {/* Ubicación del negocio */}
      {location &&
        (location.street ||
          location.neighborhood ||
          location.city ||
          location.state ||
          location.country) && (
          <Card
            className='hidden md:block p-4 animate-fade-up'
            style={{ animationDelay: '30ms' }}
          >
            <div className='flex items-start gap-3'>
              <div className='flex items-center justify-center w-9 h-9 rounded-lg bg-pitch-100 text-pitch-700 shrink-0'>
                <MapPinIcon size={18} />
              </div>
              <div className='flex-1 min-w-0'>
                <h3 className='text-sm font-semibold tracking-tight mb-0.5'>
                  Cómo llegar
                </h3>
                <p className='text-xs text-(--color-text-muted) mb-2'>
                  {formatFullAddress(location)}
                </p>
                <a
                  href={googleMapsLink(location)}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1.5 text-xs font-medium text-(--color-primary) hover:underline touch-target'
                >
                  <ExternalLinkIcon size={14} />
                  Abrir en Google Maps
                </a>
              </div>
            </div>
          </Card>
        )}

      {/* Date picker — mobile-first horizontal scroll */}
      {loadingCourts ? (
        <DatePickerSkeleton />
      ) : (
        <div
          className='flex gap-2 overflow-x-auto py-4 px-4 snap-x snap-mandatory animate-fade-up'
          style={{ animationDelay: '60ms' }}
        >
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date()
            d.setDate(d.getDate() + i)
            const dateStr = format(d, 'yyyy-MM-dd')
            const isSelected = dateStr === selectedDate
            const isToday = i === 0
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center justify-center min-w-16 py-2.5 px-3 rounded-xl border transition-all duration-200 ease-spring touch-target snap-start ${
                  isSelected
                    ? 'bg-(--color-primary) text-white border-(--color-primary) shadow-(--shadow-pitch) scale-105'
                    : 'bg-surface-elevated text-(--color-text) border-border hover:border-graphite-300 hover:shadow-sm'
                }`}
              >
                <span className='text-[10px] font-medium uppercase tracking-wide opacity-80'>
                  {isToday ? 'Hoy' : format(d, 'EEE', { locale: es })}
                </span>
                <span className='text-lg font-bold nums mt-0.5'>
                  {format(d, 'd')}
                </span>
                <span className='text-[10px] capitalize opacity-70'>
                  {format(d, 'MMM', { locale: es })}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Court selector — chips */}
      {courts.length > 1 && (
        <div
          className='flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 animate-fade-up'
          style={{ animationDelay: '120ms' }}
        >
          {courts.map((court) => {
            const isSelected = court.id === selectedCourt
            return (
              <button
                key={court.id}
                onClick={() => setSelectedCourt(court.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-all duration-200 ease-spring touch-target ${
                  isSelected
                    ? 'bg-pitch-100 text-(--color-pitch-800) border-pitch-400 shadow-sm'
                    : 'bg-surface-elevated text-(--color-text-muted) border-border hover:border-graphite-300'
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
        <Card className='p-4 text-center text-sm text-danger border-red-200 animate-fade-up'>
          {error}
        </Card>
      )}

      {loading ? (
        <SlotGridSkeleton />
      ) : slots.length === 0 ? (
        <Card className='p-8 text-center animate-fade-up'>
          <div className='flex flex-col items-center gap-3'>
            <div className='w-12 h-12 rounded-full bg-surface-inset flex items-center justify-center text-text-muted'>
              <InboxIcon size={24} />
            </div>
            <p className='text-text-muted text-sm'>
              No hay turnos disponibles para esta fecha.
            </p>
          </div>
        </Card>
      ) : (
        <div className='flex flex-col gap-6 animate-fade-up'>
          {slotGroups.map((group, groupIndex) => {
            if (group.slots.length === 0) return null
            const availableCount = group.slots.filter(
              (s) => s.status === 'available'
            ).length

            return (
              <section key={group.key}>
                {/* Turno header */}
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2.5'>
                    <span className='flex items-center justify-center w-8 h-8 rounded-lg bg-surface-inset text-graphite-500'>
                      {group.icon}
                    </span>
                    <div>
                      <h3 className='text-sm font-semibold tracking-tight'>
                        {group.label}
                      </h3>
                      <p className='text-[11px] text-text-muted nums'>
                        {group.range}
                      </p>
                    </div>
                  </div>
                  {availableCount > 0 && (
                    <span className='text-xs font-medium text-pitch-700 bg-pitch-100 px-2.5 py-1 rounded-full border border-pitch-300 nums'>
                      {availableCount} libre{availableCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Slots grid for this turno */}
                <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2'>
                  {group.slots.map((slot, index) => {
                    const time = format(parseISO(slot.starts_at), 'HH:mm')
                    const isAvailable = slot.status === 'available'

                    const statusConfig = {
                      available: {
                        className:
                          'bg-pitch-100 text-(--color-pitch-800) border-pitch-400 hover:bg-pitch-200 hover:shadow-(--shadow-pitch) hover:scale-[1.03]',
                        label: 'Disponible'
                      },
                      held: {
                        className:
                          'bg-yellow-50 text-yellow-800 border-yellow-300',
                        label: 'En espera'
                      },
                      reserved: {
                        className:
                          'bg-surface-inset text-(--color-text-muted) border-border',
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
                          style={
                            {
                              '--index': groupIndex * 10 + index
                            } as React.CSSProperties
                          }
                          className={`w-full flex flex-col items-center gap-0.5 py-3 px-1 rounded-xl border text-sm font-medium transition-all duration-200 ease-spring touch-target animate-stagger ${config.className}`}
                        >
                          <span className='text-base font-bold nums'>
                            {time}
                          </span>
                          <span className='text-[9px] uppercase tracking-wide opacity-70'>
                            {config.label}
                          </span>
                        </button>
                      </Link>
                    ) : (
                      <div
                        key={`${slot.court_id}-${slot.starts_at}`}
                        style={
                          {
                            '--index': groupIndex * 10 + index
                          } as React.CSSProperties
                        }
                        className={`flex flex-col items-center gap-0.5 py-3 px-1 rounded-xl border text-sm font-medium animate-stagger ${config.className} opacity-50`}
                        aria-label={`${time} — ${config.label}`}
                      >
                        <span className='text-base font-bold nums'>{time}</span>
                        <span className='text-[9px] uppercase tracking-wide opacity-70'>
                          {config.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Legend */}
      {!loading && slots.length > 0 && (
        <div className='flex flex-wrap gap-3 mt-1 text-xs text-(--color-text-muted) animate-fade-up'>
          <span className='flex items-center gap-1.5'>
            <span className='w-3 h-3 rounded bg-pitch-100 border border-pitch-400' />
            Disponible
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='w-3 h-3 rounded bg-yellow-50 border border-yellow-300' />
            En espera
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='w-3 h-3 rounded bg-surface-inset border border-border' />
            Reservado
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='w-3 h-3 rounded bg-red-50 border border-red-200' />
            Bloqueado
          </span>
        </div>
      )}
    </div>
  )
}
