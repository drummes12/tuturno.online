import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type SubmitEvent
} from 'react'
import { Link, useLocation } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import { isPwaInstalled } from '@/lib/pwa-install'
import { Page } from '@/components/layout/page'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { QrScannerSheet } from '@/components/common/qr-scanner-sheet'
import {
  CalendarIcon,
  ClockIcon,
  ListIcon,
  StoreIcon,
  ArrowRightIcon,
  LogInIcon,
  CheckIcon,
  WhatsAppIcon,
  BellIcon,
  QrIcon
} from '@/components/common/icon'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/

// TODO(pricing): placeholder hasta confirmar el precio real de lanzamiento.
const PRICE_FROM = '49.900'

type SlotStatus = 'libre' | 'reservado' | 'ultimo'

interface BoardSlot {
  time: string
  court: string
  status: SlotStatus
}

// Tablero ilustrativo del hero: replica el estado real que muestra /b/demo.
const TONIGHT_SLOTS: BoardSlot[] = [
  { time: '18:00', court: 'Cancha 1 · Fútbol 5', status: 'reservado' },
  { time: '19:00', court: 'Cancha 2 · Fútbol 5', status: 'reservado' },
  { time: '20:00', court: 'Sala Norte · Reuniones', status: 'ultimo' },
  { time: '20:00', court: 'Cancha 3 · Fútbol 8', status: 'libre' },
  { time: '21:00', court: 'Cancha 2 · Pádel', status: 'libre' },
  { time: '22:00', court: 'Consultorio 3 · Terapia', status: 'libre' },
  { time: '23:00', court: 'Cancha 1 · Fútbol 5', status: 'libre' }
]

const STATUS_STYLE: Record<SlotStatus, { chip: string; label: string }> = {
  libre: {
    chip: 'border-pitch-400/40 bg-pitch-400/10 text-pitch-300',
    label: 'Libre'
  },
  reservado: {
    chip: 'border-white/20 bg-white/8 text-white/55 dark:border-white/10 dark:bg-white/5 dark:text-white/40',
    label: 'Reservado'
  },
  ultimo: {
    chip: 'border-flood-400/40 bg-flood-400/10 text-flood-300',
    label: 'En espera'
  }
}

// Fila accionable del home autenticado — misma anatomía en cliente y negocio.
function HomeRow({
  href,
  icon,
  title,
  desc,
  delay
}: {
  href: string
  icon: ReactNode
  title: string
  desc: string
  delay: number
}) {
  return (
    <Link
      href={href}
      className='group flex items-center gap-4 rounded-2xl border border-border bg-surface-elevated px-5 py-3.5 shadow-(--shadow-xs) transition-[transform,border-color] duration-200 ease-spring hover:-translate-y-0.5 hover:border-border-strong animate-fade-up'
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pitch-100 text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300'>
        {icon}
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-(--color-text)'>
          {title}
        </span>
        <span className='mt-0.5 block truncate text-sm text-(--color-text-muted)'>
          {desc}
        </span>
      </span>
      <ArrowRightIcon
        size={16}
        className='shrink-0 text-(--color-text-muted) transition-transform duration-200 ease-spring group-hover:translate-x-0.5'
      />
    </Link>
  )
}

