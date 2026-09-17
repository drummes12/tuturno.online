import { useState, useEffect, useCallback, type SubmitEvent } from 'react'
import { Link } from 'wouter'
import { fetchResourceName } from '@/services/resources'
import {
  createReservation,
  createReservationAdmin
} from '@/services/reservations'
import { updateProfile } from '@/services/profiles'
import { fetchBusinessId } from '@/services/profiles'
import { fetchBusinessContactById } from '@/services/business'
import { setMarketingConsent } from '@/services/privacy'
import { useTenant } from '@/hooks/use-tenant'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { PhoneInput } from '@/components/common/phone-input'
import { Card } from '@/components/common/card'
import { Alert } from '@/components/common/alert'
import { Skeleton } from '@/components/common/skeleton'
import { Spinner } from '@/components/common/spinner'
import { MarkdownContent } from '@/components/common/markdown-content'
import {
  ClientSelector,
  type ClientSelection
} from '@/components/common/client-selector'
import {
  ArrowLeftIcon,
  StoreIcon,
  HourglassIcon,
  CheckIcon,
  WhatsAppIcon,
  InfoIcon
} from '@/components/common/icon'
import {
  resolveWhatsAppLink,
  buildClientReservationMessage
} from '@/lib/whatsapp'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

type ReservePageProps = {
  slug?: string
}

