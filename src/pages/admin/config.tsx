import { useState, useEffect, useMemo } from 'react'
import { fetchBusinessById, updateBusiness } from '@/services/business'
import { useBusinessId } from '@/hooks/use-business-id'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { PhoneInput } from '@/components/common/phone-input'
import { Alert } from '@/components/common/alert'
import { Spinner } from '@/components/common/spinner'
import { ReadOnlyNotice } from '@/components/common/read-only-notice'
import { BackLink } from '@/components/common/back-link'
import { useCanEdit } from '@/hooks/use-can-edit'
import { formatFullAddress, googleMapsLink } from '@/lib/address'
import { resolveWhatsAppLink, buildGeneralInquiryMessage } from '@/lib/whatsapp'
import { ShareCard } from '@/components/admin/share-card'
import { MarkdownContent } from '@/components/common/markdown-content'
import {
  ClockIcon,
  CalendarIcon,
  StoreIcon,
  MapPinIcon,
  ExternalLinkIcon,
  TimerIcon,
  CheckIcon,
  WhatsAppIcon,
  RefreshIcon,
  SparklesIcon
} from '@/components/common/icon'
import type { Business } from '@/types'
import { Page } from '@/components/layout/page'

const INSTRUCTIONS_TEMPLATE =
  '## Para confirmar tu reserva\n\n1. Realiza el abono del 50% al negocio.\n2. Envía el comprobante por WhatsApp.\n3. Espera la confirmación del negocio.'

