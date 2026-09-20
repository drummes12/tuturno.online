import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import {
  cancelMySignupRequest,
  checkSlugAvailability,
  fetchMySignupRequest,
  requestBusinessSignup
} from '@/services/platform'
import { slugify } from '@/lib/slug'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Alert } from '@/components/common/alert'
import { Badge } from '@/components/common/badge'
import { Spinner } from '@/components/common/spinner'
import { PhoneInput } from '@/components/common/phone-input'
import { CheckIcon, XIcon } from '@/components/common/icon'
import type { SignupRequest, SlugAvailability } from '@/types'

const SLUG_MESSAGES: Record<string, string> = {
  invalid_format:
    'Usa solo minúsculas, números y guiones (entre 3 y 40 caracteres).',
  reserved: 'Ese enlace está reservado por la plataforma.',
  taken: 'Ya hay un negocio usando ese enlace.'
}

export function CreateBusinessPage() {
  const { user, memberships, refreshMemberships } = useAuthStore()

  const [request, setRequest] = useState<SignupRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [businessType, setBusinessType] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [slugStatus, setSlugStatus] = useState<SlugAvailability | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      setRequest(await fetchMySignupRequest(user.id))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // La aprobación ocurre en el lado del operador; el cliente no recibe un
  // evento de auth, así que memberships puede estar stale. Cuando la página
  // detecta una solicitud aprobada sin la membresía correspondiente en el
  // store, refresca para que "Ir al panel" y "Ver página pública" funcionen.
  useEffect(() => {
    if (
      request?.status === 'approved' &&
      request.business_id &&
      user &&
      !memberships.some((m) => m.businessId === request.business_id)
    ) {
      void refreshMemberships(user.id)
    }
  }, [request, user, memberships, refreshMemberships])

  // Verificación de disponibilidad con debounce: el servidor es la autoridad,
  // el formulario solo adelanta el resultado.
  useEffect(() => {
    if (!slug) {
      setSlugStatus(null)
      setCheckingSlug(false)
      return
    }
    // Limpia el veredicto anterior mientras se resuelve el debounce para que
    // el botón de envío no quede habilitado con un resultado stale.
    setSlugStatus(null)
    setCheckingSlug(true)
    const timer = setTimeout(async () => {
      try {
        setSlugStatus(await checkSlugAvailability(slug))
      } catch {
        setSlugStatus(null)
      } finally {
        setCheckingSlug(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [slug])

  function handleNameChange(value: string) {
    setBusinessName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await requestBusinessSignup({
        businessName,
        desiredSlug: slug,
        businessType: businessType || null,
        contactPhone: phone || null,
        city: city || null,
        notes: notes || null
      })
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (!request) return
    setSubmitting(true)
    try {
      await cancelMySignupRequest(request.id)
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className='flex justify-center py-12'>
        <Spinner size='lg' />
      </div>
    )
  }

  if (request && request.status === 'pending') {
    return (
      <StatusCard
        title='Solicitud en revisión'
        badge={<Badge variant='warning'>Pendiente</Badge>}
        description={`Recibimos tu solicitud para "${request.business_name}" con el enlace /b/${request.desired_slug}. Te avisaremos por correo en cuanto la revisemos.`}
      >
        <Button
          variant='secondary'
          onClick={handleCancel}
          loading={submitting}
          className='w-full'
        >
          Retirar solicitud
        </Button>
      </StatusCard>
    )
  }

  if (request && request.status === 'approved') {
    const membership = memberships.find(
      (m) => m.businessId === request.business_id
    )
    return (
      <StatusCard
        title='¡Tu negocio está listo!'
        badge={<Badge variant='success'>Aprobado</Badge>}
        description={`${request.business_name} ya está creado. Configura tus espacios y horarios desde el panel.`}
      >
        <div className='flex flex-col gap-2'>
          <Link href='/admin'>
            <Button className='w-full'>Ir al panel</Button>
          </Link>
          {membership && (
            <Link href={`/b/${membership.slug}`}>
              <Button variant='secondary' className='w-full'>
                Ver página pública
              </Button>
            </Link>
          )}
        </div>
      </StatusCard>
    )
  }

  return (
    <div className='flex flex-1 items-center justify-center py-8'>
      <Card
        bordered
        className='grid w-full max-w-md overflow-hidden p-0 animate-fade-up lg:max-w-5xl lg:grid-cols-[1fr_1.2fr]'
      >
        {/* Panel de marca — solo desktop */}
        <aside className='relative hidden flex-col justify-between overflow-hidden bg-pitch-950 p-10 text-chalk lg:flex'>
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-0'
          >
            <div className='absolute -top-24 right-0 h-72 w-72 rounded-full bg-flood-400/15 blur-3xl' />
            <div className='absolute bottom-0 left-0 h-40 w-40 rounded-full bg-pitch-500/20 blur-3xl' />
            <div className='absolute -bottom-28 -right-28 h-72 w-72 rounded-full border-26 border-white/6' />
          </div>

          <div className='relative flex items-center gap-2.5 font-bold tracking-tight'>
            <img
              src='/logo-mark.svg'
              alt='TuTurno'
              className='h-9 w-9 rounded-xl'
            />
            <span className='text-lg'>TuTurno</span>
          </div>

          <div className='relative'>
            <p className='text-[11px] font-medium uppercase tracking-[0.14em] text-pitch-300'>
              Alta de negocio
            </p>
            <p className='mt-3 text-2xl font-bold leading-snug tracking-tight text-balance'>
              Tu negocio,
              <br />
              con agenda propia.
            </p>
            {/* Los pasos reales del alta, en formato agenda */}
            <div className='mt-6 flex flex-col divide-y divide-white/10 rounded-xl border border-white/15 bg-white/5 text-[11px] backdrop-blur-sm'>
              {[
                'Envías la solicitud',
                'La revisamos a mano · < 24 h',
                'Tu página queda lista /b/tu-negocio'
              ].map((step, i) => (
                <div key={step} className='flex items-center gap-3 px-4 py-2.5'>
                  <span className='nums font-semibold text-pitch-300'>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className='uppercase tracking-widest text-chalk/80'>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Formulario */}
        <div className='flex flex-col'>
          {/* Banda de marca compacta — solo mobile */}
          <div className='relative overflow-hidden bg-pitch-950 px-6 py-5 text-chalk lg:hidden'>
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-0'
            >
              <div className='absolute -top-16 right-0 h-40 w-40 rounded-full bg-flood-400/15 blur-3xl' />
              <div className='absolute bottom-0 left-1/3 h-px w-2/3 bg-white/10' />
            </div>
            <div className='relative flex items-center justify-between gap-3'>
              <p className='text-[10px] font-medium uppercase tracking-[0.14em] text-pitch-300'>
                Alta de negocio
              </p>
              <p className='text-xs text-chalk/70'>Revisión en &lt; 24 h.</p>
            </div>
          </div>
          <div className='p-6 md:p-8 lg:p-10'>
            <h1 className='text-2xl font-bold mb-1 tracking-tight'>
              Solicita tu negocio
            </h1>
            <p className='text-sm text-(--color-text-muted) mb-6'>
              Revisamos cada solicitud a mano y te avisamos por correo. Suele
              tomar menos de 24 horas.
            </p>

            {request && request.status === 'rejected' && (
              <div className='mb-4'>
                <Alert variant='warning'>
                  Tu solicitud anterior fue rechazada
                  {request.rejection_reason
                    ? `: ${request.rejection_reason}`
                    : '.'}{' '}
                  Puedes enviar una nueva.
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
              <Input
                label='Nombre del negocio'
                value={businessName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder='Cancha La Bombonera'
                required
                autoFocus
              />

              <div>
                <Input
                  label='Enlace público'
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setSlug(slugify(e.target.value))
                  }}
                  placeholder='cancha-la-bombonera'
                  required
                  hint={`Tu página será tuturno.online/b/${slug || 'tu-negocio'}`}
                />
                {slug && !checkingSlug && slugStatus && (
                  <p
                    className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                      slugStatus.available ? 'text-pitch-700' : 'text-red-700'
                    }`}
                  >
                    {slugStatus.available ? (
                      <>
                        <CheckIcon size={14} /> Enlace disponible
                      </>
                    ) : (
                      <>
                        <XIcon size={14} />
                        {SLUG_MESSAGES[slugStatus.reason ?? ''] ??
                          'Enlace no disponible.'}
                      </>
                    )}
                  </p>
                )}
              </div>

              <Input
                label='Tipo de negocio'
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder='Cancha de fútbol, consultorio, salón…'
              />
              <Input
                label='Ciudad'
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder='Bogotá'
              />
              <PhoneInput
                label='Teléfono de contacto'
                value={phone}
                onChange={setPhone}
                optional
                hint='Lo usamos para contactarte durante la activación.'
              />

              <label className='flex flex-col gap-1.5'>
                <span className='text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted)'>
                  Cuéntanos más
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder='Cuántos espacios reservables tienes, horarios, cualquier detalle útil.'
                  className='rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:border-pitch-600'
                />
              </label>

              {error && <Alert variant='error'>{error}</Alert>}

              <Button
                type='submit'
                size='lg'
                loading={submitting}
                disabled={!slugStatus?.available}
                className='w-full'
              >
                Enviar solicitud
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  )
}

function StatusCard({
  title,
  badge,
  description,
  children
}: {
  title: string
  badge: React.ReactNode
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className='flex flex-1 items-center justify-center py-8'>
      <Card
        bordered
        className='w-full max-w-md overflow-hidden p-0 animate-fade-up'
      >
        {/* Banda de marca — misma familia que el shell del formulario */}
        <div className='relative overflow-hidden bg-pitch-950 px-6 py-5 text-chalk'>
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-0'
          >
            <div className='absolute -top-16 right-0 h-40 w-40 rounded-full bg-flood-400/15 blur-3xl' />
            <div className='absolute bottom-0 left-1/3 h-px w-2/3 bg-white/10' />
          </div>
          <p className='relative text-[10px] font-medium uppercase tracking-[0.14em] text-pitch-300'>
            Alta de negocio
          </p>
        </div>
        <div className='p-6 md:p-8'>
          <div className='flex items-center justify-between gap-3 mb-3'>
            <h1 className='text-xl font-bold tracking-tight'>{title}</h1>
            {badge}
          </div>
          <p className='text-sm text-(--color-text-muted) mb-6'>
            {description}
          </p>
          {children}
        </div>
      </Card>
    </div>
  )
}
