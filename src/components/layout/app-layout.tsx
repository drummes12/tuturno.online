import type { ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import {
  CalendarIcon,
  LayoutIcon,
  ListIcon,
  StoreIcon,
  ScheduleIcon,
  SettingsIcon,
  LogOutIcon,
  LogInIcon,
  LockIcon,
  HelpIcon
} from '@/components/common/icon'
import { WhatsAppFab } from '@/components/common/whatsapp-fab'
import { GoogleMapsFab } from '@/components/common/google-maps-fab'
import { BusinessSelector } from '@/components/common/business-selector'
import { useClientTutorial } from '@/hooks/use-client-tutorial'
import { extractSlugFromPath } from '@/lib/slug'

interface NavItem {
  label: string
  href: string
  adminOnly?: boolean
  icon: ReactNode
}

const adminNav: NavItem[] = [
  { label: 'Operación', href: '/admin', icon: <LayoutIcon size={22} /> },
  { label: 'Reservas', href: '/admin/reservas', icon: <ListIcon size={22} /> },
  { label: 'Recursos', href: '/admin/recursos', icon: <StoreIcon size={22} /> },
  {
    label: 'Horarios',
    href: '/admin/horarios',
    icon: <ScheduleIcon size={22} />
  },
  {
    label: 'Cierres',
    href: '/admin/excepciones',
    icon: <LockIcon size={22} />
  },
  {
    label: 'Configuración',
    href: '/admin/configuracion',
    icon: <SettingsIcon size={22} />
  }
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, isPlatformAdmin, signOut } = useAuthStore()
  const [location] = useLocation()
  const { startTour, isStarting } = useClientTutorial()

  // Build tenant-aware client nav
  const slug = extractSlugFromPath(location)
  const tenantBase = slug ? `/b/${slug}` : null
  const clientNav: NavItem[] = tenantBase
    ? [
        {
          label: 'Disponibilidad',
          href: tenantBase,
          icon: <CalendarIcon size={22} />
        },
        {
          label: 'Mis reservas',
          href: `${tenantBase}/mis-reservas`,
          icon: <ListIcon size={22} />
        }
      ]
    : []

  const nav = isAdmin ? adminNav : clientNav

  // El tutorial solo aplica a clientes (visitantes o autenticados sin rol admin)
  const showTutorialButton = !isAdmin && !!tenantBase

  return (
    <div className='min-h-dvh flex flex-col bg-surface overflow-clip'>
      {/* Top bar — pitch green with depth */}
      <header className='sticky top-0 z-40 bg-pitch-800 text-white border-b border-pitch-900 shadow-[0_4px_20px_rgba(4,33,15,0.25)]'>
        <div className='mx-auto max-w-5xl px-4 h-14 flex items-center justify-between'>
          <Link
            href='/'
            className='flex items-center gap-2 font-bold text-base tracking-tight'
          >
            <img
              src='/logo-mark.svg'
              alt='TuTurno'
              className='w-8 h-8 rounded-lg'
            />
            <span>TuTurno</span>
          </Link>
          <div className='flex items-center gap-1 sm:gap-2'>
            {showTutorialButton && (
              <button
                onClick={startTour}
                disabled={isStarting}
                data-tour='tutorial-trigger'
                className='inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-sm font-medium text-white/85 shadow-sm transition-[background-color,border-color,transform,color] hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-95 active:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flood-400 disabled:cursor-wait disabled:opacity-80 touch-target'
                aria-label='Iniciar guía del tutorial'
                aria-busy={isStarting}
                title='Guía interactiva'
              >
                <HelpIcon size={16} />
                <span>{isStarting ? 'Abriendo…' : 'Guía'}</span>
              </button>
            )}
            {isPlatformAdmin && (
              <Link
                href='/plataforma'
                className='inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-sm font-medium text-white/85 hover:border-white/30 hover:bg-white/15 hover:text-white transition-colors touch-target'
                aria-label='Panel de plataforma'
                title='Panel de plataforma'
              >
                <LockIcon size={16} />
                <span className='hidden sm:inline'>Plataforma</span>
              </Link>
            )}
            {isAdmin && <BusinessSelector />}
            {user ? (
              <button
                onClick={() => signOut()}
                className='flex items-center justify-center gap-1.5 text-sm text-chalk-dim hover:text-white transition-colors touch-target px-2 py-2 rounded-lg'
              >
                <LogOutIcon size={16} />
                <span className='hidden sm:inline'>Salir</span>
              </button>
            ) : (
              <Link
                href='/login'
                data-tour='auth-entry'
                className='flex items-center gap-1.5 text-sm text-chalk-dim hover:text-white transition-colors touch-target px-2 py-2 rounded-lg'
              >
                <LogInIcon size={16} />
                <span>Ingresar</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Desktop nav — horizontal, below header */}
      {user && nav.length > 0 && (
        <nav className='hidden md:block border-b overflow-x-auto border-border bg-surface-elevated'>
          <div className='mx-auto max-w-5xl px-4 flex items-center gap-1'>
            {nav.map((item) => {
              const active = location === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={
                    item.href === '/mis-reservas'
                      ? 'client-nav-reservations'
                      : undefined
                  }
                  className={`flex-1 flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ease-spring ${
                    active
                      ? 'border-primary! text-primary!'
                      : 'border-transparent text-text-muted hover:text-text'
                  }`}
                >
                  <span className='opacity-70'>{item.icon}</span>
                  <span className='truncate'>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      {/* Content */}
      <main className='flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-20 md:pb-6'>
        {children}
      </main>

      {/* Bottom nav — mobile, thumb zone, with icons */}
      {user && nav.length > 0 && (
        <nav className='fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/95 backdrop-blur-lg border-t border-border md:hidden'>
          <div className='flex items-center justify-around px-1 py-1.5 pb-[max(env(safe-area-inset-bottom),0.375rem)]'>
            {nav.map((item) => {
              const active = location === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-lg touch-target transition-colors ${
                    active ? 'text-primary' : 'text-text-muted'
                  }`}
                >
                  <span className={active ? 'text-primary' : ''}>
                    {item.icon}
                  </span>
                  <span className='truncate max-w-full'>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      <div className='fixed bottom-20 right-4 z-30 md:bottom-6 md:right-6 flex flex-col gap-2'>
        {/* FAB de WhatsApp — solo para clientes en rutas tenant */}
        {!isAdmin && location.startsWith('/b/') && <WhatsAppFab />}

        {/* FAB de ubicación — disponible en la página pública tenant */}
        {location.startsWith('/b/') && <GoogleMapsFab />}
      </div>
    </div>
  )
}