export function AdminConfigPage() {
  const canEdit = useCanEdit()
  const businessId = useBusinessId()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [baseline, setBaseline] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    async function load() {
      if (!businessId) return
      try {
        const data = await fetchBusinessById(businessId)
        setBusiness(data)
        setBaseline(JSON.stringify(data))
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
  }, [businessId])

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
    if (business.min_advance_minutes < 0) {
      setError('La anticipación mínima no puede ser negativa.')
      return
    }
    if (
      !business.resource_label_singular.trim() ||
      !business.resource_label_plural.trim()
    ) {
      setError('Define el nombre singular y plural de tus recursos.')
      return
    }

    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      await updateBusiness(business.id, {
        name: business.name,
        street: business.street,
        neighborhood: business.neighborhood,
        city: business.city,
        state: business.state,
        country: business.country,
        phone: business.phone,
        whatsapp_link: business.whatsapp_link,
        slot_duration_minutes: business.slot_duration_minutes,
        gap_minutes: business.gap_minutes,
        hold_duration_minutes: business.hold_duration_minutes,
        min_advance_minutes: business.min_advance_minutes,
        cancellation_limit_hours: business.cancellation_limit_hours,
        max_advance_days: business.max_advance_days,
        resource_label_singular: business.resource_label_singular.trim(),
        resource_label_plural: business.resource_label_plural.trim(),
        reservation_instructions_md: business.reservation_instructions_md
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
    setBaseline(JSON.stringify(business))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const isDirty = useMemo(
    () => baseline !== null && JSON.stringify(business) !== baseline,
    [business, baseline]
  )

  function handleReset() {
    if (!baseline) return
    setBusiness(JSON.parse(baseline))
    setError(null)
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

  const fullAddress = formatFullAddress({
    street: business.street,
    neighborhood: business.neighborhood,
    city: business.city,
    state: business.state,
    country: business.country
  })
  const mapsUrl = googleMapsLink({
    street: business.street,
    neighborhood: business.neighborhood,
    city: business.city,
    state: business.state,
    country: business.country
  })

  return (
    <Page>
      {/* Header */}
      <div className='animate-fade-up'>
        <div className='flex items-center gap-1'>
          <BackLink href='/admin/negocio' label='Negocio' />
          <h1 className='text-2xl font-bold tracking-tight'>Configuración</h1>
        </div>
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
          className='flex min-w-0 flex-col gap-4 border-0 p-0 m-0 md:grid md:grid-cols-2 md:items-start'
        >
          <div className='contents md:order-1 md:flex md:flex-col md:gap-4'>
            {/* Datos del negocio */}
            <Card className='order-1 p-5 animate-fade-up'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-surface-inset text-text-muted'>
                  <StoreIcon size={18} />
                </div>
                <h2 className='font-mono text-xs font-medium uppercase tracking-[0.14em] text-(--color-text)'>
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
                <div className='grid grid-cols-2 gap-3'>
                  <Input
                    label='Recurso (singular)'
                    value={business.resource_label_singular}
                    onChange={(e) =>
                      setBusiness({
                        ...business,
                        resource_label_singular: e.target.value
                      })
                    }
                    placeholder='Ej: Sala'
                    maxLength={40}
                    required
                  />
                  <Input
                    label='Recursos (plural)'
                    value={business.resource_label_plural}
                    onChange={(e) =>
                      setBusiness({
                        ...business,
                        resource_label_plural: e.target.value
                      })
                    }
                    placeholder='Ej: Salas'
                    maxLength={40}
                    required
                  />
                </div>
                <p className='text-xs text-(--color-text-muted) -mt-2'>
                  Define cómo quieres llamar a las unidades que tus clientes
                  pueden reservar.
                </p>
                <PhoneInput
                  label='Teléfono'
                  value={business.phone ?? ''}
                  onChange={(val) => setBusiness({ ...business, phone: val })}
                  hint='Número de contacto. Se usa en el botón flotante de WhatsApp si no hay un link personalizado.'
                  optional
                />
                <Input
                  label='Link de WhatsApp (opcional)'
                  value={business.whatsapp_link ?? ''}
                  onChange={(e) =>
                    setBusiness({
                      ...business,
                      whatsapp_link: e.target.value || null
                    })
                  }
                  placeholder='Ej: https://wa.me/573001234567 o @usuario'
                  hint='Si prefieres que te contacten por un usuario o link específico en vez del teléfono, escríbelo aquí. Acepta URLs de wa.me, whatsapp.com o un @usuario.'
                />

                {/* Botón de prueba de WhatsApp — abre el mismo link que vería el cliente */}
                {(() => {
                  const testLink = resolveWhatsAppLink(
                    business.whatsapp_link,
                    business.phone,
                    buildGeneralInquiryMessage(business.name)
                  )
                  if (!testLink) return null
                  return (
                    <a
                      href={testLink}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center justify-center gap-2 rounded-lg border border-pitch-600/30 bg-pitch-100 px-4 py-2.5 text-sm font-medium text-pitch-800 hover:bg-pitch-200 dark:bg-pitch-500/15 dark:text-pitch-300 dark:border-pitch-500/30 dark:hover:bg-pitch-500/25 transition-colors touch-target w-full sm:w-auto'
                      aria-label='Probar link de WhatsApp en nueva pestaña'
                      title='Abre el mismo link que vería tu cliente al tocar el botón flotante'
                    >
                      <WhatsAppIcon size={16} />
                      <span>Probar en WhatsApp</span>
                      <ExternalLinkIcon size={14} className='opacity-60' />
                    </a>
                  )
                })()}
              </div>
            </Card>

            {/* Ubicación */}
            <Card
              className='order-3 p-5 animate-fade-up'
              style={{ animationDelay: '20ms' }}
            >
              <div className='flex items-center gap-2 mb-4'>
                <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-surface-inset text-text-muted'>
                  <MapPinIcon size={18} />
                </div>
                <h2 className='font-mono text-xs font-medium uppercase tracking-[0.14em] text-(--color-text)'>
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

                {/* Ubicación en mapas — preview plano, sin card anidada */}
                <div className='flex items-center gap-3 border-t border-border pt-4'>
                  <MapPinIcon size={18} className='shrink-0 text-text-muted' />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium'>
                      {fullAddress || 'Sin dirección configurada'}
                    </p>
                    <p className='text-xs text-(--color-text-muted)'>
                      Verifica la dirección en Google Maps
                    </p>
                  </div>
                  <a
                    href={mapsUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-disabled={!fullAddress}
                    aria-label='Abrir dirección en Google Maps'
                    title='Abrir en Google Maps'
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors touch-target ${
                      fullAddress
                        ? 'bg-(--color-primary) text-white hover:bg-(--color-primary-hover)'
                        : 'pointer-events-none bg-surface-inset text-text-muted opacity-60'
                    }`}
                  >
                    <ExternalLinkIcon size={16} />
                  </a>
                </div>
              </div>
            </Card>
          </div>
          <div className='contents md:order-2 md:flex md:flex-col md:gap-4'>
            {/* Turnos */}
            <Card
              className='order-2 p-5 animate-fade-up'
              style={{ animationDelay: '40ms' }}
            >
              <div className='flex items-center gap-2 mb-4'>
                <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-surface-inset text-text-muted'>
                  <ClockIcon size={18} />
                </div>
                <h2 className='font-mono text-xs font-medium uppercase tracking-[0.14em] text-(--color-text)'>
                  Turnos
                </h2>
              </div>
              <div className='flex flex-col gap-4'>
                {/* Duración del turno — selector visual */}
                <div data-tour='admin-config-slot'>
                  <label className='block font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted) mb-2'>
                    Duración del turno
                  </label>
                  <PresetGrid
                    options={[30, 45, 60, 90].map((min) => ({
                      v: min,
                      top: String(min),
                      bottom: 'min'
                    }))}
                    value={business.slot_duration_minutes}
                    onChange={(v) =>
                      setBusiness({ ...business, slot_duration_minutes: v })
                    }
                  />
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
                <div data-tour='admin-config-gap'>
                  <label className='mb-2 flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted)'>
                    <TimerIcon size={14} />
                    Gap entre turnos
                  </label>
                  <PresetGrid
                    options={[
                      { v: 0, top: '0', bottom: 'seguidos' },
                      { v: 10, top: '10', bottom: 'min' },
                      { v: 15, top: '15', bottom: 'min' },
                      { v: 30, top: '30', bottom: 'min' }
                    ]}
                    value={business.gap_minutes}
                    onChange={(v) =>
                      setBusiness({ ...business, gap_minutes: v })
                    }
                  />
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
                  <p className='mb-2 flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted'>
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
              className='order-4 p-5 animate-fade-up'
              style={{ animationDelay: '80ms' }}
            >
              <div className='flex items-center gap-2 mb-4'>
                <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-surface-inset text-text-muted'>
                  <CalendarIcon size={18} />
                </div>
                <h2 className='font-mono text-xs font-medium uppercase tracking-[0.14em] text-(--color-text)'>
                  Reglas de operación
                </h2>
              </div>
              <div className='flex flex-col gap-4'>
                <div data-tour='admin-config-hold'>
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
                </div>
                <Input
                  label='Anticipación mínima para reservar (minutos)'
                  type='number'
                  min={0}
                  value={String(business.min_advance_minutes)}
                  onChange={(e) =>
                    setBusiness({
                      ...business,
                      min_advance_minutes: parseInt(e.target.value) || 0
                    })
                  }
                  hint='El cliente solo podrá reservar si faltan al menos estos minutos para el turno.'
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
          </div>

          {/* Instrucciones de reserva (Markdown) */}
          <Card
            className='order-5 p-5 animate-fade-up md:col-span-2'
            style={{ animationDelay: '100ms' }}
          >
            <div className='flex items-center gap-2 mb-4'>
              <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-surface-inset text-text-muted'>
                <CheckIcon size={18} />
              </div>
              <h2 className='font-mono text-xs font-medium uppercase tracking-[0.14em] text-(--color-text)'>
                Confirmación y abono
              </h2>
              {canEdit &&
                (business.reservation_instructions_md ?? '').trim() !==
                  INSTRUCTIONS_TEMPLATE && (
                  <button
                    type='button'
                    onClick={() =>
                      setBusiness({
                        ...business,
                        reservation_instructions_md: INSTRUCTIONS_TEMPLATE
                      })
                    }
                    className='ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-pitch-700 transition-colors hover:bg-pitch-500/10 dark:text-pitch-300 touch-target'
                  >
                    <SparklesIcon size={13} />
                    <span className='hidden sm:inline'>Usar plantilla</span>
                  </button>
                )}
            </div>
            <p className='text-sm text-(--color-text-muted) mb-3'>
              Instrucciones que el cliente verá antes de enviar su solicitud.
              Soporta listas, negrita, enlaces y emojis. Máximo 1000 caracteres.
            </p>
            <div className='flex flex-col gap-2'>
              {/* Tabs Editar / Vista previa */}
              <div className='flex gap-1 rounded-lg bg-surface-inset p-1 w-fit'>
                {(['edit', 'preview'] as const).map((tab) => (
                  <button
                    key={tab}
                    type='button'
                    onClick={() => setShowPreview(tab === 'preview')}
                    className={`rounded-md px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-[background-color,color] duration-200 ${
                      (tab === 'preview') === showPreview
                        ? 'bg-surface-elevated text-text shadow-(--shadow-sm)'
                        : 'text-text-muted hover:text-text'
                    }`}
                    aria-pressed={(tab === 'preview') === showPreview}
                  >
                    {tab === 'edit' ? 'Editar' : 'Vista previa'}
                  </button>
                ))}
              </div>

              {showPreview ? (
                <Card className='p-4 bg-(--color-primary)/5 border-(--color-primary)/20'>
                  <div className='flex items-center gap-2 mb-2'>
                    <CheckIcon size={16} className='text-(--color-primary)' />
                    <h3 className='text-sm font-semibold text-(--color-text)'>
                      Pasos para confirmar tu reserva
                    </h3>
                  </div>
                  {(business.reservation_instructions_md ?? '').trim() ? (
                    <MarkdownContent
                      content={business.reservation_instructions_md ?? ''}
                    />
                  ) : (
                    <p className='text-sm italic text-(--color-text-muted)'>
                      Sin instrucciones — el cliente verá el aviso genérico de
                      confirmación.
                    </p>
                  )}
                </Card>
              ) : (
                <textarea
                  id='reservation-instructions'
                  data-tour='admin-config-instructions'
                  value={business.reservation_instructions_md ?? ''}
                  onChange={(e) =>
                    setBusiness({
                      ...business,
                      reservation_instructions_md: e.target.value.slice(0, 1000)
                    })
                  }
                  maxLength={1000}
                  disabled={!canEdit}
                  placeholder={INSTRUCTIONS_TEMPLATE}
                  rows={8}
                  className='w-full min-w-0 rounded-xl border border-border bg-surface-inset px-4 py-3 text-sm text-(--color-text) placeholder:text-(--color-text-muted) focus:bg-surface-elevated focus:border-(--color-primary) focus:outline-none focus:ring-4 focus:ring-(--color-primary)/15 transition-all duration-200 ease-spring resize-y font-mono disabled:opacity-60'
                  aria-describedby='reservation-instructions-hint'
                />
              )}
              <div className='flex items-center justify-between'>
                <p
                  id='reservation-instructions-hint'
                  className='text-xs text-(--color-text-muted)'
                >
                  Ej: pasos de abono, contacto, tiempo de confirmación.
                </p>
                <span
                  className={`text-xs nums tabular-nums ${
                    (business.reservation_instructions_md ?? '').length >= 950
                      ? 'text-(--color-danger) font-medium'
                      : 'text-(--color-text-muted)'
                  }`}
                >
                  {(business.reservation_instructions_md ?? '').length}/1000
                </span>
              </div>
            </div>
          </Card>

          {/* Info read-only */}
          <div
            className='order-6 flex animate-fade-up items-center gap-2 px-1 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted md:col-span-2'
            style={{ animationDelay: '120ms' }}
          >
            <MapPinIcon size={14} className='shrink-0' />
            <span>Zona horaria</span>
            <span className='nums ml-auto'>{business.timezone}</span>
          </div>
        </fieldset>

        {/* Guardar — barra de estado + acciones */}
        <div className='sticky bottom-[calc(var(--bottom-nav-height)+0.5rem)] z-10 md:bottom-4'>
          <Card
            elevated
            className='flex items-center justify-between gap-3 p-3'
          >
            <p
              className={`whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-[0.12em] ${
                isDirty
                  ? 'text-yellow-800 dark:text-flood-300'
                  : 'text-text-muted'
              }`}
            >
              {isDirty ? 'Cambios sin guardar' : 'Sin cambios'}
            </p>
            <div className='flex items-center gap-2'>
              {isDirty && (
                <Button
                  type='button'
                  variant='secondary'
                  size='sm'
                  onClick={handleReset}
                  aria-label='Reestablecer cambios'
                >
                  <RefreshIcon size={15} />
                  <span className='hidden sm:inline'>Reestablecer</span>
                </Button>
              )}
              <Button
                type='submit'
                loading={saving}
                disabled={!canEdit || !isDirty}
                data-tour='admin-config-save'
              >
                Guardar cambios
              </Button>
            </div>
          </Card>
        </div>
      </form>

      {/* Compartir página de reservas — QR + copiar link */}
      <ShareCard slug={business.slug} businessName={business.name} />
    </Page>
  )
}

function PresetGrid({
  options,
  value,
  onChange
}: {
  options: { v: number; top: string; bottom: string }[]
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className='grid grid-cols-4 gap-2'>
      {options.map((opt) => {
        const active = value === opt.v
        return (
          <button
            key={opt.v}
            type='button'
            onClick={() => onChange(opt.v)}
            className={`flex flex-col items-center justify-center rounded-lg border py-2.5 transition-[border-color,background-color,color,transform] duration-200 ease-spring active:scale-[0.97] ${
              active
                ? 'border-primary bg-pitch-100 text-primary dark:bg-pitch-500/15 dark:text-pitch-300'
                : 'border-border bg-surface-inset text-text-muted hover:border-graphite-300 hover:text-text'
            }`}
            aria-pressed={active}
          >
            <span className='nums font-mono text-base font-bold'>
              {opt.top}
            </span>
            <span className='text-xs'>{opt.bottom}</span>
          </button>
        )
      })}
    </div>
  )
}