export function ReservePage({ slug }: ReservePageProps = {}) {
  const { user, profile, isAdmin } = useAuthStore()
  const { business, loading: tenantLoading } = useTenant(slug)
  const businessId = business?.id ?? null
  const isDemo = business?.is_demo ?? false

  const params = new URLSearchParams(window.location.search)
  const resourceId = params.get('resource')
  const dateStr = params.get('date')
  const startStr = params.get('start')

  const [resourceName, setResourceName] = useState<string | null>(null)
  const [loadingResource, setLoadingResource] = useState(true)
  const [notes, setNotes] = useState('')
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [adminBusinessId, setAdminBusinessId] = useState<string | null>(null)
  const [businessContact, setBusinessContact] = useState<{
    phone: string
    whatsapp_link: string | null
    name: string
    resource_label_singular: string
    reservation_instructions_md: string | null
  } | null>(null)
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [clientSelection, setClientSelection] = useState<ClientSelection>({
    clientId: null,
    name: '',
    phone: null,
    email: null,
    hasAccount: false
  })

  const handleClientChange = useCallback((selection: ClientSelection) => {
    setClientSelection(selection)
  }, [])

  useEffect(() => {
    if (isAdmin && user) {
      fetchBusinessId(user.id)
        .then(setAdminBusinessId)
        .catch(() => {})
    }
  }, [isAdmin, user])

  // Cargar info del negocio por businessId
  useEffect(() => {
    if (!businessId) return
    fetchBusinessContactById(businessId)
      .then((data) => {
        if (data) {
          setBusinessContact({
            phone: data.phone,
            whatsapp_link: data.whatsapp_link,
            name: data.name,
            resource_label_singular: data.resource_label_singular || 'Recurso',
            reservation_instructions_md: data.reservation_instructions_md
          })
        }
      })
      .catch(() => {})
  }, [businessId])

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setPhone(profile.phone ?? '')
    }
  }, [profile])

  useEffect(() => {
    async function loadResource() {
      if (!resourceId) {
        setLoadingResource(false)
        return
      }
      try {
        const name = await fetchResourceName(resourceId)
        setResourceName(name)
      } catch {
        setResourceName(null)
      } finally {
        setLoadingResource(false)
      }
    }
    loadResource()
  }, [resourceId])

  // Tenant loading
  if (tenantLoading) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-3'>
        <Spinner size='lg' />
        <p className='text-sm text-(--color-text-muted)'>Cargando negocio…</p>
      </div>
    )
  }

  // For demo mode: show visual form without auth requirement
  if (isDemo && !user) {
    return (
      <DemoReservePreview
        slug={slug}
        resourceId={resourceId}
        dateStr={dateStr}
        startStr={startStr}
        resourceName={resourceName}
        loadingResource={loadingResource}
        businessName={business?.name ?? 'Demo'}

        slotDurationMinutes={business?.slot_duration_minutes ?? 60}
      />
    )
  }

  // For real tenants: require auth
  if (!isDemo && !user) {
    return (
      <Card className='p-8 text-center max-w-md mx-auto mt-8 animate-fade-up'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-14 h-14 rounded-full bg-surface-inset flex items-center justify-center text-text-muted'>
            <StoreIcon size={28} />
          </div>
          <div>
            <p className='font-semibold text-(--color-text) mb-1'>
              Inicia sesión para reservar
            </p>
            <p className='text-sm text-(--color-text-muted)'>
              Necesitas una cuenta para solicitar turnos.
            </p>
          </div>
          <Link
            href={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
          >
            <Button>Iniciar sesión</Button>
          </Link>
        </div>
      </Card>
    )
  }

  if (!resourceId || !startStr) {
    return (
      <Card className='p-8 text-center max-w-md mx-auto mt-8 animate-fade-up'>
        <p className='text-(--color-text-muted) mb-4'>
          Faltan datos de la reserva.
        </p>
        <Link href={slug ? `/b/${slug}` : '/'}>
          <Button variant='secondary'>Ver disponibilidad</Button>
        </Link>
      </Card>
    )
  }

  if (loadingResource) {
    return (
      <div className='max-w-md mx-auto mt-8 flex flex-col gap-4'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-32 rounded-xl' />
        <Skeleton className='h-64 rounded-xl' />
      </div>
    )
  }

  const timeLabel = (() => {
    try {
      return format(parseISO(startStr), 'HH:mm')
    } catch {
      return startStr
    }
  })()

  const dateLabel = (() => {
    try {
      return dateStr
        ? format(parseISO(dateStr), "EEEE d 'de' MMMM", { locale: es })
        : ''
    } catch {
      return dateStr
    }
  })()

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (isAdmin) {
        // Admin: validar que haya un cliente seleccionado o creado
        if (!clientSelection.clientId && !clientSelection.name.trim()) {
          setError('Selecciona o crea un cliente para la reserva.')
          setSubmitting(false)
          return
        }

        const { error: rpcError } = await createReservationAdmin(
          resourceId!,
          startStr!,
          {
            clientId: clientSelection.clientId,
            clientName: clientSelection.name || null,
            clientPhone: clientSelection.phone,
            clientEmail: clientSelection.email,
            notes: notes.trim() || null
          }
        )

        setSubmitting(false)

        if (rpcError) {
          setError(rpcError)
          return
        }

        setSuccess(true)
        return
      }

      // Cliente: actualizar perfil si cambió
      if (fullName !== profile?.full_name || phone !== profile?.phone) {
        await updateProfile(user!.id, {
          full_name: fullName.trim(),
          phone: phone.trim()
        })
      }

      const { error: rpcError } = await createReservation(
        resourceId!,
        startStr!,
        notes.trim() || null
      )

      setSubmitting(false)

      if (rpcError) {
        setError(rpcError)
        return
      }

      // Registrar el consentimiento de marketing (opt-in o no).
      // Se hace tras la reserva exitosa: la reserva no depende de esto.
      // Solo aplica para clientes autenticados, no para admins.
      if (businessId) {
        try {
          await setMarketingConsent(businessId, marketingOptIn, 'reservation')
        } catch {
          // No bloquear la reserva por un fallo de consentimiento.
        }
      }

      // Construir enlace de WhatsApp con datos de la reserva
      if (businessContact) {
        const msg = buildClientReservationMessage({
          businessName: businessContact.name,
          resourceName: resourceName,
          resourceLabel: businessContact.resource_label_singular,
          dateLabel: dateLabel,
          timeLabel,
          clientName: fullName.trim()
        })
        const link = resolveWhatsAppLink(
          businessContact.whatsapp_link,
          businessContact.phone,
          msg
        )
        if (link) {
          const win = window.open(link, '_blank', 'noopener,noreferrer')
          if (!win) {
            setWhatsappLink(link)
          }
        }
      }

      setSuccess(true)
    } catch (err) {
      setSubmitting(false)
      setError(
        err instanceof Error ? err.message : 'Ocurrió un error inesperado'
      )
    }
  }

  if (success) {
    return (
      <div className='flex flex-col items-center gap-4 py-12 max-w-md mx-auto animate-fade-up'>
        <Card elevated className='w-full p-8 text-center'>
          <div className='flex flex-col items-center gap-4'>
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isAdmin ? 'bg-pitch-500/15 text-pitch-700 dark:text-pitch-300' : 'bg-flood-500/15 text-yellow-700 dark:text-flood-300'}`}
            >
              {isAdmin ? <CheckIcon size={32} /> : <HourglassIcon size={32} />}
            </div>
            <div>
              <h1 className='text-xl font-bold mb-1.5 tracking-tight'>
                {isAdmin ? 'Reserva confirmada' : 'Solicitud recibida'}
              </h1>
              <p className='text-sm text-(--color-text-muted) max-w-xs'>
                {isAdmin
                  ? 'La reserva fue creada y confirmada directamente.'
                  : 'Tu reserva está pendiente de confirmación por el negocio. Te avisaremos por correo cuando la confirmen o rechacen.'}
              </p>
            </div>
          </div>
          <div className='flex flex-col gap-2 mt-6'>
            {!isAdmin && whatsappLink && (
              <a
                href={whatsappLink}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center justify-center gap-2 w-full rounded-xl bg-green-600 text-white font-medium py-3 px-4 hover:bg-green-700 active:scale-95 transition-all duration-200 ease-spring touch-target'
              >
                <WhatsAppIcon size={20} />
                Abrir WhatsApp
              </a>
            )}
            <Link
              href={
                isAdmin
                  ? '/admin/reservas'
                  : slug
                    ? `/b/${slug}/mis-reservas`
                    : '/mis-reservas'
              }
            >
              <Button className='w-full'>
                {isAdmin ? 'Ver reservas' : 'Ver mis reservas'}
              </Button>
            </Link>
            <Link href={slug ? `/b/${slug}` : '/'}>
              <Button variant='secondary' className='w-full'>
                Volver a la disponibilidad
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4 max-w-md mx-auto'>
      <Link
        href={slug ? `/b/${slug}` : '/'}
        className='flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted) hover:text-(--color-text) transition-colors w-fit touch-target -ml-2 px-2 py-2 rounded-lg'
      >
        <ArrowLeftIcon size={14} />
        Disponibilidad
      </Link>

      <div className='animate-fade-up'>
        <h1 className='text-2xl font-bold tracking-tight'>
          {isAdmin ? 'Crear reserva' : 'Confirmar reserva'}
        </h1>
        <p className='text-sm text-(--color-text-muted) mt-0.5'>
          {isAdmin
            ? 'Registra una reserva directamente confirmada.'
            : 'Revisa los datos antes de enviar.'}
        </p>
      </div>

      <SlotTicket
        resourceName={resourceName}
        dateLabel={dateLabel || ''}
        timeLabel={timeLabel}
        durationMinutes={business?.slot_duration_minutes ?? 60}
      />

      <Card className='p-5 animate-fade-up' style={{ animationDelay: '60ms' }}>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          {isAdmin ? (
            adminBusinessId ? (
              <ClientSelector
                businessId={adminBusinessId}
                onChange={handleClientChange}
              />
            ) : (
              <Skeleton className='h-32 rounded-xl' />
            )
          ) : (
            <>
              <div data-tour='reservation-contact'>
                <Input
                  label='Nombre completo'
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete='name'
                />
                <PhoneInput
                  label='Teléfono'
                  value={phone}
                  onChange={setPhone}
                  required
                  hint='El negocio lo usará para contactarte.'
                />
              </div>
            </>
          )}
          <Input
            label='Notas (opcional)'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='Ej: llegaremos 10 min antes'
            hint='Información adicional para el negocio.'
          />

          {/* Opt-in de marketing por email del negocio — opcional, no preseleccionado */}
          {!isAdmin && businessContact && (
            <label className='flex items-start gap-3 text-sm text-(--color-text) cursor-pointer select-none p-3 rounded-lg border border-border bg-surface-elevated'>
              <input
                type='checkbox'
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className='mt-0.5 h-4 w-4 rounded border-border accent-(--color-primary) cursor-pointer'
              />
              <span className='leading-relaxed'>
                Acepto recibir novedades y promociones de{' '}
                <strong>{businessContact.name}</strong> por correo electrónico.
                Es opcional: puedo rechazarlo y aun así reservar. Puedo darme de
                baja en cualquier momento desde mi perfil.
              </span>
            </label>
          )}

          {error && <Alert variant='error'>{error}</Alert>}

          {!isAdmin && (
            <>
              {/* Instrucciones del negocio en Markdown */}
              {businessContact?.reservation_instructions_md &&
              businessContact.reservation_instructions_md.trim() !== '' ? (
                <Card
                  className='p-4 bg-(--color-primary)/5 border-(--color-primary)/20'
                  data-tour='reservation-instructions'
                >
                  <div className='flex items-center gap-2 mb-2'>
                    <CheckIcon size={16} className='text-(--color-primary)' />
                    <h3 className='text-sm font-semibold text-(--color-text)'>
                      Pasos para confirmar tu reserva
                    </h3>
                  </div>
                  <MarkdownContent
                    content={businessContact.reservation_instructions_md}
                  />
                </Card>
              ) : (
                <Alert variant='warning' data-tour='reservation-instructions'>
                  <strong>Importante:</strong> Esta es una solicitud. El negocio
                  debe confirmarla. El turno queda reservado temporalmente por{' '}
                  {business?.hold_duration_minutes ?? 30}{' '}
                  {(business?.hold_duration_minutes ?? 30) === 1
                    ? 'minuto'
                    : 'minutos'}
                  .
                </Alert>
              )}
            </>
          )}

          <div data-tour='reservation-submit'>
            <Button
              type='submit'
              loading={submitting}
              size='lg'
              className='w-full'
            >
              {isAdmin ? 'Crear reserva confirmada' : 'Enviar solicitud'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

/**
 * Visual-only reserve preview for demo businesses.
 * No auth required, no submit, no real reservation.
 */
function DemoReservePreview({
  slug,
  resourceId,
  dateStr,
  startStr,
  resourceName,
  loadingResource,
  businessName,
  slotDurationMinutes
}: {
  slug?: string
  resourceId: string | null
  dateStr: string | null
  startStr: string | null
  resourceName: string | null
  loadingResource: boolean
  businessName: string
  slotDurationMinutes: number
}) {
  const timeLabel = (() => {
    try {
      return startStr ? format(parseISO(startStr), 'HH:mm') : ''
    } catch {
      return startStr ?? ''
    }
  })()

  const dateLabel = (() => {
    try {
      return dateStr
        ? format(parseISO(dateStr), "EEEE d 'de' MMMM", { locale: es })
        : ''
    } catch {
      return dateStr ?? ''
    }
  })()

  if (!resourceId || !startStr) {
    return (
      <Card className='p-8 text-center max-w-md mx-auto mt-8 animate-fade-up'>
        <p className='text-(--color-text-muted) mb-4'>
          Faltan datos de la reserva.
        </p>
        <Link href={slug ? `/b/${slug}` : '/'}>
          <Button variant='secondary'>Ver disponibilidad</Button>
        </Link>
      </Card>
    )
  }

  if (loadingResource) {
    return (
      <div className='max-w-md mx-auto mt-8 flex flex-col gap-4'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-32 rounded-xl' />
        <Skeleton className='h-64 rounded-xl' />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4 max-w-md mx-auto'>
      <Link
        href={slug ? `/b/${slug}` : '/'}
        className='flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted) hover:text-(--color-text) transition-colors w-fit touch-target -ml-2 px-2 py-2 rounded-lg'
      >
        <ArrowLeftIcon size={14} />
        Disponibilidad
      </Link>

      <div className='animate-fade-up'>
        <h1 className='text-2xl font-bold tracking-tight'>
          Vista previa de reserva
        </h1>
        <p className='text-sm text-(--color-text-muted) mt-0.5'>
          Así se vería el formulario de reserva en {businessName}.
        </p>
      </div>

      {/* Demo banner */}
      <div
        className='flex items-start gap-3 p-4 rounded-xl border border-flood-500/40 bg-flood-500/10 text-(--color-text) animate-fade-up'
        role='status'
      >
        <InfoIcon
          size={20}
          className='shrink-0 mt-0.5 text-(--color-warning)'
        />
        <div className='flex-1'>
          <p className='text-sm font-semibold'>Modo demostración</p>
          <p className='text-xs mt-0.5 text-(--color-text-muted)'>
            Vista previa del formulario que verían tus clientes. En un negocio
            real, aquí enviarían la solicitud y tú la confirmarías — en la demo
            no se crean reservas reales.
          </p>
        </div>
      </div>

      <SlotTicket
        resourceName={resourceName}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        durationMinutes={slotDurationMinutes}
      />

      <Card className='p-5 animate-fade-up' style={{ animationDelay: '60ms' }}>
        <div className='flex flex-col gap-4'>
          <div>
            <Input
              label='Nombre completo'
              value=''
              disabled
              placeholder='El cliente escribiría su nombre aquí'
            />
            <PhoneInput
              label='Teléfono'
              value=''
              onChange={() => {}}
              disabled
              hint='El negocio lo usará para contactarte.'
            />
          </div>
          <Input
            label='Notas (opcional)'
            value=''
            disabled
            placeholder='Ej: llegaremos 10 min antes'
            hint='Información adicional para el negocio.'
          />

          <Link href={slug ? `/b/${slug}` : '/'}>
            <Button variant='secondary' size='lg' className='w-full'>
              <ArrowLeftIcon size={18} />
              Volver a la disponibilidad
            </Button>
          </Link>
          <Link href='/'>
            <Button variant='ghost' size='sm' className='w-full'>
              ¿Buscas tu organización? Volver al inicio
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

/**
 * Ticket del turno — la misma fila del tablero de disponibilidad,
 * ahora como resumen de lo que se está por reservar.
 */
function SlotTicket({
  resourceName,
  dateLabel,
  timeLabel,
  durationMinutes
}: {
  resourceName: string | null
  dateLabel: string
  timeLabel: string
  durationMinutes: number
}) {
  return (
    <div
      className='overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-(--shadow-sm) animate-fade-up dark:border-white/10 dark:bg-pitch-950 dark:text-chalk'
      data-tour='reservation-summary'
    >
      <div className='flex items-center justify-between border-b border-border px-5 py-3 dark:border-white/10'>
        <span className='font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted) dark:text-chalk-dim/70'>
          Tu turno
        </span>
        <span className='font-mono text-[11px] capitalize text-(--color-text-muted) dark:text-chalk-dim/70'>
          {dateLabel}
        </span>
      </div>
      <div className='flex items-center gap-4 px-5 py-4'>
        <span className='nums font-mono text-2xl font-bold text-(--color-text) dark:text-chalk'>
          {timeLabel}
        </span>
        <div className='flex-1 min-w-0'>
          <p className='truncate text-sm font-medium'>{resourceName}</p>
          <p className='text-xs text-(--color-text-muted) nums dark:text-chalk-dim/60'>
            {durationMinutes} min
          </p>
        </div>
        <span className='rounded-md border border-flood-500/40 bg-flood-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-yellow-700 dark:border-flood-400/40 dark:text-flood-300'>
          Seleccionado
        </span>
      </div>
    </div>
  )
}
