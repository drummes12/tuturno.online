import type { ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import {
  CalendarIcon,
  LayoutIcon,
  ListIcon,
  CourtIcon,
  ScheduleIcon,
  SettingsIcon,
  LogOutIcon,
  LogInIcon
} from '@/components/common/icon'

interface NavItem {
  label: string
  href: string
  adminOnly?: boolean
  icon: ReactNode
}

const clientNav: NavItem[] = [
  { label: 'Disponibilidad', href: '/', icon: <CalendarIcon size={22} /> },
  { label: 'Mis reservas', href: '/mis-reservas', icon: <ListIcon size={22} /> }
]

const adminNav: NavItem[] = [
  { label: 'Operación', href: '/admin', icon: <LayoutIcon size={22} /> },
  { label: 'Reservas', href: '/admin/reservas', icon: <ListIcon size={22} /> },
  { label: 'Canchas', href: '/admin/canchas', icon: <CourtIcon size={22} /> },
  {
    label: 'Horarios',
    href: '/admin/horarios',
    icon: <ScheduleIcon size={22} />
  },
  {
    label: 'Configuración',
    href: '/admin/configuracion',
    icon: <SettingsIcon size={22} />
  }
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuthStore()
  const [location] = useLocation()

  const nav = isAdmin ? [...adminNav, ...clientNav] : clientNav

  return (
    <div className='min-h-dvh flex flex-col bg-surface overflow-clip'>
      {/* Top bar — pitch green with depth */}
      <header className='sticky top-0 z-40 bg-pitch-800 text-white border-b border-pitch-900 shadow-[0_4px_20px_rgba(4,33,15,0.25)]'>
        <div className='mx-auto max-w-5xl px-4 h-14 flex items-center justify-between'>
          <Link
            href='/'
            className='flex items-center gap-2.5 font-semibold text-base tracking-tight'
          >
            <span className='flex items-center justify-center w-7 h-7 rounded-lg bg-flood-400 text-pitch-900'>
              <CourtIcon size={18} strokeWidth={2.5} />
            </span>
            <span>Reservas</span>
          </Link>
          {user ? (
            <button
              onClick={() => signOut()}
              className='flex items-center gap-1.5 text-sm text-chalk-dim hover:text-white transition-colors touch-target px-2 -mr-2 rounded-lg'
            >
              <LogOutIcon size={16} />
              <span className='hidden sm:inline'>Salir</span>
            </button>
          ) : (
            <Link
              href='/login'
              className='flex items-center gap-1.5 text-sm text-chalk-dim hover:text-white transition-colors touch-target px-2 -mr-2 rounded-lg'
            >
              <LogInIcon size={16} />
              <span>Ingresar</span>
            </Link>
          )}
        </div>
      </header>

      {/* Desktop nav — horizontal, below header */}
      {user && (
        <nav className='hidden md:block border-b overflow-x-auto border-border bg-surface-elevated'>
          <div className='mx-auto max-w-5xl px-4 flex items-center gap-1'>
            {nav.map((item) => {
              const active =
                location === item.href ||
                (item.href !== '/' && location.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ease-spring ${
                    active
                      ? 'border-primary text-primary'
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
      <main className='flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-28 md:pb-10'>
        {children}
      </main>

      {/* Bottom nav — mobile, thumb zone, with icons */}
      {user && (
        <nav className='fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/95 backdrop-blur-lg border-t border-border md:hidden'>
          <div className='flex items-center justify-around px-1 py-1.5 pb-[max(env(safe-area-inset-bottom),0.375rem)]'>
            {nav.map((item) => {
              const active =
                location === item.href ||
                (item.href !== '/' && location.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-lg touch-target transition-colors ${
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
    </div>
  )
}
