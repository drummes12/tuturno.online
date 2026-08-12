import type { ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuthStore } from '@/stores/auth'

interface NavItem {
  label: string
  href: string
  adminOnly?: boolean
}

const clientNav: NavItem[] = [
  { label: 'Disponibilidad', href: '/' },
  { label: 'Mis reservas', href: '/mis-reservas' }
]

const adminNav: NavItem[] = [
  { label: 'Operación', href: '/admin' },
  { label: 'Reservas', href: '/admin/reservas' },
  { label: 'Canchas', href: '/admin/canchas' },
  { label: 'Horarios', href: '/admin/horarios' },
  { label: 'Configuración', href: '/admin/configuracion' }
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuthStore()
  const [location] = useLocation()

  const nav = isAdmin ? [...adminNav, ...clientNav] : clientNav

  return (
    <div className='min-h-[100dvh] flex flex-col bg-[var(--color-surface)]'>
      {/* Top bar — compact, mobile-first */}
      <header className='sticky top-0 z-40 bg-[var(--color-pitch-800)] text-white border-b border-[var(--color-pitch-900)]'>
        <div className='mx-auto max-w-5xl px-4 h-14 flex items-center justify-between'>
          <Link
            href='/'
            className='flex items-center gap-2 font-semibold text-base'
          >
            <span className='text-[var(--color-flood-400)]'>●</span>
            Reservas
          </Link>
          {user ? (
            <button
              onClick={() => signOut()}
              className='text-sm text-[var(--color-chalk-dim)] hover:text-white transition-colors touch-target px-2'
            >
              Salir
            </button>
          ) : (
            <Link
              href='/login'
              className='text-sm text-[var(--color-chalk-dim)] hover:text-white transition-colors touch-target px-2'
            >
              Ingresar
            </Link>
          )}
        </div>
      </header>

      {/* Desktop nav — horizontal, below header */}
      {user && (
        <nav className='hidden md:block border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]'>
          <div className='mx-auto max-w-5xl px-4 flex items-center gap-1'>
            {nav.map((item) => {
              const active =
                location === item.href ||
                (item.href !== '/' && location.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      {/* Content */}
      <main className='flex-1 mx-auto w-full max-w-5xl px-4 py-4 pb-24 md:pb-8'>
        {children}
      </main>

      {/* Bottom nav — mobile-first, thumb zone */}
      {user && (
        <nav className='fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)] md:hidden'>
          <div className='flex items-center justify-around px-2 py-1 pb-[env(safe-area-inset-bottom)]'>
            {nav.map((item) => {
              const active =
                location === item.href ||
                (item.href !== '/' && location.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium rounded-lg touch-target transition-colors ${
                    active
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[var(--color-primary)]' : 'bg-transparent'}`}
                  />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
