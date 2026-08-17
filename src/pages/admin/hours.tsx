import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchBusinessHours,
  insertBusinessHour,
  updateBusinessHour,
  deleteBusinessHour
} from '@/services/business-hours'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Spinner } from '@/components/common/spinner'
import { Alert } from '@/components/common/alert'
import { ReadOnlyNotice } from '@/components/common/read-only-notice'
import { useCanEdit } from '@/hooks/use-can-edit'
import {
  PlusIcon,
  TrashIcon,
  ClockIcon,
  SunIcon,
  MoonIcon,
  CoffeeIcon
} from '@/components/common/icon'
import type { BusinessHours } from '@/types'
import { useBusinessId } from '@/hooks/use-business-id'

const days = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
]

interface FranjaState extends BusinessHours {
  _isNew?: boolean
  _isDeleted?: boolean
}

// Convierte "HH:MM" a minutos para comparación
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Detecta solapamiento entre franjas de un mismo día
function findOverlap(
  franjas: FranjaState[]
): { a: FranjaState; b: FranjaState } | null {
  const active = franjas.filter((f) => !f._isDeleted && f.is_active)
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]
      const b = active[j]
      const aStart = toMinutes(a.open_time)
      const aEnd = toMinutes(a.close_time)
      const bStart = toMinutes(b.open_time)
      const bEnd = toMinutes(b.close_time)
      if (aStart < bEnd && bStart < aEnd) {
        return { a, b }
      }
    }
  }
  return null
}

// Etiqueta visual para una franja según su hora
function franjaLabel(open: string): { text: string; icon: typeof SunIcon } {
  const h = parseInt(open.split(':')[0])
  if (h < 12) return { text: 'Mañana', icon: SunIcon }
  if (h < 18) return { text: 'Tarde', icon: CoffeeIcon }
  return { text: 'Noche', icon: MoonIcon }
}

