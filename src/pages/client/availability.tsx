import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'wouter'
import { fetchActiveResources } from '@/services/resources'
import { fetchAvailability } from '@/services/availability'
import { fetchBusinessContactById } from '@/services/business'
import { useTenant } from '@/hooks/use-tenant'
import { Card } from '@/components/common/card'
import { Spinner, PageLoader } from '@/components/common/spinner'
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
  ExternalLinkIcon,
  InfoIcon,
  ArrowRightIcon,
  CheckIcon,
  XIcon
} from '@/components/common/icon'
import { formatFullAddress, googleMapsLink } from '@/lib/address'
import type { Resource, AvailabilitySlot } from '@/types'
import { differenceInMinutes, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { BUSINESS_TIMEZONE } from '@/lib/time'
import { toZonedTime } from 'date-fns-tz'
import type { ReactNode } from 'react'
import { Page } from '@/components/layout/page'

type AvailabilityPageProps = {
  slug?: string
}

export function AvailabilityPage({ slug }: AvailabilityPageProps = {}) {
  const {
    business,
    loading: tenantLoading,
    error: tenantError
  } = useTenant(slug)
  const businessId = business?.id ?? null
  const isDemo = business?.is_demo ?? false

  const [resources, setResources] = useState<Resource[]>([])
  const [selectedResource, setSelectedResource] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(
    format(toZonedTime(new Date(), BUSINESS_TIMEZONE), 'yyyy-MM-dd')
  )
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingResources, setLoadingResources] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resourceLabels, setResourceLabels] = useState({
    singular: 'Espacio',
    plural: 'Espacios'
  })
  const [location, setLocation] = useState<{
    street: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
    country: string | null
  } | null>(null)

  // Cargar recursos activos del tenant
  useEffect(() => {
    if (!businessId) {
      setResources([])
      setSelectedResource(null)
      setLoadingResources(false)
      setLoading(false)
      return
    }
    async function loadResources(bizId: string) {
      setLoadingResources(true)
      try {
        const data = await fetchActiveResources(bizId)
        setResources(data)
        if (data.length > 0) {
          setSelectedResource(data[0].id)
        } else {
          setSelectedResource(null)
          setLoading(false)
        }
      } catch {
        setError('No pudimos cargar los recursos.')
      } finally {
        setLoadingResources(false)
      }
    }
    loadResources(businessId)
  }, [businessId])

  // Cargar ubicación y etiquetas del negocio
  useEffect(() => {
    async function loadLocation() {
      if (!businessId) return
      try {
        const data = await fetchBusinessContactById(businessId)
        if (data) {
          setResourceLabels({
            singular: data.resource_label_singular || 'Espacio',
            plural: data.resource_label_plural || 'Espacios'
          })
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
  }, [businessId])

  // Cargar disponibilidad
  const loadAvailability = useCallback(async () => {
    if (!selectedResource || !selectedDate) {
      setSlots([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
      const data = (await fetchAvailability(selectedResource, selectedDate)) as
        | AvailabilitySlot[]
        | null

      let result = data ?? []
      // Solo en demo: decorar estados para exhibir el tablero completo
      // (no hay reservas reales). Determinístico por índice, estable
      // entre renders.
      if (isDemo) {
        result = result.map((slot, i) =>
          slot.status !== 'available'
            ? slot
            : i % 4 === 1
              ? { ...slot, status: 'reserved' as const }
              : i % 4 === 3
                ? { ...slot, status: 'held' as const }
                : slot
        )
      }
      setSlots(result)
    } catch {
      setError('No pudimos cargar la disponibilidad.')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [selectedResource, selectedDate, isDemo])

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

  // Resumen del día — cuántos turnos quedan libres en total
  const availableTotal = useMemo(
    () => slots.filter((s) => s.status === 'available').length,
    [slots]
  )

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

  // Tenant loading or not found
  if (tenantLoading) {
    return (
      <PageLoader>
        <span className='flex flex-col items-center gap-3'>
          <Spinner size='lg' />
          <p className='text-sm text-(--color-text-muted)'>Cargando negocio…</p>
        </span>
      </PageLoader>
    )
  }

  if (tenantError || !business) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-4 animate-fade-up'>
        <div className='w-14 h-14 rounded-full bg-surface-inset flex items-center justify-center text-text-muted'>
          <InboxIcon size={28} />
        </div>
        <div className='text-center'>
          <h1 className='text-xl font-bold tracking-tight mb-1'>
            Negocio no encontrado
          </h1>
          <p className='text-sm text-(--color-text-muted)'>
            {tenantError ?? 'Verifica el enlace o contacta al negocio.'}
          </p>
        </div>
        <Link href='/'>
          <button className='text-sm font-medium text-(--color-primary) hover:underline touch-target px-4 py-2'>
            Volver al inicio
          </button>
        </Link>
      </div>
    )
  }

  const reserveHrefBase = `/b/${slug}/reservar`

  return (
    <Page className='gap-2!'>
      {/* Demo banner */}
      {isDemo && (
        <div
          className='flex items-start gap-3 p-4 rounded-xl border border-flood-500/40 bg-flood-500/10 text-(--color-text) animate-fade-up'
          role='status'
        >
          <InfoIcon
            size={20}
            className='shrink-0 mt-0.5 text-(--color-warning)'
          />
          <div className='flex-1'>
            <p className='text-sm font-semibold'>
              Estás probando la demostración
            </p>
            <p className='text-xs mt-0.5 text-(--color-text-muted)'>
              Las reservas no son reales. Explora la disponibilidad y el flujo
              libremente.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col'>
        <div className='flex items-start justify-between gap-2 animate-fade-up'>
          <h1 className='text-2xl font-bold text-(--color-text) tracking-tight text-balance'>
            {business.name}
          </h1>
          <div className='flex gap-2'>
            <div className='flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted bg-surface-inset px-3 py-1.5 rounded-full'>
              <CalendarIcon size={14} />
              <span className='nums'>{resources.length}</span>
              <span>{resourceLabels.plural.toLowerCase()}</span>
            </div>
            {!loading &&
              slots.length > 0 &&
              (availableTotal > 0 ? (
                <span className='flex items-center gap-1.5 ml-auto rounded-full border border-pitch-500/40 bg-pitch-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-pitch-700 nums dark:border-pitch-400/30 dark:text-pitch-300'>
                  <CheckIcon size={12} />
                  {availableTotal}
                </span>
              ) : (
                <span className='flex items-center gap-1.5 ml-auto rounded-full border border-border bg-surface-inset px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted'>
                  <XIcon size={12} />-
                </span>
              ))}
          </div>
        </div>
        <div className='mt-1 flex items-center gap-2'>
          <p className='text-sm text-(--color-text-muted) capitalize'>
            {dateLabel}
          </p>
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
            <div className='flex items-center gap-3'>
              <div className='flex items-center justify-center w-9 h-9 rounded-lg bg-pitch-500/15 text-pitch-700 dark:text-pitch-300 shrink-0'>
                <MapPinIcon size={18} />
              </div>
              <div className='flex-1 min-w-0'>
                <h3 className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted) mb-0.5'>
                  Cómo llegar
                </h3>
                <p className='truncate text-sm font-medium'>
                  {formatFullAddress(location)}
                </p>
              </div>
              <a
                href={googleMapsLink(location)}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-inset px-3 py-2 text-xs font-medium text-(--color-text) transition-colors hover:border-graphite-300 hover:bg-surface touch-target'
              >
                <ExternalLinkIcon
                  size={14}
                  className='text-(--color-primary)'
                />
                Maps
              </a>
            </div>
          </Card>
        )}

      {/* Sin recursos — el negocio no tiene espacios configurados */}
      {!loadingResources && resources.length === 0 ? (
        <Card className='p-8 text-center animate-fade-up'>
          <div className='flex flex-col items-center gap-3'>
            <div className='w-12 h-12 rounded-full bg-surface-inset flex items-center justify-center text-text-muted'>
              <InboxIcon size={24} />
            </div>
            <p className='text-text-muted text-sm'>
              Este negocio aún no tiene {resourceLabels.plural.toLowerCase()}{' '}
              configurados.
            </p>
            <p className='text-text-muted text-xs'>
              Vuelve más tarde o contacta al negocio directamente.
            </p>
          </div>
        </Card>
      ) : null}

      {/* Date picker — mobile-first horizontal scroll */}
      {loadingResources ? (
        <DatePickerSkeleton />
      ) : resources.length > 0 ? (
        <div
          className='flex gap-2 overflow-x-auto py-4 px-4 sm:-mx-6 sm:px-6 snap-x snap-mandatory animate-fade-up scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
          style={{ animationDelay: '60ms' }}
          data-tour='availability-date-picker'
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
                    ? 'bg-(--color-primary) text-on-primary border-transparent shadow-(--shadow-pitch) scale-105'
                    : 'bg-surface-elevated text-(--color-text) border-border hover:border-border-strong hover:shadow-sm'
                }`}
              >
                <span className='text-[10px] font-medium uppercase tracking-[0.14em] opacity-80'>
                  {isToday ? 'Hoy' : format(d, 'EEE', { locale: es })}
                </span>
                <span className='text-lg font-bold nums mt-0.5'>
                  {format(d, 'd')}
                </span>
                <span className='text-[10px] uppercase tracking-wider opacity-70'>
                  {format(d, 'MMM', { locale: es })}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {/* Resource selector — chips */}
      {resources.length > 1 && (
        <div
          className='flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 animate-fade-up [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden'
          style={{ animationDelay: '120ms' }}
          data-tour='availability-resource-selector'
        >
          {resources.map((resource) => {
            const isSelected = resource.id === selectedResource
            return (
              <button
                key={resource.id}
                onClick={() => setSelectedResource(resource.id)}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.12em] border whitespace-nowrap transition-all duration-200 ease-spring touch-target ${
                  isSelected
                    ? 'bg-(--color-primary) text-on-primary border-transparent shadow-(--shadow-pitch)'
                    : 'bg-surface-elevated text-(--color-text-muted) border-border hover:border-border-strong hover:text-(--color-text)'
                }`}
              >
                {resource.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Slots grid — solo si hay recursos */}
      {resources.length > 0 && error && (
        <Card className='p-4 text-center text-sm text-danger border-signal-red/40 animate-fade-up'>
          {error}
        </Card>
      )}

      {resources.length > 0 && loading ? (
        <SlotGridSkeleton />
      ) : resources.length > 0 && slots.length === 0 ? (
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
      ) : resources.length > 0 ? (
        <div className='grid grid-cols-1 gap-6 animate-fade-up lg:grid-cols-2 xl:grid-cols-3'>
          {slotGroups.map((group, groupIndex) => {
            if (group.slots.length === 0) return null
            const availableCount = group.slots.filter(
              (s) => s.status === 'available'
            ).length

            return (
              <section key={group.key} className='self-start'>
                {/* Turno header */}
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2.5'>
                    <span className='flex items-center justify-center w-8 h-8 rounded-lg bg-surface-inset text-text-muted'>
                      {group.icon}
                    </span>
                    <div>
                      <h3 className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text)'>
                        {group.label}
                      </h3>
                      <p className='text-[11px] text-text-muted nums'>
                        {group.range}
                      </p>
                    </div>
                  </div>
                  {availableCount > 0 && (
                    <span className='rounded-full border border-pitch-500/40 bg-pitch-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-pitch-700 nums dark:border-pitch-400/30 dark:text-pitch-300'>
                      {availableCount} libre{availableCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Fixture board — el lenguaje del hero adaptado al tema:
                    tarjeta clara en light, marcador nocturno en dark.
                    La identidad es la estructura, no el color. */}
                <div className='overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-(--shadow-sm) dark:border-white/10 dark:bg-pitch-950 dark:text-chalk'>
                  <ul className='flex flex-col divide-y divide-border dark:divide-white/10'>
                    {group.slots.map((slot, index) => {
                      const time = format(parseISO(slot.starts_at), 'HH:mm')
                      const isAvailable = slot.status === 'available'
                      // Marcar el primer slot disponible para el tutorial
                      const isFirstAvailable =
                        isAvailable &&
                        !slotGroups
                          .slice(0, groupIndex)
                          .some((g) =>
                            g.slots.some((s) => s.status === 'available')
                          ) &&
                        !group.slots
                          .slice(0, index)
                          .some((s) => s.status === 'available')

                      const chipClass = {
                        available:
                          'border-pitch-500/40 bg-pitch-500/10 text-pitch-700 dark:border-pitch-400/40 dark:bg-pitch-400/10 dark:text-pitch-300',
                        held: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:border-orange-400/40 dark:text-orange-300',
                        reserved:
                          'border-border bg-surface-inset text-text-muted dark:border-white/10 dark:bg-white/5 dark:text-white/40',
                        blocked:
                          'border-signal-red/40 bg-signal-red/10 text-signal-red dark:text-red-300'
                      }[slot.status]
                      const chipLabel = {
                        available: 'Libre',
                        held: 'En espera',
                        reserved: 'Reservado',
                        blocked: 'Bloqueado'
                      }[slot.status]

                      const row = (
                        <>
                          <span className='nums font-mono w-12 text-sm font-semibold text-(--color-text) dark:text-chalk'>
                            {time}
                          </span>
                          <span className='flex-1 text-sm text-(--color-text-muted) nums font-mono dark:text-chalk-dim/70'>
                            {differenceInMinutes(
                              parseISO(slot.ends_at),
                              parseISO(slot.starts_at)
                            )}{' '}
                            min
                          </span>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${chipClass}`}
                          >
                            {chipLabel}
                          </span>
                          {isAvailable && (
                            <ArrowRightIcon
                              size={14}
                              className='ml-auto text-pitch-600 transition-transform duration-200 ease-spring group-hover:translate-x-0.5 dark:text-pitch-300'
                            />
                          )}
                        </>
                      )

                      return isAvailable ? (
                        <li
                          key={`${slot.resource_id}-${slot.starts_at}`}
                          className='animate-stagger'
                          style={
                            {
                              '--index': groupIndex * 10 + index
                            } as React.CSSProperties
                          }
                        >
                          <Link
                            href={`${reserveHrefBase}?resource=${slot.resource_id}&date=${selectedDate}&start=${encodeURIComponent(slot.starts_at)}`}
                            data-tour={
                              isFirstAvailable ? 'availability-slot' : undefined
                            }
                            className='group flex items-center gap-4 px-5 py-3.5 transition-[transform,background-color] duration-200 ease-spring hover:bg-surface-inset touch-target dark:hover:bg-white/6'
                          >
                            {row}
                          </Link>
                        </li>
                      ) : (
                        <li
                          key={`${slot.resource_id}-${slot.starts_at}`}
                          className='flex animate-stagger items-center gap-4 bg-surface-inset/70 px-5 py-3.5 opacity-60 dark:bg-white/3'
                          style={
                            {
                              '--index': groupIndex * 10 + index
                            } as React.CSSProperties
                          }
                          aria-label={`${time} — ${chipLabel}`}
                        >
                          {row}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </section>
            )
          })}
        </div>
      ) : null}
    </Page>
  )
}
