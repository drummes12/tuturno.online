import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import {
  CalendarIcon,
  CalendarPlusIcon,
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
import { useTheme } from '@/hooks/use-theme'
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
      : 'bg-warning text-white'

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
  { label: 'Operación', href: '/admin', icon: <LayoutIcon size={18} /> },
  { label: 'Reservas', href: '/admin/reservas', icon: <ListIcon size={18} /> },
  { label: 'Recursos', href: '/admin/recursos', icon: <StoreIcon size={18} /> },
  {
    label: 'Negocio',
    href: '/admin/negocio',
    icon: <SettingsIcon size={18} />
  }
]

export function AppLayout({ children }: { children: ReactNode }) {
  const {
    user,
    isAdmin,
    isPlatformAdmin,
    memberships,
    activeBusinessId,
    signOut
  } = useAuthStore()
  const [location] = useLocation()
  const clientTutorial = useClientTutorial()
  const adminTutorial = useAdminTutorial()
  const { dark, toggle: toggleTheme } = useTheme()
  const pushNotificationState = usePushNotifications(user?.id ?? null)

  const startTour = isAdmin ? adminTutorial.startTour : clientTutorial.startTour
  const isStarting = isAdmin
    ? adminTutorial.isStarting
    : clientTutorial.isStarting

  // Reset de scroll al cambiar de ruta — 'instant' para que el
  // scroll-behavior: smooth global no convierta la navegación en
  // un desplazamiento animado desde la posición anterior.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location])

  // Build tenant-aware client nav
  const slug = extractSlugFromPath(location)
  const tenantBase = slug ? `/b/${slug}` : null
  const clientNav: NavItem[] = tenantBase
    ? [
        {
          label: 'Disponibilidad',
          href: tenantBase,
          icon: <CalendarIcon size={18} />
        },
        {
          label: 'Mis reservas',
          href: `${tenantBase}/mis-reservas`,
          icon: <ListIcon size={18} />
        }
      ]
    : user
      ? [
          {
            label: 'Mis reservas',
            href: '/mis-reservas',
            icon: <ListIcon size={18} />
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
    (isAdmin && location.startsWith('/admin')) ||
    (!isAdmin && (Boolean(tenantBase) || location === '/mis-reservas'))

  return (
    <div
      className={`min-h-dvh flex flex-col bg-surface overflow-clip ${hasBottomNav ? 'has-bottom-nav' : ''}`}
    >
      {/* Top bar — píldora flotante. En la landing arranca embebida a
          ancho completo sobre el hero y se contrae a píldora al scroll
          (scroll-driven CSS; sin soporte queda píldora siempre). */}
      <header
        className={`sticky top-0 z-40 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-4 ${location === '/' && !user ? 'morph-header' : ''}`}
      >
        {/* Barra visual: hace el morph ancho-completo → píldora.
            El contenido siempre vive en la columna max-w-5xl, así al
            zoom-out los controles no se van a los bordes de pantalla. */}
        <div
          className={`mx-auto w-full max-w-5xl rounded-2xl border border-white/12 bg-pitch-900 sm:bg-pitch-900/90 shadow-(--shadow-lg) backdrop-blur-sm dark:border-white/10 dark:bg-graphite-900/80 ${location === '/' && !user ? 'morph-header-inner' : ''}`}
        >
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
                  className='hidden sm:inline-flex min-w-0 max-w-24 md:max-w-none items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-sm font-medium text-white/85 shadow-sm transition-[background-color,border-color,transform,color] hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flood-400 disabled:cursor-wait disabled:opacity-80 touch-target'
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
                    isAdmin && memberships.length > 0
                      ? (close) => <BusinessSelector inMenu onSelect={close} />
                      : undefined
                  }
                  mobileExtras={(close) => (
                    <>
                      {isAdmin &&
                        (() => {
                          const active =
                            memberships.find(
                              (m) => m.businessId === activeBusinessId
                            ) ?? memberships[0]
                          if (!active) return null
                          return (
                            <Link
                              href={`/b/${active.slug}`}
                              onClick={close}
                              className='flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--color-text) transition-colors hover:bg-surface-inset touch-target'
                            >
                              <CalendarPlusIcon
                                size={17}
                                className='shrink-0 text-text-muted'
                              />
                              <span>Nueva reserva</span>
                            </Link>
                          )
                        })()}
                      {showTutorialButton && (
                        <button
                          type='button'
                          onClick={() => {
                            close()
                            startTour()
                          }}
                          disabled={isStarting}
                          className='flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-(--color-text) transition-colors hover:bg-surface-inset disabled:opacity-60 touch-target'
                        >
                          <HelpIcon
                            size={17}
                            className='shrink-0 text-text-muted'
                          />
                          <span>
                            {isStarting ? 'Abriendo…' : 'Guía interactiva'}
                          </span>
                        </button>
                      )}
                    </>
                  )}
                  nextPath={location}
                  userEmail={user.email}
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
                  themeToggle={{ dark, onToggle: toggleTheme }}
                />
              ) : (
                <Link
                  href='/login'
                  data-tour='auth-entry'
                  className='flex min-w-0 max-w-28 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 shadow-sm transition-[background-color,border-color,color] hover:border-white/35 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flood-400 touch-target'
                >
                  <LogInIcon size={16} className='shrink-0' />
                  <span className='min-w-0 truncate'>Ingresar</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Desktop nav — horizontal, below header */}
      {user && nav.length > 0 && (
        <nav
          aria-label={
            isAdmin ? 'Navegación de administración' : 'Navegación del negocio'
          }
          className='hidden md:block'
        >
          <div className='mx-auto flex max-w-5xl items-center justify-center gap-1.5 px-4 py-4 border-b border-border'>
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
                  className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                    active
                      ? 'bg-primary text-white'
                      : 'text-text-muted hover:bg-surface-inset hover:text-text'
                  }`}
                >
                  <span className={active ? '' : 'opacity-70'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      {/* Content */}
      <main className='flex-1 flex flex-col mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8'>
        {children}
      </main>

      {/* Bottom nav — mobile, píldora flotante en zona del pulgar */}
      {user && nav.length > 0 && (
        <nav
          aria-label={
            isAdmin ? 'Navegación de administración' : 'Navegación del negocio'
          }
          className='fixed inset-x-0 bottom-0 z-40 px-4 sm:px-6 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:hidden'
        >
          <div className='mx-auto flex max-w-md items-center gap-1 rounded-2xl border border-border bg-surface-elevated/95 p-1.5 shadow-(--shadow-lg) backdrop-blur-lg'>
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
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors touch-target ${
                    active ? 'bg-primary text-white' : 'text-text-muted'
                  }`}
                >
                  {item.icon}
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
      <footer className='border-t border-border bg-surface-elevated mt-auto pb-[max(var(--bottom-nav-height),env(safe-area-inset-bottom))]'>
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