export function AdminHoursPage() {
  const businessId = useBusinessId()
  const canEdit = useCanEdit()
  const [franjas, setFranjas] = useState<FranjaState[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const data = await fetchBusinessHours(businessId)
      setFranjas(data.map((h) => ({ ...h })))
    } catch (err) {
      setError('Error al cargar los horarios: ' + (err as Error).message)
      setFranjas([])
    }
    setLoading(false)
  }, [businessId])

  useEffect(() => {
    load()
  }, [load])

  // Agrupar por día
  const franjasByDay = useMemo(() => {
    const map = new Map<number, FranjaState[]>()
    for (let i = 0; i < 7; i++) map.set(i, [])
    franjas.forEach((f) => {
      if (!f._isDeleted) map.get(f.day_of_week)?.push(f)
    })
    return map
  }, [franjas])

  // Detectar solapamientos por día
  const overlapsByDay = useMemo(() => {
    const map = new Map<number, boolean>()
    for (let i = 0; i < 7; i++) {
      const dayFranjas = franjasByDay.get(i) ?? []
      map.set(i, !!findOverlap(dayFranjas))
    }
    return map
  }, [franjasByDay])

  const hasOverlaps = Array.from(overlapsByDay.values()).some((v) => v)

  function addFranja(day: number) {
    const dayFranjas = franjasByDay.get(day) ?? []
    // Sugerir horario según cuántas franjas existan
    const defaultOpen = dayFranjas.length === 0 ? '08:00' : '14:00'
    const defaultClose = dayFranjas.length === 0 ? '12:00' : '22:00'
    setFranjas((prev) => [
      ...prev,
      {
        id: '',
        business_id: businessId ?? '',
        day_of_week: day,
        open_time: defaultOpen,
        close_time: defaultClose,
        is_active: true,
        _isNew: true
      }
    ])
  }

  function updateFranja(
    index: number,
    field: 'open_time' | 'close_time',
    value: string
  ) {
    setFranjas((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    )
  }

  function deleteFranja(index: number) {
    setFranjas((prev) =>
      prev.map((f, i) => (i === index ? { ...f, _isDeleted: true } : f))
    )
  }

  function toggleDay(day: number) {
    const dayFranjas = franjasByDay.get(day) ?? []
    if (dayFranjas.length === 0) {
      addFranja(day)
    } else {
      const allActive = dayFranjas.every((f) => f.is_active)
      setFranjas((prev) =>
        prev.map((f) =>
          f.day_of_week === day && !f._isDeleted
            ? { ...f, is_active: !allActive }
            : f
        )
      )
    }
  }

  async function handleSave() {
    if (!businessId) {
      setError('No se pudo determinar el negocio. Recarga la página.')
      return
    }
    if (hasOverlaps) {
      setError(
        'Hay franjas que se solapan. Corrige los horarios antes de guardar.'
      )
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)

    for (const f of franjas) {
      if (f._isDeleted && !f._isNew) {
        try {
          await deleteBusinessHour(f.id)
        } catch (err) {
          setError('Error al eliminar franja: ' + (err as Error).message)
          setSaving(false)
          return
        }
      } else if (f._isNew && !f._isDeleted) {
        try {
          await insertBusinessHour(
            businessId,
            f.day_of_week,
            f.open_time,
            f.close_time,
            f.is_active
          )
        } catch (err) {
          setError('Error al crear franja: ' + (err as Error).message)
          setSaving(false)
          return
        }
      } else if (!f._isNew && !f._isDeleted) {
        try {
          await updateBusinessHour(f.id, f.open_time, f.close_time, f.is_active)
        } catch (err) {
          setError('Error al actualizar franja: ' + (err as Error).message)
          setSaving(false)
          return
        }
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    await load()
  }

  if (loading) {
    return <Spinner size='lg' />
  }

  return (
    <div className='flex flex-col gap-5 max-w-5xl mx-auto'>
      {/* Header */}
      <div className='animate-fade-up'>
        <h1 className='text-2xl font-bold tracking-tight'>
          Horarios de operación
        </h1>
        <p className='text-sm text-(--color-text-muted) mt-1'>
          Configura las franjas horarias de cada día. Puedes tener múltiples
          franjas (ej: mañana y tarde con descanso al mediodía).
        </p>
      </div>

      {!canEdit && <ReadOnlyNotice />}

      {error && (
        <Alert variant='error' onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {saved && (
        <Alert variant='success'>Horarios guardados correctamente.</Alert>
      )}
      {hasOverlaps && (
        <Alert variant='warning'>
          Hay franjas que se solapan en uno o más días. Ajusta los horarios
          antes de guardar.
        </Alert>
      )}

      {/* Días */}
      <div className='flex flex-col gap-3'>
        {days.map((dayName, dayIdx) => {
          const dayFranjas = franjasByDay.get(dayIdx) ?? []
          const isActive =
            dayFranjas.length > 0 && dayFranjas.some((f) => f.is_active)
          const hasOverlap = overlapsByDay.get(dayIdx)
          const activeCount = dayFranjas.filter((f) => f.is_active).length

          return (
            <Card
              key={dayIdx}
              data-tour={dayIdx === 1 ? 'admin-hours-day' : undefined}
              className={`p-0 overflow-hidden animate-fade-up ${hasOverlap ? 'border-red-300' : ''}`}
              style={{ animationDelay: `${dayIdx * 20}ms` }}
            >
              {/* Header del día */}
              <div
                className={`flex items-center gap-3 px-4 py-3 border-b border-border transition-colors ${
                  isActive ? 'bg-surface-inset' : ''
                }`}
              >
                <button
                  onClick={() => canEdit && toggleDay(dayIdx)}
                  disabled={!canEdit}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    isActive ? 'bg-primary' : 'bg-graphite-300'
                  } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label={`${isActive ? 'Cerrar' : 'Abrir'} ${dayName}`}
                  aria-pressed={isActive}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-spring ${
                      isActive ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
                <span
                  className={`text-sm font-semibold tracking-tight ${
                    isActive ? 'text-text' : 'text-text-muted'
                  }`}
                >
                  {dayName}
                </span>
                {isActive && (
                  <span className='text-xs text-text-muted nums'>
                    {activeCount} {activeCount === 1 ? 'franja' : 'franjas'}
                  </span>
                )}
                {isActive && canEdit && (
                  <button
                    onClick={() => addFranja(dayIdx)}
                    data-tour={dayIdx === 1 ? 'admin-hours-add' : undefined}
                    className='ml-auto flex items-center gap-1 text-xs font-medium text-primary hover:bg-pitch-50 px-2.5 py-1.5 rounded-lg transition-colors touch-target'
                    aria-label={`Agregar franja a ${dayName}`}
                  >
                    <PlusIcon size={14} />
                    <span className='hidden sm:inline'>Agregar</span>
                  </button>
                )}
              </div>

              {/* Franjas */}
              {isActive && dayFranjas.length === 0 && (
                <div className='px-4 py-3'>
                  <p className='text-xs text-text-muted'>
                    Sin franjas. Agrega una para empezar.
                  </p>
                </div>
              )}
              {isActive && dayFranjas.length > 0 && (
                <div className='flex flex-col divide-y divide-border'>
                  {dayFranjas.map((f) => {
                    const globalIdx = franjas.indexOf(f)
                    const label = franjaLabel(f.open_time)
                    const LabelIcon = label.icon
                    const franjaOverlap =
                      hasOverlap &&
                      dayFranjas.some(
                        (other) =>
                          other !== f &&
                          !other._isDeleted &&
                          other.is_active &&
                          toMinutes(other.open_time) <
                            toMinutes(f.close_time) &&
                          toMinutes(f.open_time) < toMinutes(other.close_time)
                      )
                    return (
                      <div
                        key={f.id || `new-${globalIdx}`}
                        className='grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3 sm:flex sm:items-center'
                      >
                        {/* Etiqueta de franja */}
                        <div
                          className={`col-span-2 flex items-center gap-1.5 text-xs font-medium sm:w-20 sm:shrink-0 ${
                            franjaOverlap ? 'text-red-600' : 'text-text-muted'
                          }`}
                        >
                          <LabelIcon size={14} />
                          {label.text}
                        </div>

                        {/* Inputs de tiempo */}
                        <div className='col-span-2 flex min-w-0 items-center gap-2 sm:flex-1'>
                          <input
                            type='time'
                            value={f.open_time}
                            disabled={!canEdit}
                            onChange={(e) =>
                              updateFranja(
                                globalIdx,
                                'open_time',
                                e.target.value
                              )
                            }
                            className={`min-w-0 flex-1 rounded-lg border bg-surface-inset px-2.5 py-2 text-sm touch-target nums sm:px-3 ${
                              franjaOverlap
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-border focus:border-primary'
                            } focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}
                            aria-label={`Apertura ${dayName} ${label.text}`}
                          />
                          <span className='text-text-muted text-xs shrink-0'>
                            →
                          </span>
                          <input
                            type='time'
                            value={f.close_time}
                            disabled={!canEdit}
                            onChange={(e) =>
                              updateFranja(
                                globalIdx,
                                'close_time',
                                e.target.value
                              )
                            }
                            className={`min-w-0 flex-1 rounded-lg border bg-surface-inset px-2.5 py-2 text-sm touch-target nums sm:px-3 ${
                              franjaOverlap
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-border focus:border-primary'
                            } focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}
                            aria-label={`Cierre ${dayName} ${label.text}`}
                          />
                        </div>

                        {/* Duración calculada */}
                        <span className='text-xs text-text-muted nums justify-self-start rounded-md bg-surface-inset px-2 py-1 h-fit sm:w-16 sm:justify-self-auto sm:bg-transparent sm:px-0 sm:py-0 sm:text-right'>
                          <span className='sm:hidden'>Duración: </span>
                          {Math.floor(
                            (toMinutes(f.close_time) - toMinutes(f.open_time)) /
                              60
                          )}
                          h{' '}
                          {(toMinutes(f.close_time) - toMinutes(f.open_time)) %
                            60 >
                          0
                            ? `${(toMinutes(f.close_time) - toMinutes(f.open_time)) % 60}m`
                            : ''}
                        </span>

                        {/* Eliminar */}
                        {canEdit && (
                          <button
                            onClick={() => deleteFranja(globalIdx)}
                            className='col-start-2 flex items-center justify-center w-10 h-10 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-target shrink-0 sm:w-8 sm:h-8'
                            aria-label={`Eliminar franja de ${label.text}`}
                            title='Eliminar franja'
                          >
                            <TrashIcon size={17} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {!isActive && (
                <div className='px-4 py-3'>
                  <p className='text-sm text-text-muted flex items-center gap-1.5'>
                    <ClockIcon size={14} />
                    Cerrado
                  </p>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Footer con guardar */}
      <div className='sticky bottom-20 md:bottom-4 z-10'>
        <Card elevated className='p-3 flex items-center gap-3'>
          <div className='flex-1 text-xs text-text-muted'>
            {franjas.filter((f) => !f._isDeleted && f.is_active).length} franjas
            activas
            {hasOverlaps && (
              <span className='text-red-600 font-medium'>
                {' '}
                · solapamientos detectados
              </span>
            )}
          </div>
          <Button
            loading={saving}
            onClick={handleSave}
            disabled={hasOverlaps || !canEdit}
            size='lg'
            data-tour='admin-hours-save'
          >
            Guardar horarios
          </Button>
        </Card>
      </div>
    </div>
  )
}
