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
  SparklesIcon,
  CheckIcon
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
        {/* Hero — answer-first format for GEO */}
        <section className='flex flex-col items-center text-center gap-4 animate-fade-up'>
          <div className='flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white shadow-(--shadow-pitch)'>
            <CalendarIcon size={32} />
          </div>
          <div>
            <h1 className='text-3xl sm:text-4xl font-bold text-(--color-text) tracking-tight text-balance'>
              TuTurno — Reservas online para tu negocio
            </h1>
            <p className='hero-description text-base sm:text-lg text-(--color-text-muted) mt-2 text-pretty'>
              Plataforma de reservas en tiempo real para canchas, salas,
              consultorios, mesas y más. Tus clientes ven la disponibilidad y
              solicitan su turno en segundos, sin llamarte.
            </p>
          </div>
        </section>

        {/* Features — with technical terms for GEO */}
        <section
          className='grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-up'
          style={{ animationDelay: '60ms' }}
        >
          <FeatureCard
            icon={<ClockIcon size={20} />}
            title='Disponibilidad en tiempo real'
            desc='Tus clientes ven los turnos libres sin llamarte. Actualización instantánea al confirmar o cancelar.'
          />
          <FeatureCard
            icon={<StoreIcon size={20} />}
            title='Cualquier espacio reservable'
            desc='Canchas de fútbol, pádel o tenis. Salas de reuniones. Consultorios. Mesas. Tú eliges cómo llamarlos.'
          />
          <FeatureCard
            icon={<CalendarIcon size={20} />}
            title='Confirmación manual'
            desc='Tú decides quién entra. Aprueba, rechaza o cancela reservas desde el panel de administración.'
          />
        </section>

        {/* Benefits list — for AI extraction */}
        <section
          className='flex flex-col gap-2 animate-fade-up'
          style={{ animationDelay: '90ms' }}
        >
          <h2 className='text-sm font-semibold text-(--color-text-muted) uppercase tracking-wide'>
            Todo lo que incluye
          </h2>
          <ul className='flex flex-col gap-1.5'>
            {[
              'Notificaciones automáticas por correo electrónico',
              'Gestión de cierres y excepciones de horarios',
              'Botón de contacto directo por WhatsApp',
              'Múltiples espacios con calendario independiente',
              'Panel de administración mobile-first',
              'Enlace público personalizado para tu negocio'
            ].map((benefit) => (
              <li
                key={benefit}
                className='flex items-start gap-2 text-sm text-(--color-text)'
              >
                <CheckIcon
                  size={16}
                  className='text-pitch-600 shrink-0 mt-0.5'
                />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Demo CTA */}
        <section
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
            Recorre la experiencia completa sin crear reservas reales.
          </p>
          <Link href='/crear-negocio'>
            <Button size='md' variant='secondary' className='w-full'>
              <StoreIcon size={18} />
              Quiero TuTurno para mi negocio
            </Button>
          </Link>
        </section>

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
            hint='Te lo compartió el negocio. Ej: canchas-el-parque'
            icon={<ArrowRightIcon size={18} />}
          />
          <Button type='submit' size='md' variant='secondary'>
            Ir a mi organización
            <ArrowRightIcon size={18} />
          </Button>
        </form>

        {/* FAQ — for GEO/AI citation (+40% visibility with FAQPage schema) */}
        <section
          className='flex flex-col gap-4 animate-fade-up'
          style={{ animationDelay: '240ms' }}
        >
          <h2 className='text-lg font-bold tracking-tight'>
            Preguntas frecuentes
          </h2>
          <div className='flex flex-col gap-3'>
            <FAQItem
              question='¿Qué es TuTurno?'
              answer='TuTurno es una plataforma de reservas online para negocios que gestionan espacios reservables como canchas deportivas, salas de reuniones, consultorios, mesas de restaurante y más. Permite a los clientes ver la disponibilidad en tiempo real y solicitar su turno en segundos.'
            />
            <FAQItem
              question='¿Cómo funciona?'
              answer='El negocio configura sus espacios, horarios y reglas de reserva. Los clientes acceden a la página pública, ven los turnos disponibles en un calendario visual y solicitan el que prefieran. El negocio recibe la solicitud y puede confirmarla o rechazarla manualmente. Las notificaciones se envían automáticamente por correo.'
            />
            <FAQItem
              question='¿Qué tipos de negocios pueden usarlo?'
              answer='Cualquier negocio que gestione espacios reservables: canchas de fútbol, pádel o tenis; salas de reuniones o eventos; consultorios médicos o de terapia; mesas de restaurante; estudios de grabación; y cualquier espacio que requiera gestión de turnos por horario.'
            />
            <FAQItem
              question='¿Los clientes necesitan registrarse?'
              answer='Los clientes pueden ver la disponibilidad sin registrarse. Para crear una reserva, pueden registrarse o el negocio puede crear la reserva por ellos. Cuando un invitado se registra posteriormente, sus datos se vinculan automáticamente.'
            />
            <FAQItem
              question='¿Funciona en el celular?'
              answer='Sí, TuTurno está diseñado mobile-first. Tanto la página pública como el panel de administración funcionan perfectamente en dispositivos móviles, con navegación adaptada al pulgar.'
            />
          </div>
        </section>

        {/* Owner login */}
        <div
          className='flex flex-col items-center gap-2 animate-fade-up'
          style={{ animationDelay: '280ms' }}
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

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className='group rounded-xl border border-border bg-surface-elevated overflow-hidden'>
      <summary className='flex items-center justify-between gap-3 p-4 cursor-pointer text-sm font-medium text-(--color-text) list-none [&::-webkit-details-marker]:hidden'>
        <span>{question}</span>
        <span className='text-text-muted shrink-0 transition-transform group-open:rotate-90'>
          <ArrowRightIcon size={16} />
        </span>
      </summary>
      <p className='faq-answer px-4 pb-4 text-sm text-(--color-text-muted) leading-relaxed'>
        {answer}
      </p>
    </details>
  )
}