export function LandingPage() {
  const { user, memberships, activeBusinessId } = useAuthStore()
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [, navigate] = useLocation()
  const pwaInstalled = isPwaInstalled()
  const closeScanner = useCallback(() => setScannerOpen(false), [])

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

  const orgForm = (
    <form onSubmit={handleGoToOrg} className='flex flex-col gap-3'>
      <Input
        label='Identificador del negocio'
        placeholder='mi-negocio'
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        error={error}
        hint='Te lo compartió el negocio. Ej: canchas-el-parque'
        icon={<ArrowRightIcon size={18} />}
      />
      <Button type='submit' size='md' variant='secondary'>
        Ver disponibilidad
        <ArrowRightIcon size={18} />
      </Button>
      {pwaInstalled && (
        <button
          type='button'
          onClick={() => setScannerOpen(true)}
          className='inline-flex touch-target items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-(--color-text) transition-colors hover:bg-surface-inset'
        >
          <QrIcon size={18} />
          Escanear QR del negocio
        </button>
      )}
    </form>
  )

  if (user) {
    const business =
      memberships.find((m) => m.businessId === activeBusinessId) ??
      memberships[0] ??
      null

    return (
      <Page width='full' className='flex-1 items-center'>
        <div className='grid w-full max-w-md grid-cols-1 gap-4 lg:max-w-5xl lg:grid-cols-[1fr_1.15fr] lg:gap-5'>
          {/* Panel cancha — izquierda en desktop, banda arriba en mobile */}
          <section className='relative overflow-hidden rounded-2xl bg-pitch-950 px-6 py-6 text-chalk shadow-(--shadow-lg) animate-fade-up lg:flex lg:flex-col lg:justify-between lg:p-8'>
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-0'
            >
              <div className='absolute inset-x-0 top-0 h-24 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(250,204,21,0.12),transparent)]' />
              <div className='absolute inset-y-0 left-1/2 w-px bg-white/10' />
              <div className='absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10' />
            </div>
            <span className='relative font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-pitch-300'>
              {business ? business.businessName : 'Tu turno'}
            </span>
            <div className='relative mt-4 lg:mt-0'>
              <h1 className='text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-3xl'>
                {business ? (
                  <>
                    ¿Cómo va tu
                    <br />
                    cancha?
                  </>
                ) : (
                  <>
                    ¿Qué reservas
                    <br />
                    hoy?
                  </>
                )}
              </h1>
              <p className='mt-1.5 text-sm text-chalk-dim/80'>
                {business
                  ? 'Gestiona tus turnos o revisa tu página pública.'
                  : 'Entra al tablero de tu negocio o revisa tus reservas.'}
              </p>
            </div>
          </section>

          <div className='flex flex-col gap-4'>
            {business ? (
              <>
                {/* Negocio — operación primero */}
                <HomeRow
                  href='/admin'
                  icon={<CalendarIcon size={18} />}
                  title='Panel de administración'
                  desc='Reservas, horarios y configuración'
                  delay={60}
                />
                <HomeRow
                  href={`/b/${business.slug}`}
                  icon={<StoreIcon size={18} />}
                  title='Mi página pública'
                  desc='Cómo te ven tus clientes'
                  delay={120}
                />
                <HomeRow
                  href='/mis-reservas'
                  icon={<ListIcon size={18} />}
                  title='Mis reservas'
                  desc='Las que agendaste como cliente'
                  delay={180}
                />
              </>
            ) : (
              <>
                {/* Cliente — reservar primero */}
                <HomeRow
                  href='/mis-reservas'
                  icon={<ListIcon size={18} />}
                  title='Mis reservas'
                  desc='Próximas, pendientes y pasadas'
                  delay={60}
                />
                <section
                  className='flex flex-col gap-3 rounded-2xl border border-border bg-surface-elevated p-4 shadow-(--shadow-xs) animate-fade-up'
                  style={{ animationDelay: '120ms' }}
                >
                  <span className='font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-(--color-text-muted)'>
                    Ir a un negocio
                  </span>
                  {orgForm}
                </section>
                <Link
                  href='/crear-negocio'
                  className='flex items-center justify-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted) transition-colors hover:text-(--color-text) touch-target animate-fade-up'
                  style={{ animationDelay: '180ms' }}
                >
                  <StoreIcon size={15} />
                  Quiero TuTurno para mi negocio
                </Link>
              </>
            )}
          </div>
        </div>
        {scannerOpen && <QrScannerSheet onClose={closeScanner} />}
      </Page>
    )
  }

  return (
    <div className='-mt-23 -mb-6 flex flex-col'>
      {/* Hero — el tablero de esta noche. Cancha oscura a ancho completo,
          floodlight, la disponibilidad como pieza central, no promesa. */}
      <section className='relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-pitch-950 text-chalk dark:bg-[#050f09]'>
        {/* Líneas de cancha: franja central y círculo, pura geometría */}
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0'
        >
          <div className='absolute inset-y-0 left-1/2 w-px bg-white/15 dark:bg-white/6' />
          <div className='absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 dark:border-white/6' />
          <div className='absolute inset-x-0 bottom-0 h-px bg-white/10 dark:bg-white/5' />
          <div className='absolute inset-x-0 top-0 h-48 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(250,204,21,0.08),transparent)] dark:bg-[radial-gradient(60%_100%_at_50%_0%,rgba(250,204,21,0.13),transparent)]' />
        </div>

        <div className='relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-6 pt-28 pb-16 sm:pt-32 sm:pb-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pb-24'>
          <div className='flex flex-col items-start gap-6'>
            <h1 className='text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl'>
              Tu agenda, llena.
              <br />
              Los turnos entran solos.
            </h1>
            <p className='hero-description max-w-[46ch] text-pretty text-base text-chalk-dim/80 sm:text-lg'>
              Publica tu disponibilidad en tiempo real. Tus clientes piden turno
              desde el celular; tú apruebas con un toque.
            </p>
            <div className='flex w-full flex-col gap-3 sm:w-auto sm:flex-row'>
              <Link href='/b/demo' data-tour='landing-demo'>
                <Button
                  size='lg'
                  className='w-full sm:w-auto'
                  data-tour='landing-demo-btn'
                >
                  Probar demostración
                  <ArrowRightIcon size={18} />
                </Button>
              </Link>
              <Link
                href='/crear-negocio'
                className='inline-flex touch-target items-center justify-center gap-2 rounded-xl border border-white/20 backdrop-blur-sm px-6 py-3.5 text-lg font-semibold text-chalk transition-all duration-200 ease-spring hover:bg-white/10 active:scale-[0.98] w-full sm:w-auto'
              >
                Crear mi negocio
              </Link>
            </div>
          </div>

          {/* Fixture board — replica la grilla real de disponibilidad.
              El border-beam invita al click: es "la luz del estadio". */}
          <div
            className='border-beam animate-fade-up rounded-2xl p-[1.5px]'
            style={{ animationDelay: '120ms' }}
          >
            <Link
              href='/b/demo'
              aria-label='Ver la demostración en vivo'
              className='group block rounded-2xl bg-pitch-950 shadow-(--shadow-lg) backdrop-blur-sm transition-[transform,box-shadow] duration-300 ease-spring'
            >
              <div className='flex items-center justify-between border-b border-white/15 px-5 py-3.5 dark:border-white/10'>
                <span className='font-mono text-xs font-medium uppercase tracking-[0.14em] text-chalk-dim/70'>
                  Esta noche · 4 espacios
                </span>
                <span className='flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-pitch-300'>
                  <span className='live-dot h-1.5 w-1.5 rounded-full bg-pitch-400' />
                  En vivo
                </span>
              </div>
              <ul className='flex flex-col divide-y divide-white/10 dark:divide-white/6'>
                {TONIGHT_SLOTS.map((slot, i) => {
                  const status = STATUS_STYLE[slot.status]
                  return (
                    <li
                      key={`${slot.time}-${slot.court}`}
                      className='animate-stagger flex items-center gap-4 px-5 py-3 transition-[transform,background-color] duration-200 ease-spring hover:translate-x-0.5 hover:bg-white/8 dark:hover:bg-white/6'
                      style={{ '--index': i } as CSSProperties}
                    >
                      <span className='nums w-12 font-mono text-sm font-semibold text-chalk'>
                        {slot.time}
                      </span>
                      <span className='flex-1 truncate text-sm text-chalk-dim/70'>
                        {slot.court}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium ${status.chip}`}
                      >
                        {status.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className='flex items-center justify-between border-t border-white/15 px-5 py-3 text-xs text-chalk-dim/70 dark:border-white/10 dark:text-chalk-dim/60'>
                <span>Así se ve tu disponibilidad</span>
                <span className='flex items-center gap-1 font-medium text-pitch-300 transition-transform duration-200 ease-spring group-hover:translate-x-0.5'>
                  Ver demo
                  <ArrowRightIcon size={13} />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <div className='mx-auto flex w-full max-w-5xl flex-col gap-28 py-20 sm:py-24'>
        {/* Cómo funciona — la secuencia es la información */}
        <Reveal>
          <section className='flex flex-col gap-8'>
            <h2 className='text-2xl font-bold tracking-tight text-(--color-text) sm:text-3xl text-balance'>
              De la llamada al turno confirmado, en tres movimientos
            </h2>
            <ol className='grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-3'>
              {[
                {
                  title: 'Publicas tus horarios',
                  desc: 'Configuras espacios, turnos y cierres una sola vez. Tu página pública queda lista: tuturno.online/b/tu-negocio.'
                },
                {
                  title: 'El cliente pide su turno',
                  desc: 'Ve los horarios libres en tiempo real y solicita el suyo en segundos desde el celular, sin llamarte.'
                },
                {
                  title: 'Tú apruebas con un toque',
                  desc: 'Cada solicitud llega a tu panel. Confirmas o rechazas desde el celular y el cliente recibe el aviso al instante.'
                }
              ].map((step, i) => (
                <li key={step.title} className='flex flex-col gap-2'>
                  <span className='font-mono text-sm font-semibold text-pitch-600 dark:text-pitch-400'>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className='text-base font-semibold tracking-tight text-(--color-text)'>
                    {step.title}
                  </h3>
                  <p className='text-sm leading-relaxed text-(--color-text-muted)'>
                    {step.desc}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </Reveal>

        {/* Todo lo que incluye — checklist + features de producto */}
        <Reveal>
          <section className='grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14'>
            <div className='flex flex-col gap-3'>
              <h2 className='text-2xl font-bold tracking-tight text-(--color-text) sm:text-3xl text-balance'>
                Todo lo que necesita tu negocio, nada que sobre
              </h2>
              <p className='text-base text-(--color-text-muted) text-pretty'>
                Pensado para cualquier espacio que se reserve por turnos:
                canchas, salas, consultorios, mesas, estudios. Si tu negocio
                trabaja por horarios, te sirve.
              </p>
              <div className='mt-2 flex flex-col gap-2'>
                <Link href='/crear-negocio' className='w-fit'>
                  <Button size='md' variant='secondary'>
                    <StoreIcon size={18} />
                    Quiero TuTurno para mi negocio
                  </Button>
                </Link>
                <p className='text-sm text-(--color-text-muted)'>
                  Desde ${PRICE_FROM} COP/mes por negocio.
                </p>
              </div>
            </div>
            <ul className='grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2'>
              {[
                { icon: ClockIcon, text: 'Disponibilidad en tiempo real' },
                {
                  icon: BellIcon,
                  text: 'Avisos instantáneos para tus clientes'
                },
                { icon: CalendarIcon, text: 'Cierres y excepciones' },
                {
                  icon: WhatsAppIcon,
                  text: 'Contacto rápido entre cliente y negocio'
                },
                { icon: StoreIcon, text: 'Múltiples espacios, un solo panel' },
                { icon: CheckIcon, text: 'Enlace público personalizado' }
              ].map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className='flex items-center gap-3 rounded-xl border border-border bg-surface-elevated px-4 py-3 transition-[transform,border-color] duration-200 ease-spring hover:-translate-y-0.5 hover:border-border-strong'
                >
                  <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pitch-100 text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300'>
                    <Icon size={16} />
                  </span>
                  <span className='text-sm font-medium text-(--color-text)'>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        {/* Slug form */}
        <Reveal>
          <section className='grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-surface-elevated p-6 transition-colors duration-200 ease-spring hover:border-border-strong sm:p-8 lg:grid-cols-2 lg:gap-10'>
            <div className='flex flex-col gap-1'>
              <h2 className='text-xl font-bold tracking-tight text-(--color-text) sm:text-2xl'>
                ¿Vienes a reservar un turno?
              </h2>
              <p className='text-sm text-(--color-text-muted) sm:text-base'>
                Si el negocio te compartió su identificador, ingrésalo aquí y ve
                directo a qué horarios tiene libres.
              </p>
            </div>
            {orgForm}
          </section>
        </Reveal>

        {/* FAQ — conservado para GEO/AI citation */}
        <Reveal>
          <section className='flex flex-col gap-4'>
            <h2 className='text-2xl font-bold tracking-tight text-(--color-text) sm:text-3xl'>
              Preguntas frecuentes
            </h2>
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              <FAQItem
                question='¿Qué es TuTurno?'
                answer='TuTurno es una plataforma de reservas online para negocios que gestionan espacios reservables como canchas deportivas, salas de reuniones, consultorios, mesas de restaurante y más. Permite a los clientes ver la disponibilidad en tiempo real y solicitar su turno en segundos.'
              />
              <FAQItem
                question='¿Cómo funciona?'
                answer='El negocio configura sus espacios, horarios y reglas de reserva. Los clientes acceden a la página pública, ven los turnos disponibles en un calendario visual y solicitan el que prefieran. El negocio recibe la solicitud y puede confirmarla o rechazarla manualmente. Las notificaciones se envían automáticamente.'
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
        </Reveal>
      </div>

      {/* Cierre — banda oscura que cierra el light mode con la misma
          noche del hero. La página termina donde empezó. */}
      <section className='relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-pitch-950 py-20 text-chalk sm:py-24 dark:bg-[#050f09]'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0'
        >
          <div className='absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(250,204,21,0.08),transparent)]' />
        </div>
        <div className='relative mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-6 text-center'>
          <h2 className='text-balance text-3xl font-bold tracking-[-0.02em] sm:text-4xl'>
            ¿Listo para llenar tu agenda?
          </h2>
          <div className='flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row'>
            <Link href='/crear-negocio'>
              <Button size='lg' className='w-full sm:w-auto'>
                <StoreIcon size={18} />
                Crear mi negocio
              </Button>
            </Link>
            <Link
              href='/b/demo'
              className='inline-flex touch-target w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-lg font-semibold text-chalk transition-all duration-200 ease-spring hover:bg-white/10 active:scale-[0.98] sm:w-auto'
            >
              Ver la demostración
            </Link>
          </div>
          <p className='text-sm text-chalk-dim/70'>
            Desde ${PRICE_FROM} COP/mes por negocio.
          </p>
          <div className='flex flex-col items-center gap-1'>
            <p className='text-xs text-chalk-dim/50'>
              ¿Ya administras un negocio?
            </p>
            <Link
              href='/login'
              className='inline-flex touch-target items-center gap-1.5 text-sm font-medium text-pitch-300 transition-colors hover:text-pitch-200'
            >
              <LogInIcon size={15} />
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>
      {scannerOpen && <QrScannerSheet onClose={closeScanner} />}
    </div>
  )
}

// Reveal por scroll: las secciones entran una sola vez, con la misma
// curva spring del sistema. prefers-reduced-motion las deja quietas.
function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-[opacity,translate] duration-500 ease-spring ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      {children}
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className='group self-start rounded-xl border border-border bg-surface-elevated overflow-hidden transition-colors duration-200 ease-spring hover:border-border-strong'>
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
