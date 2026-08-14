import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'wouter'
import { fetchCourtName } from '@/services/courts'
import {
  createReservation,
  createReservationAdmin
} from '@/services/reservations'
import { updateProfile } from '@/services/profiles'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { PhoneInput } from '@/components/common/phone-input'
import { Card } from '@/components/common/card'
import { Alert } from '@/components/common/alert'
import { Skeleton } from '@/components/common/skeleton'
import {
  ArrowLeftIcon,
  CourtIcon,
  ClockIcon,
  CalendarIcon,
  HourglassIcon,
  CheckIcon
} from '@/components/common/icon'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function ReservePage() {
  const { user, profile, isAdmin } = useAuthStore()

  const params = new URLSearchParams(window.location.search)
  const courtId = params.get('court')
  const dateStr = params.get('date')
  const startStr = params.get('start')

  const [courtName, setCourtName] = useState<string | null>(null)
  const [loadingCourt, setLoadingCourt] = useState(true)
  const [notes, setNotes] = useState('')
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setPhone(profile.phone ?? '')
    }
  }, [profile])

  useEffect(() => {
    async function loadCourt() {
      if (!courtId) return
      try {
        const name = await fetchCourtName(courtId)
        setCourtName(name)
      } catch {
        setCourtName(null)
      } finally {
        setLoadingCourt(false)
      }
    }
    loadCourt()
  }, [courtId])

  if (!user) {
    return (
      <Card className='p-8 text-center max-w-md mx-auto mt-8 animate-fade-up'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-14 h-14 rounded-full bg-surface-inset flex items-center justify-center text-text-muted'>
            <CourtIcon size={28} />
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

  if (!courtId || !startStr) {
    return (
      <Card className='p-8 text-center max-w-md mx-auto mt-8 animate-fade-up'>
        <p className='text-(--color-text-muted) mb-4'>
          Faltan datos de la reserva.
        </p>
        <Link href='/'>
          <Button variant='secondary'>Ver disponibilidad</Button>
        </Link>
      </Card>
    )
  }

  if (loadingCourt) {
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (isAdmin) {
        // Admin: crear reserva directamente confirmada
        const { error: rpcError } = await createReservationAdmin(
          courtId!,
          startStr!,
          fullName.trim() || null,
          phone.trim() || null,
          notes.trim() || null
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
        courtId!,
        startStr!,
        notes.trim() || null
      )

      setSubmitting(false)

      if (rpcError) {
        setError(rpcError)
        return
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
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isAdmin ? 'bg-pitch-100 text-pitch-700' : 'bg-yellow-50 text-yellow-700'}`}
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
            <Link href={isAdmin ? '/admin/reservas' : '/mis-reservas'}>
              <Button className='w-full'>
                {isAdmin ? 'Ver reservas' : 'Ver mis reservas'}
              </Button>
            </Link>
            <Link href='/'>
              <Button variant='secondary' className='w-full'>
                Volver al inicio
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const details = [
    { icon: <CourtIcon size={16} />, label: 'Cancha', value: courtName },
    {
      icon: <CalendarIcon size={16} />,
      label: 'Fecha',
      value: dateLabel,
      capitalize: true
    },
    { icon: <ClockIcon size={16} />, label: 'Hora', value: timeLabel },
    { icon: <ClockIcon size={16} />, label: 'Duración', value: '60 minutos' }
  ]

  return (
    <div className='flex flex-col gap-4 max-w-md mx-auto'>
      <Link
        href='/'
        className='flex items-center gap-1.5 text-sm text-(--color-text-muted) hover:text-(--color-text) transition-colors w-fit touch-target -ml-2 px-2 rounded-lg'
      >
        <ArrowLeftIcon size={16} />
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

      <Card className='p-5 animate-fade-up' elevated>
        <dl className='flex flex-col gap-3 text-sm'>
          {details.map((d) => (
            <div key={d.label} className='flex justify-between items-center'>
              <dt className='flex items-center gap-2 text-(--color-text-muted)'>
                <span className='text-graphite-400'>{d.icon}</span>
                {d.label}
              </dt>
              <dd
                className={`font-medium nums ${d.capitalize ? 'capitalize' : ''}`}
              >
                {d.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className='p-5 animate-fade-up' style={{ animationDelay: '60ms' }}>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          {isAdmin ? (
            <>
              <Input
                label='Nombre del cliente'
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder='Ej: Juan Pérez'
                hint='Opcional. Nombre de la persona que reserva.'
              />
              <PhoneInput
                label='Teléfono del cliente'
                value={phone}
                onChange={setPhone}
                placeholder='300 123 4567'
                hint='Opcional. Si coincide con un usuario registrado, se vincula a su cuenta.'
                optional
              />
            </>
          ) : (
            <>
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
            </>
          )}
          <Input
            label='Notas (opcional)'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='Ej: llegaremos 10 min antes'
            hint='Información adicional para el negocio.'
          />

          {error && <Alert variant='error'>{error}</Alert>}

          {!isAdmin && (
            <Alert variant='warning'>
              <strong>Importante:</strong> Esta es una solicitud. El negocio
              debe confirmarla. El turno queda reservado temporalmente por 30
              minutos.
            </Alert>
          )}

          <Button
            type='submit'
            loading={submitting}
            size='lg'
            className='w-full'
          >
            {isAdmin ? 'Crear reserva confirmada' : 'Enviar solicitud'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
