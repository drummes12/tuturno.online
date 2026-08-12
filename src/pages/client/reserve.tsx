import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'wouter'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Card } from '@/components/common/card'
import { Spinner } from '@/components/common/spinner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function ReservePage() {
  const { user, profile } = useAuthStore()

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
      const { data } = await supabase
        .from('courts')
        .select('name')
        .eq('id', courtId)
        .single()
      setCourtName(data?.name ?? null)
      setLoadingCourt(false)
    }
    loadCourt()
  }, [courtId])

  if (!user) {
    return (
      <Card className='p-6 text-center'>
        <p className='text-(--color-text) mb-4'>
          Necesitas iniciar sesión para reservar.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
        >
          <Button>Iniciar sesión</Button>
        </Link>
      </Card>
    )
  }

  if (!courtId || !startStr) {
    return (
      <Card className='p-6 text-center'>
        <p className='text-(--color-text-muted)'>Faltan datos de la reserva.</p>
        <Link href='/'>
          <Button variant='secondary' className='mt-4'>
            Ver disponibilidad
          </Button>
        </Link>
      </Card>
    )
  }

  if (loadingCourt) {
    return <Spinner size='lg' />
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

    // Actualizar perfil si cambió
    if (fullName !== profile?.full_name || phone !== profile?.phone) {
      await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() })
        .eq('id', user!.id)
    }

    const { data, error: rpcError } = await supabase.rpc('create_reservation', {
      p_court_id: courtId!,
      p_starts_at: startStr!,
      p_notes: notes.trim() || null
    })

    setSubmitting(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    if (data?.error) {
      setError(data.error)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className='flex flex-col items-center gap-4 py-8'>
        <Card elevated className='w-full max-w-md p-6 text-center'>
          <div className='text-4xl mb-3'>⏳</div>
          <h1 className='text-xl font-bold mb-2'>Solicitud recibida</h1>
          <p className='text-sm text-(--color-text-muted) mb-6'>
            Tu reserva está <strong>pendiente de confirmación</strong> por el
            negocio. Te avisaremos por correo cuando la confirmen o rechacen.
          </p>
          <div className='flex flex-col gap-2'>
            <Link href='/mis-reservas'>
              <Button className='w-full'>Ver mis reservas</Button>
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

  return (
    <div className='flex flex-col gap-4 max-w-md mx-auto'>
      <div>
        <h1 className='text-2xl font-bold'>Confirmar reserva</h1>
        <p className='text-sm text-(--color-text-muted)'>
          Revisa los datos antes de enviar.
        </p>
      </div>

      <Card className='p-4'>
        <dl className='flex flex-col gap-2 text-sm'>
          <div className='flex justify-between'>
            <dt className='text-(--color-text-muted)'>Cancha</dt>
            <dd className='font-medium'>{courtName}</dd>
          </div>
          <div className='flex justify-between'>
            <dt className='text-(--color-text-muted)'>Fecha</dt>
            <dd className='font-medium capitalize'>{dateLabel}</dd>
          </div>
          <div className='flex justify-between'>
            <dt className='text-(--color-text-muted)'>Hora</dt>
            <dd className='font-medium'>{timeLabel}</dd>
          </div>
          <div className='flex justify-between'>
            <dt className='text-(--color-text-muted)'>Duración</dt>
            <dd className='font-medium'>60 minutos</dd>
          </div>
        </dl>
      </Card>

      <Card className='p-4'>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <Input
            label='Nombre completo'
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete='name'
          />
          <Input
            label='Teléfono'
            type='tel'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete='tel'
            hint='El negocio lo usará para contactarte.'
          />
          <Input
            label='Notas (opcional)'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='Ej: llegaremos 10 min antes'
            hint='Información adicional para el negocio.'
          />

          {error && (
            <p className='text-sm text-(--color-danger) bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
              {error}
            </p>
          )}

          <div className='bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5 text-sm text-yellow-800'>
            <strong>Importante:</strong> Esta es una solicitud. El negocio debe
            confirmarla. El turno queda reservado temporalmente por 30 minutos.
          </div>

          <Button
            type='submit'
            loading={submitting}
            size='lg'
            className='w-full'
          >
            Enviar solicitud
          </Button>
        </form>
      </Card>

      <Link
        href='/'
        className='text-center text-sm text-(--color-text-muted) hover:text-(--color-text)'
      >
        ← Volver a disponibilidad
      </Link>
    </div>
  )
}
