import { Route, Switch, Redirect } from 'wouter'
import { lazy, Suspense, useEffect } from 'react'
import { useSession } from '@/hooks/use-session'
import { useConnectivityStore } from '@/hooks/use-connectivity'
import { AppLayout } from '@/components/layout/app-layout'
import { RouteErrorBoundary } from '@/components/common/route-error-boundary'
import { ClockLoader } from '@/components/common/spinner'
import { useAuthStore } from '@/stores/auth'

// Auth pages
import { LoginPage } from '@/pages/auth/login'
import { RegisterPage } from '@/pages/auth/register'
import { RecoverPasswordPage } from '@/pages/auth/recover-password'

// Landing
import { LandingPage } from '@/pages/landing'

// Client pages
import { AvailabilityPage } from '@/pages/client/availability'
import { ReservePage } from '@/pages/client/reserve'
import { MyReservationsPage } from '@/pages/client/my-reservations'
import { PrivacyPreferencesPage } from '@/pages/client/privacy-preferences'
import { NotificationsPage } from '@/pages/client/notifications'

// Admin pages — lazy: solo los miembros del negocio las descargan
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/dashboard').then((m) => ({
    default: m.AdminDashboardPage
  }))
)
const AdminReservationsPage = lazy(() =>
  import('@/pages/admin/reservations').then((m) => ({
    default: m.AdminReservationsPage
  }))
)
const AdminResourcesPage = lazy(() =>
  import('@/pages/admin/resources').then((m) => ({
    default: m.AdminResourcesPage
  }))
)
const AdminBusinessHubPage = lazy(() =>
  import('@/pages/admin/business-hub').then((m) => ({
    default: m.AdminBusinessHubPage
  }))
)
const AdminHoursPage = lazy(() =>
  import('@/pages/admin/hours').then((m) => ({ default: m.AdminHoursPage }))
)
const AdminConfigPage = lazy(() =>
  import('@/pages/admin/config').then((m) => ({ default: m.AdminConfigPage }))
)
const AdminExceptionsPage = lazy(() =>
  import('@/pages/admin/exceptions').then((m) => ({
    default: m.AdminExceptionsPage
  }))
)
const AdminTeamPage = lazy(() =>
  import('@/pages/admin/team').then((m) => ({ default: m.AdminTeamPage }))
)

// Onboarding y plataforma — lazy: flujos poco frecuentes
const CreateBusinessPage = lazy(() =>
  import('@/pages/business/create-business').then((m) => ({
    default: m.CreateBusinessPage
  }))
)
const PlatformDashboardPage = lazy(() =>
  import('@/pages/platform/dashboard').then((m) => ({
    default: m.PlatformDashboardPage
  }))
)
import { MfaGate } from '@/components/platform/mfa-gate'

// Redirect
import { WhatsAppRedirectPage } from '@/pages/whatsapp-redirect'

// Páginas legales
import { PrivacyPage } from '@/pages/legal/privacy'
import { TermsPage } from '@/pages/legal/terms'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) {
    const fullPath = window.location.pathname + window.location.search
    return <Redirect to={`/login?next=${encodeURIComponent(fullPath)}`} />
  }
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuthStore()
  if (!user) {
    const fullPath = window.location.pathname + window.location.search
    return <Redirect to={`/login?next=${encodeURIComponent(fullPath)}`} />
  }
  if (!isAdmin) {
    return <Redirect to='/' />
  }
  return <>{children}</>
}

/**
 * Panel de operador de la plataforma.
 * El guard es cosmético: los RPCs revalidan operador + MFA en el servidor.
 */
function PlatformRoute({ children }: { children: React.ReactNode }) {
  const { user, isPlatformAdmin } = useAuthStore()
  if (!user) {
    const fullPath = window.location.pathname + window.location.search
    return <Redirect to={`/login?next=${encodeURIComponent(fullPath)}`} />
  }
  if (!isPlatformAdmin) {
    return <Redirect to='/' />
  }
  return <MfaGate>{children}</MfaGate>
}

/**
 * Rutas para invitados (no autenticados).
 * Si el usuario ya tiene sesión, lo redirige a la página de destino
 * (parámetro `next`) o a la home por defecto.
 * /recuperar-password NO usa este guard porque el flow de recovery
 * crea una sesión temporal que necesita acceder a la página.
 */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (user) {
    const next = new URLSearchParams(window.location.search).get('next')
    return <Redirect to={next ?? '/'} />
  }
  return <>{children}</>
}

