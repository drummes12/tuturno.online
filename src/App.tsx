import { Route, Switch, Redirect } from 'wouter'
import { useSession } from '@/hooks/use-session'
import { AppLayout } from '@/components/layout/app-layout'
import { Spinner } from '@/components/common/spinner'
import { useAuthStore } from '@/stores/auth'

// Auth pages
import { LoginPage } from '@/pages/auth/login'
import { RegisterPage } from '@/pages/auth/register'
import { RecoverPasswordPage } from '@/pages/auth/recover-password'

// Client pages
import { AvailabilityPage } from '@/pages/client/availability'
import { ReservePage } from '@/pages/client/reserve'
import { MyReservationsPage } from '@/pages/client/my-reservations'

// Admin pages
import { AdminDashboardPage } from '@/pages/admin/dashboard'
import { AdminReservationsPage } from '@/pages/admin/reservations'
import { AdminCourtsPage } from '@/pages/admin/courts'
import { AdminHoursPage } from '@/pages/admin/hours'
import { AdminConfigPage } from '@/pages/admin/config'
import { AdminExceptionsPage } from '@/pages/admin/exceptions'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) {
    return (
      <Redirect
        to={`/login?next=${encodeURIComponent(window.location.pathname)}`}
      />
    )
  }
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuthStore()
  if (!user) {
    return (
      <Redirect
        to={`/login?next=${encodeURIComponent(window.location.pathname)}`}
      />
    )
  }
  if (!isAdmin) {
    return <Redirect to='/' />
  }
  return <>{children}</>
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

        {/* Client */}
        <Route path='/' component={AvailabilityPage} />
        <Route path='/reservar'>
          <ProtectedRoute>
            <ReservePage />
          </ProtectedRoute>
        </Route>
        <Route path='/mis-reservas'>
          <ProtectedRoute>
            <MyReservationsPage />
          </ProtectedRoute>
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
        <Route path='/admin/canchas'>
          <AdminRoute>
            <AdminCourtsPage />
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
