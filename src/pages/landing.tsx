import { useState, type SubmitEvent } from 'react'
import { Link, useLocation } from 'wouter'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import {
  CalendarIcon,
  ClockIcon,
  StoreIcon,
  ArrowRightIcon,
  LogInIcon,
  SparklesIcon
} from '@/components/common/icon'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/

export function LandingPage() {
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [, navigate] = useLocation()

  function handleGoToOrg(e: SubmitEvent) {
    e.preventDefault()
    const trimmed = slug.trim().toLowerCase()
    if (!trimmed) {
      setError('Ingresa el identificador de tu organización')
      return
    }
    if (!SLUG_PATTERN.test(trimmed) || trimmed.length < 2) {
      setError('Solo letras minúsculas, números y guiones')
      return
    }
    setError(null)
    navigate(`/b/${trimmed}`)
  }

  return (
    <div className='flex flex-col items-center min-h-dvh px-4 py-8'>
      <div className='w-full max-w-lg flex flex-col gap-8'>
        {/* Hero */}
        <div className='flex flex-col items-center text-center gap-4 animate-fade-up'>
          <div className='flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white shadow-(--shadow-pitch)'>
            <CalendarIcon size={32} />
          </div>
          <div>
            <h1 className='text-3xl sm:text-4xl font-bold text-(--color-text) tracking-tight text-balance'>
              TuTurno
            </h1>
            <p className='text-base sm:text-lg text-(--color-text-muted) mt-2 text-pretty'>
              Organiza las reservas de tu espacio en minutos. Canchas, salas,
              consultorios, mesas y más.
            </p>
          </div>
        </div>

        {/* Features */}
        <div
          className='grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-up'
          style={{ animationDelay: '60ms' }}
        >
          <FeatureCard
            icon={<ClockIcon size={20} />}
            title='Disponibilidad en tiempo real'
            desc='Tus clientes ven los turnos libres sin llamarte.'
          />
          <FeatureCard
            icon={<StoreIcon size={20} />}
            title='Cualquier espacio'
            desc='Canchas, salas, consultorios o mesas — tú eliges.'
          />
          <FeatureCard
            icon={<CalendarIcon size={20} />}
            title='Confirmación manual'
            desc='Tú decides quién entra y gestionas las solicitudes.'
          />
        </div>

        {/* Demo CTA */}
        <div
          className='flex flex-col gap-3 animate-fade-up'
          style={{ animationDelay: '120ms' }}
        >
          <Link href='/b/demo' data-tour='landing-demo'>
            <Button size='lg' className='w-full' data-tour='landing-demo-btn'>
              <SparklesIcon size={20} />
              Probar demostración
            </Button>
          </Link>
          <p className='text-center text-xs text-(--color-text-muted)'>
            Recorre la experiencia sin crear reservas reales.
          </p>
        </div>

        {/* Divider */}
        <div
          className='flex items-center gap-3 animate-fade-up'
          style={{ animationDelay: '160ms' }}
        >
          <div className='h-px flex-1 bg-border' />
          <span className='text-xs font-medium text-(--color-text-muted) uppercase tracking-wide'>
            ¿Ya tienes organización?
          </span>
          <div className='h-px flex-1 bg-border' />
        </div>

        {/* Slug form */}
        <form
          onSubmit={handleGoToOrg}
          className='flex flex-col gap-3 animate-fade-up'
          style={{ animationDelay: '200ms' }}
        >
          <Input
            label='Identificador de tu organización'
            placeholder='mi-negocio'
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            error={error}
            hint='Te lo compartió el negocio. Ej: cancha-futbol-5'
            icon={<ArrowRightIcon size={18} />}
          />
          <Button type='submit' size='md' variant='secondary'>
            Ir a mi organización
            <ArrowRightIcon size={18} />
          </Button>
        </form>

        {/* Owner login */}
        <div
          className='flex flex-col items-center gap-2 animate-fade-up'
          style={{ animationDelay: '240ms' }}
        >
          <p className='text-sm text-(--color-text-muted)'>
            ¿Administras un negocio?
          </p>
          <Link href='/login'>
            <Button variant='ghost' size='sm'>
              <LogInIcon size={16} />
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  desc
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className='flex flex-col gap-2 p-4 rounded-xl bg-surface-elevated border border-border'>
      <div className='flex items-center justify-center w-9 h-9 rounded-lg bg-pitch-100 text-pitch-700'>
        {icon}
      </div>
      <h3 className='text-sm font-semibold tracking-tight'>{title}</h3>
      <p className='text-xs text-(--color-text-muted) leading-relaxed'>
        {desc}
      </p>
    </div>
  )
}