export default function App() {
  const { loading } = useSession()
  const { user, isAdmin, isPlatformAdmin } = useAuthStore()
  const status = useConnectivityStore((s) => s.status)

  // Precarga en segundo plano de los chunks lazy pertinentes al rol:
  // el service worker cachea /assets/*.js al primer fetch, así las rutas
  // navegables existen aunque después se corte la red. Solo con sesión
  // y online; los fallos se ignoran (el import perezoso reintenta solo).
  useEffect(() => {
    if (loading || !user || status !== 'online') return
    const timer = setTimeout(() => {
      const warm = (p: Promise<unknown>) => void p.catch(() => {})
      warm(import('@/pages/business/create-business'))
      if (isAdmin) {
        warm(import('@/pages/admin/dashboard'))
        warm(import('@/pages/admin/reservations'))
        warm(import('@/pages/admin/resources'))
        warm(import('@/pages/admin/business-hub'))
        warm(import('@/pages/admin/hours'))
        warm(import('@/pages/admin/config'))
        warm(import('@/pages/admin/exceptions'))
        warm(import('@/pages/admin/team'))
      }
      if (isPlatformAdmin) warm(import('@/pages/platform/dashboard'))
    }, 2500)
    return () => clearTimeout(timer)
  }, [loading, user, isAdmin, isPlatformAdmin, status])

  if (loading) {
    return (
      <div className='min-h-dvh flex items-center justify-center'>
        <ClockLoader />
      </div>
    )
  }

  return (
    <AppLayout>
      {/* Boundary de rutas lazy: un chunk que no descarga (offline,
          deploy nuevo con assets viejos) mostraba un error crudo de
          React — ahora cae en un fallback con reintento. */}
      <Suspense
        fallback={
          <div className='min-h-dvh flex items-center justify-center'>
            <ClockLoader />
          </div>
        }
      >
        <RouteErrorBoundary>
          <Switch>
            {/* Landing */}
            <Route path='/' component={LandingPage} />

            {/* Páginas legales — públicas */}
            <Route path='/privacidad' component={PrivacyPage} />
            <Route path='/terminos' component={TermsPage} />

            {/* Redirect a WhatsApp — los correos usan este enlace para
            evitar links a wa.me que no matchean el dominio de envío */}
            <Route path='/wa' component={WhatsAppRedirectPage} />

            {/* Auth — solo accesibles sin sesión */}
            <Route path='/login'>
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            </Route>
            <Route path='/registro'>
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            </Route>
            {/* /recuperar-password es accesible con y sin sesión (recovery flow) */}
            <Route path='/recuperar-password' component={RecoverPasswordPage} />

            {/* Mis reservas globales del usuario autenticado */}
            <Route path='/mis-reservas'>
              <ProtectedRoute>
                <MyReservationsPage />
              </ProtectedRoute>
            </Route>

            {/* Public tenant routes */}
            <Route path='/b/:slug'>
              {(params) => <AvailabilityPage slug={params.slug} />}
            </Route>
            <Route path='/b/:slug/reservar'>
              {(params) => <ReservePage slug={params.slug} />}
            </Route>
            <Route path='/b/:slug/mis-reservas'>
              {(params) => (
                <ProtectedRoute>
                  <MyReservationsPage slug={params.slug} />
                </ProtectedRoute>
              )}
            </Route>

            {/* Onboarding de negocios */}
            <Route path='/crear-negocio'>
              <ProtectedRoute>
                <CreateBusinessPage />
              </ProtectedRoute>
            </Route>

            {/* Preferencias de privacidad del cliente */}
            <Route path='/preferencias'>
              <ProtectedRoute>
                <PrivacyPreferencesPage />
              </ProtectedRoute>
            </Route>

            {/* Notificaciones del dispositivo */}
            <Route path='/notificaciones'>
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            </Route>

            {/* Panel de plataforma (operador) */}
            <Route path='/plataforma'>
              <PlatformRoute>
                <PlatformDashboardPage />
              </PlatformRoute>
            </Route>

            {/* Admin */}
            <Route path='/admin'>
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            </Route>
            <Route path='/admin/reservas'>
              <AdminRoute>
                <AdminReservationsPage />
              </AdminRoute>
            </Route>
            <Route path='/admin/recursos'>
              <AdminRoute>
                <AdminResourcesPage />
              </AdminRoute>
            </Route>
            <Route path='/admin/negocio'>
              <AdminRoute>
                <AdminBusinessHubPage />
              </AdminRoute>
            </Route>
            <Route path='/admin/horarios'>
              <AdminRoute>
                <AdminHoursPage />
              </AdminRoute>
            </Route>
            <Route path='/admin/configuracion'>
              <AdminRoute>
                <AdminConfigPage />
              </AdminRoute>
            </Route>
            <Route path='/admin/excepciones'>
              <AdminRoute>
                <AdminExceptionsPage />
              </AdminRoute>
            </Route>
            <Route path='/admin/equipo'>
              <AdminRoute>
                <AdminTeamPage />
              </AdminRoute>
            </Route>

            {/* Legacy redirects — old single-tenant routes */}
            <Route path='/reservar'>
              <Redirect to='/' />
            </Route>

            {/* 404 */}
            <Route>
              <div className='text-center py-12'>
                <p className='text-text-muted'>Página no encontrada.</p>
              </div>
            </Route>
          </Switch>
        </RouteErrorBoundary>
      </Suspense>
    </AppLayout>
  )
}
