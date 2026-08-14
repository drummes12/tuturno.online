import { useState, useEffect } from 'react'
import { fetchBusiness, updateBusiness } from '@/services/business'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { PhoneInput } from '@/components/common/phone-input'
import { LocationMap } from '@/components/common/location-map'
import { SearchLocationButton } from '@/components/common/search-location-button'
import { Alert } from '@/components/common/alert'
import { Spinner } from '@/components/common/spinner'
import { ReadOnlyNotice } from '@/components/common/read-only-notice'
import { useCanEdit } from '@/hooks/use-can-edit'
import {
  ClockIcon,
  CalendarIcon,
  StoreIcon,
  MapPinIcon,
  TimerIcon
} from '@/components/common/icon'
import type { Business } from '@/types'

export function AdminConfigPage() {
  const canEdit = useCanEdit()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchBusiness()
        setBusiness(data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Error al cargar la configuración.'
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!business) return

    if (business.slot_duration_minutes < 15) {
      setError('La duración del turno debe ser de al menos 15 minutos.')
      return
    }
    if (business.gap_minutes < 0) {
      setError('El gap entre turnos no puede ser negativo.')
      return
    }

    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      await updateBusiness(business.id, {
        name: business.name,
        address: business.address,
        street: business.street,
        neighborhood: business.neighborhood,
        city: business.city,
        state: business.state,
        country: business.country,
        latitude: business.latitude,
        longitude: business.longitude,
        phone: business.phone,
        slot_duration_minutes: business.slot_duration_minutes,
        gap_minutes: business.gap_minutes,
        hold_duration_minutes: business.hold_duration_minutes,
        cancellation_limit_hours: business.cancellation_limit_hours,
        max_advance_days: business.max_advance_days
      })
    } catch (err) {
      setSaving(false)
      setError(
        'Error al guardar: ' +
          (err instanceof Error ? err.message : 'Error desconocido.')
      )
      return
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return <Spinner size='lg' />
  }

  if (!business) {
    return (
      <Card className='p-6 text-center text-(--color-text-muted)'>
        No se encontró la configuración del negocio.
      </Card>
    )
  }

  return (
    <div className='flex flex-col gap-5 max-w-2xl mx-auto'>
      {/* Header */}
      <div className='animate-fade-up'>
        <h1 className='text-2xl font-bold tracking-tight'>Configuración</h1>
        <p className='text-sm text-(--color-text-muted) mt-1'>
          Ajusta los datos del negocio y las reglas de operación.
        </p>
      </div>

      {!canEdit && <ReadOnlyNotice />}

      {error && (
        <Alert variant='error' onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {saved && (
        <Alert variant='success'>Configuración guardada correctamente.</Alert>
      )}

      <form onSubmit={handleSave} className='flex flex-col gap-4'>
        <fieldset
          disabled={!canEdit}
          className='flex flex-col gap-4 border-0 p-0 m-0'
        >
          {/* Datos del negocio */}
          <Card className='p-5 animate-fade-up'>
            <div className='flex items-center gap-2 mb-4'>
              <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-pitch-100 text-pitch-700'>
                <StoreIcon size={18} />
              </div>
              <h2 className='font-semibold text-sm tracking-tight'>
                Datos del negocio
              </h2>
            </div>
            <div className='flex flex-col gap-4'>
              <Input
                label='Nombre'
                value={business.name}
                onChange={(e) =>
                  setBusiness({ ...business, name: e.target.value })
                }
                required
              />
              <PhoneInput
                label='Teléfono'
                value={business.phone ?? ''}
                onChange={(val) => setBusiness({ ...business, phone: val })}
                hint='Número de contacto. Se usa en el botón flotante de WhatsApp.'
                optional
              />
            </div>
          </Card>

          {/* Ubicación */}
          <Card
            className='p-5 animate-fade-up'
            style={{ animationDelay: '20ms' }}
          >
            <div className='flex items-center gap-2 mb-4'>
              <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-pitch-100 text-pitch-700'>
                <MapPinIcon size={18} />
              </div>
              <h2 className='font-semibold text-sm tracking-tight'>
                Ubicación
              </h2>
            </div>
            <div className='flex flex-col gap-4'>
              <Input
                label='Calle / Carrera y número'
                value={business.street ?? ''}
                onChange={(e) =>
                  setBusiness({ ...business, street: e.target.value })
                }
                placeholder='Ej: Calle 123 #45-67'
                hint='Dirección física del establecimiento.'
              />
              <Input
                label='Barrio / Zona'
                value={business.neighborhood ?? ''}
                onChange={(e) =>
                  setBusiness({ ...business, neighborhood: e.target.value })
                }
                placeholder='Ej: El Poblado'
              />
              <div className='grid grid-cols-2 gap-3'>
                <Input
                  label='Ciudad'
                  value={business.city ?? ''}
                  onChange={(e) =>
                    setBusiness({ ...business, city: e.target.value })
                  }
                  placeholder='Ej: Medellín'
                />
                <Input
                  label='Departamento'
                  value={business.state ?? ''}
                  onChange={(e) =>
                    setBusiness({ ...business, state: e.target.value })
                  }
                  placeholder='Ej: Antioquia'
                />
              </div>
              <Input
                label='País'
                value={business.country ?? ''}
                onChange={(e) =>
                  setBusiness({ ...business, country: e.target.value })
                }
                placeholder='Colombia'
              />

              {/* Mapa interactivo */}
              <div>
                <label className='text-sm font-medium text-(--color-text) tracking-tight mb-2 block'>
                  Mapa
                </label>
                <p className='text-xs text-(--color-text-muted) mb-3'>
                  Arrastra el pin para ajustar la ubicación exacta. Esto ayuda a
                  los clientes a llegar.
                </p>
                {business.latitude != null && business.longitude != null ? (
                  <LocationMap
                    latitude={business.latitude}
                    longitude={business.longitude}
                    draggable
                    onChange={(lat, lng) =>
                      setBusiness({
                        ...business,
                        latitude: lat,
                        longitude: lng
                      })
                    }
                    height={260}
                  />
                ) : (
                  <div className='rounded-xl border border-dashed border-border bg-surface-inset p-6 text-center'>
                    <MapPinIcon
                      size={28}
                      className='mx-auto text-text-muted mb-2'
                    />
                    <p className='text-sm text-text-muted mb-3'>
                      Busca la ubicación en el mapa para fijar el pin.
                    </p>
                    <SearchLocationButton
                      onFound={(lat, lng) =>
                        setBusiness({
                          ...business,
                          latitude: lat,
                          longitude: lng
                        })
                      }
                      addressParts={{
                        street: business.street,
                        neighborhood: business.neighborhood,
                        city: business.city,
                        state: business.state,
                        country: business.country
                      }}
                    />
                  </div>
                )}
                {business.latitude != null && business.longitude != null && (
                  <button
                    type='button'
                    onClick={() =>
                      setBusiness({
                        ...business,
                        latitude: null,
                        longitude: null
                      })
                    }
                    className='mt-2 text-xs text-text-muted hover:text-danger transition-colors'
                  >
                    Quitar ubicación del mapa
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Turnos */}
          <Card
            className='p-5 animate-fade-up'
            style={{ animationDelay: '40ms' }}
            elevated
          >
            <div className='flex items-center gap-2 mb-4'>
              <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-pitch-100 text-pitch-700'>
                <ClockIcon size={18} />
              </div>
              <h2 className='font-semibold text-sm tracking-tight'>Turnos</h2>
            </div>
            <div className='flex flex-col gap-4'>
              {/* Duración del turno — selector visual */}
              <div>
                <label className='block text-sm font-medium mb-2'>
                  Duración del turno
                </label>
                <div className='grid grid-cols-4 gap-2'>
                  {[30, 45, 60, 90].map((min) => (
                    <button
                      key={min}
                      type='button'
                      onClick={() =>
                        setBusiness({ ...business, slot_duration_minutes: min })
                      }
                      className={`flex flex-col items-center justify-center py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        business.slot_duration_minutes === min
                          ? 'border-primary bg-pitch-50 text-primary'
                          : 'border-border bg-surface-inset text-text-muted hover:border-graphite-300'
                      }`}
                      aria-pressed={business.slot_duration_minutes === min}
                    >
                      <span className='nums font-bold text-base'>{min}</span>
                      <span className='text-xs'>min</span>
                    </button>
                  ))}
                </div>
                <div className='flex items-center gap-2 mt-2'>
                  <input
                    type='number'
                    min={15}
                    step={5}
                    value={business.slot_duration_minutes}
                    onChange={(e) =>
                      setBusiness({
                        ...business,
                        slot_duration_minutes: parseInt(e.target.value) || 60
                      })
                    }
                    className='w-20 rounded-lg border border-border bg-surface-inset px-3 py-2 text-sm nums focus:outline-none focus:border-primary'
                    aria-label='Duración personalizada'
                  />
                  <span className='text-xs text-text-muted'>
                    Minutos personalizados (mínimo 15)
                  </span>
                </div>
              </div>

              {/* Gap entre turnos */}
              <div>
                <label className='text-sm font-medium mb-2 flex items-center gap-1.5'>
                  <TimerIcon size={14} className='text-text-muted' />
                  Gap entre turnos
                </label>
                <div className='grid grid-cols-4 gap-2'>
                  {[
                    { v: 0, label: 'Sin gap' },
                    { v: 10, label: '10 min' },
                    { v: 15, label: '15 min' },
                    { v: 30, label: '30 min' }
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type='button'
                      onClick={() =>
                        setBusiness({ ...business, gap_minutes: opt.v })
                      }
                      className={`flex flex-col items-center justify-center py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        business.gap_minutes === opt.v
                          ? 'border-primary bg-pitch-50 text-primary'
                          : 'border-border bg-surface-inset text-text-muted hover:border-graphite-300'
                      }`}
                      aria-pressed={business.gap_minutes === opt.v}
                    >
                      <span className='nums font-bold text-base'>
                        {opt.v === 0 ? '0' : opt.v}
                      </span>
                      <span className='text-xs'>
                        {opt.v === 0 ? 'seguidos' : 'min'}
                      </span>
                    </button>
                  ))}
                </div>
                <div className='flex items-center gap-2 mt-2'>
                  <input
                    type='number'
                    min={0}
                    step={5}
                    value={business.gap_minutes}
                    onChange={(e) =>
                      setBusiness({
                        ...business,
                        gap_minutes: parseInt(e.target.value) || 0
                      })
                    }
                    className='w-20 rounded-lg border border-border bg-surface-inset px-3 py-2 text-sm nums focus:outline-none focus:border-primary'
                    aria-label='Gap personalizado'
                  />
                  <span className='text-xs text-text-muted'>
                    Descanso entre reservas (limpieza, preparación)
                  </span>
                </div>
              </div>

              {/* Preview de cómo quedan los turnos */}
              <div className='bg-surface-inset rounded-lg p-3 border border-border'>
                <p className='text-xs font-medium text-text-muted mb-2 flex items-center gap-1.5'>
                  <ClockIcon size={12} />
                  Vista previa
                </p>
                <div className='flex items-center gap-1.5 flex-wrap'>
                  {(() => {
                    const slots: string[] = []
                    const start = 8 * 60 // 08:00
                    const dur = business.slot_duration_minutes
                    const gap = business.gap_minutes
                    let t = start
                    for (let i = 0; i < 5; i++) {
                      const h = Math.floor(t / 60)
                      const m = t % 60
                      slots.push(
                        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                      )
                      t += dur + gap
                    }
                    return slots.map((s, i) => (
                      <span key={i} className='flex items-center gap-1.5'>
                        <span className='nums text-sm font-medium bg-surface px-2.5 py-1 rounded-md border border-border'>
                          {s}
                        </span>
                        {i < slots.length - 1 && (
                          <span className='text-text-muted text-xs'>
                            {gap > 0 ? `${gap}m` : '→'}
                          </span>
                        )}
                      </span>
                    ))
                  })()}
                </div>
              </div>
            </div>
          </Card>

          {/* Reglas de operación */}
          <Card
            className='p-5 animate-fade-up'
            style={{ animationDelay: '80ms' }}
          >
            <div className='flex items-center gap-2 mb-4'>
              <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-surface-inset text-text-muted'>
                <CalendarIcon size={18} />
              </div>
              <h2 className='font-semibold text-sm tracking-tight'>
                Reglas de operación
              </h2>
            </div>
            <div className='flex flex-col gap-4'>
              <Input
                label='Hold temporal (minutos)'
                type='number'
                min={5}
                value={String(business.hold_duration_minutes)}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    hold_duration_minutes: parseInt(e.target.value) || 30
                  })
                }
                hint='Tiempo que un turno queda retenido mientras el negocio decide confirmar.'
              />
              <Input
                label='Límite de cancelación (horas antes)'
                type='number'
                min={0}
                value={String(business.cancellation_limit_hours)}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    cancellation_limit_hours: parseInt(e.target.value) || 2
                  })
                }
                hint='El cliente puede cancelar hasta X horas antes del turno.'
              />
              <Input
                label='Anticipación máxima (días)'
                type='number'
                min={1}
                value={String(business.max_advance_days)}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    max_advance_days: parseInt(e.target.value) || 30
                  })
                }
                hint='Hasta cuántos días en adelante se puede reservar.'
              />
            </div>
          </Card>

          {/* Info read-only */}
          <Card
            className='p-4 animate-fade-up'
            style={{ animationDelay: '100ms' }}
          >
            <div className='flex flex-col gap-2 text-sm'>
              <div className='flex items-center gap-2'>
                <MapPinIcon size={14} className='text-text-muted shrink-0' />
                <span className='text-text-muted'>Zona horaria:</span>
                <span className='font-medium nums ml-auto'>
                  {business.timezone}
                </span>
              </div>
            </div>
          </Card>
        </fieldset>

        {/* Guardar */}
        <div className='sticky bottom-20 md:bottom-4 z-10'>
          <Card elevated className='p-3'>
            <Button
              type='submit'
              loading={saving}
              disabled={!canEdit}
              size='lg'
              className='w-full'
            >
              Guardar cambios
            </Button>
          </Card>
        </div>
      </form>
    </div>
  )
}
