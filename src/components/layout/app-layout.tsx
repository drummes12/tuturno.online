import type { ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import {
  CalendarIcon,
  LayoutIcon,
  ListIcon,
  StoreIcon,
  SettingsIcon,
  LogInIcon,
  BellIcon,
  CheckIcon,
  XIcon,
  HelpIcon
} from '@/components/common/icon'
import { WhatsAppFab } from '@/components/common/whatsapp-fab'
import { PwaInstallPrompt } from '@/components/common/pwa-install-prompt'
import { PwaNotificationPrompt } from '@/components/common/pwa-notification-prompt'
import { PwaUpdatePrompt } from '@/components/common/pwa-update-prompt'
import { GoogleMapsFab } from '@/components/common/google-maps-fab'
import {
  BusinessSelector,
  NewReservationButton
} from '@/components/common/business-selector'
import { HeaderMenu } from '@/components/common/header-menu'
import { NotificationCenter } from '@/components/common/notification-center'
import { useClientTutorial } from '@/hooks/use-client-tutorial'
import { useAdminTutorial } from '@/hooks/use-admin-tutorial'
import { extractSlugFromPath } from '@/lib/slug'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import type { NotificationPermissionState } from '@/lib/push'

function NotificationStatusIcon({
  permission,
  registered
}: {
  permission: NotificationPermissionState
  registered: boolean
}) {
  const active = permission === 'granted' && registered
  const blocked = permission === 'denied'
  const badgeClass = active
    ? 'bg-success text-white'
    : blocked
      ? 'bg-danger text-white'
      : 'bg-yellow-500 text-white'

  return (
    <span className='relative inline-flex'>
      <BellIcon size={16} />
      <span
        className={`absolute -right-2 -bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ${badgeClass}`}
        aria-hidden='true'
      >
        {active ? (
          <CheckIcon size={9} strokeWidth={2.5} />
        ) : blocked ? (
          <XIcon size={9} strokeWidth={2.5} />
        ) : (
          <span className='text-[9px] font-bold leading-none'>?</span>
        )}
      </span>
    </span>
  )
}

interface NavItem {
  label: string
  href: string
  adminOnly?: boolean
  icon: ReactNode
}

// Rutas de configuración ocasional agrupadas bajo /admin/negocio, para
// no sobrecargar el bottom nav en mobile (máx. 4-5 destinos recomendado).
const BUSINESS_HUB_ROUTES = [
  '/admin/negocio',
  '/admin/horarios',
  '/admin/excepciones',
  '/admin/equipo',
  '/admin/configuracion'
]

const adminNav: NavItem[] = [
  { label: 'Operación', href: '/admin', icon: <LayoutIcon size={22} /> },
  { label: 'Reservas', href: '/admin/reservas', icon: <ListIcon size={22} /> },
  { label: 'Recursos', href: '/admin/recursos', icon: <StoreIcon size={22} /> },
  {
    label: 'Negocio',
    href: '/admin/negocio',
    icon: <SettingsIcon size={22} />
  }
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, isPlatformAdmin, memberships, signOut } =
    useAuthStore()
  const [location] = useLocation()
  const clientTutorial = useClientTutorial()
  const adminTutorial = useAdminTutorial()
  const pushNotificationState = usePushNotifications(user?.id ?? null)

  const startTour = isAdmin ? adminTutorial.startTour : clientTutorial.startTour
  const isStarting = isAdmin
    ? adminTutorial.isStarting
    : clientTutorial.isStarting

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
    : user
      ? [
          {
            label: 'Mis reservas',
            href: '/mis-reservas',
            icon: <ListIcon size={22} />
          }
        ]
      : []

  const nav = isAdmin ? adminNav : clientNav
  const hasBottomNav = Boolean(user) && nav.length > 0

  // "Negocio" queda activo también en sus sub-rutas agrupadas (horarios,
  // cierres, equipo, configuración), no solo en /admin/negocio exacto.
  function isNavItemActive(href: string): boolean {
    if (href === '/admin/negocio') {
      return BUSINESS_HUB_ROUTES.includes(location)
    }
    return location === href
  }

  // El tutorial del cliente aplica a visitantes/autenticados sin rol admin
  // en rutas tenant. El tutorial del admin aplica en cualquier ruta /admin.
  const showTutorialButton =
    (isAdmin && location.startsWith('/admin')) || (!isAdmin && !!tenantBase)

  return (
    <div
      className={`min-h-dvh flex flex-col bg-surface overflow-clip ${hasBottomNav ? 'has-bottom-nav' : ''}`}
    >
      {/* Top bar — pitch green with depth */}
      <header className='sticky top-0 z-40 bg-pitch-800 text-white border-b border-pitch-900 shadow-[0_4px_20px_rgba(4,33,15,0.25)]'>
        <div className='mx-auto flex h-14 min-w-0 w-full max-w-5xl items-center justify-between gap-2 px-4'>
          <Link
            href='/'
            className='flex min-w-0 shrink items-center gap-2 font-bold text-base tracking-tight'
          >
            <img
              src='/logo-mark.svg'
              alt='TuTurno'
              className='w-8 h-8 rounded-lg'
            />
            <span>TuTurno</span>
          </Link>
          <div className='flex min-w-0 shrink items-center justify-end gap-1 sm:gap-2'>
            {user && showTutorialButton && (
              <button
                type='button'
                onClick={startTour}
                disabled={isStarting}
                data-tour='tutorial-trigger'
                className='inline-flex min-w-0 max-w-24 md:max-w-none items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-sm font-medium text-white/85 shadow-sm transition-[background-color,border-color,transform,color] hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flood-400 disabled:cursor-wait disabled:opacity-80 touch-target'
                aria-label='Iniciar guía del tutorial'
                aria-busy={isStarting}
                title='Guía interactiva'
              >
                <HelpIcon size={16} className='shrink-0' />
                <span className='hidden min-w-0 max-w-12 truncate sm:inline md:max-w-none'>
                  {isStarting ? 'Abriendo…' : 'Guía'}
                </span>
              </button>
            )}
            {isAdmin && <NewReservationButton />}
            {user && (
              <NotificationCenter
                userId={user.id}
                settingsHref={`/notificaciones?next=${encodeURIComponent(location)}`}
              />
            )}
            {user ? (
              <HeaderMenu
                isAdmin={isAdmin}
                isPlatformAdmin={isPlatformAdmin}
                businessSelector={
                  isAdmin && memberships.length > 0 ? (
                    <BusinessSelector inMenu />
                  ) : undefined
                }
                nextPath={location}
                notificationIcon={
                  <NotificationStatusIcon
                    permission={pushNotificationState.permission}
                    registered={pushNotificationState.registered}
                  />
                }
                notificationLabel={
                  pushNotificationState.permission === 'granted' &&
                  pushNotificationState.registered
                    ? 'Notificaciones activas'
                    : pushNotificationState.permission === 'denied'
                      ? 'Notificaciones bloqueadas'
                      : 'Configurar notificaciones'
                }
                onSignOut={signOut}
              />
            ) : (
              <Link
                href='/login'
                data-tour='auth-entry'
                className='flex min-w-0 max-w-24 items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-chalk-dim transition-colors hover:text-white touch-target'
              >
                <LogInIcon size={16} className='shrink-0' />
                <span className='min-w-0 truncate'>Ingresar</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Desktop nav — horizontal, below header */}
      {user && nav.length > 0 && (
        <nav
          aria-label={
            isAdmin ? 'Navegación de administración' : 'Navegación del negocio'
          }
          className='hidden md:block border-b overflow-x-auto border-border bg-surface-elevated'
        >
          <div className='mx-auto max-w-5xl px-4 flex items-center gap-1'>
            {nav.map((item) => {
              const active = isNavItemActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  data-tour={
                    item.href === '/mis-reservas'
                      ? 'client-nav-reservations'
                      : item.href === '/admin/recursos'
                        ? 'admin-nav-resources'
                        : item.href === '/admin/negocio'
                          ? 'admin-nav-business'
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
      <main className='flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-6'>
        {children}
      </main>

      {/* Bottom nav — mobile, thumb zone, with icons */}
      {user && nav.length > 0 && (
        <nav
          aria-label={
            isAdmin ? 'Navegación de administración' : 'Navegación del negocio'
          }
          className='fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/95 backdrop-blur-lg border-t border-border md:hidden'
        >
          <div className='scrollbar-none flex snap-x snap-mandatory items-center gap-1 overflow-x-auto px-1 py-1.5 pb-[max(env(safe-area-inset-bottom),0.375rem)]'>
            {nav.map((item) => {
              const active = isNavItemActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  data-tour={
                    item.href === '/admin/negocio'
                      ? 'admin-nav-business'
                      : undefined
                  }
                  className={`flex-1 flex min-w-21 shrink-0 snap-start flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-lg touch-target transition-colors ${
                    active ? 'text-primary' : 'text-text-muted'
                  }`}
                >
                  <span className={active ? 'text-primary' : ''}>
                    {item.icon}
                  </span>
                  <span className='max-w-full truncate'>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      <div className='fixed bottom-[calc(var(--bottom-nav-height)+1rem)] right-4 z-30 md:bottom-6 md:right-6 flex flex-col gap-2'>
        {/* FAB de WhatsApp — solo para clientes en rutas tenant */}
        {!isAdmin && location.startsWith('/b/') && <WhatsAppFab />}

        {/* FAB de ubicación — disponible en la página pública tenant */}
        {location.startsWith('/b/') && <GoogleMapsFab />}
      </div>

      <div className='fixed inset-x-0 bottom-4 z-50 flex flex-col gap-2 px-4 sm:inset-x-auto sm:right-4 sm:w-[min(100%-2rem,28rem)] sm:px-0'>
        <PwaInstallPrompt />
        <PwaNotificationPrompt state={pushNotificationState} />
        <PwaUpdatePrompt />
      </div>

      {/* Footer — enlaces legales públicos */}
      <footer className='border-t border-border bg-surface-elevated mt-auto pb-(--bottom-nav-height)'>
        <div className='mx-auto max-w-5xl px-4 py-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-(--color-text-muted)'>
          <span>© {new Date().getFullYear()} TuTurno</span>
          <Link
            href='/privacidad'
            className='hover:text-(--color-text) transition-colors'
          >
            Política de datos
          </Link>
          <Link
            href='/terminos'
            className='hover:text-(--color-text) transition-colors'
          >
            Términos
          </Link>
        </div>
      </footer>
    </div>
  )
}
