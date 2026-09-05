import { Route, Switch, Redirect } from 'wouter'
import { useSession } from '@/hooks/use-session'
import { AppLayout } from '@/components/layout/app-layout'
import { Spinner } from '@/components/common/spinner'
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

// Admin pages
import { AdminDashboardPage } from '@/pages/admin/dashboard'
import { AdminReservationsPage } from '@/pages/admin/reservations'
import { AdminResourcesPage } from '@/pages/admin/resources'
import { AdminBusinessHubPage } from '@/pages/admin/business-hub'
import { AdminHoursPage } from '@/pages/admin/hours'
import { AdminConfigPage } from '@/pages/admin/config'
import { AdminExceptionsPage } from '@/pages/admin/exceptions'
import { AdminTeamPage } from '@/pages/admin/team'

// Onboarding y plataforma
import { CreateBusinessPage } from '@/pages/business/create-business'
import { PlatformDashboardPage } from '@/pages/platform/dashboard'
import { MfaGate } from '@/components/platform/mfa-gate'

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

  if (loading) {
    return (
      <div className='min-h-dvh flex items-center justify-center'>
        <Spinner size='lg' />
      </div>
    )
  }

  return (
    <AppLayout>
      <Switch>
        {/* Landing */}
        <Route path='/' component={LandingPage} />

        {/* Páginas legales — públicas */}
        <Route path='/privacidad' component={PrivacyPage} />
        <Route path='/terminos' component={TermsPage} />

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
        <Route path='/mis-reservas'>
          <Redirect to='/' />
        </Route>

        {/* 404 */}
        <Route>
          <div className='text-center py-12'>
            <p className='text-text-muted'>Página no encontrada.</p>
          </div>
        </Route>
      </Switch>
    </AppLayout>
  )
}
