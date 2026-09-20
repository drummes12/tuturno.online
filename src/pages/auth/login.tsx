import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'wouter'
import { signInWithEmail } from '@/services/auth'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Alert } from '@/components/common/alert'
import { AuthShell } from '@/components/auth/auth-shell'
import { MailIcon, ArrowLeftIcon } from '@/components/common/icon'

export function LoginPage() {
  const [, navigate] = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirect =
    new URLSearchParams(window.location.search).get('next') ?? '/'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signInWithEmail(email, password)
    } catch {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }

    setLoading(false)
    navigate(redirect)
  }

  return (
    <AuthShell>
      <div className='w-full animate-fade-up'>
        <h1 className='text-2xl font-bold text-(--color-text) mb-1 tracking-tight'>
          Iniciar sesión
        </h1>
        <p className='text-sm text-(--color-text-muted) mb-6'>
          Ingresa para gestionar tus reservas.
        </p>

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div data-tour='login-email'>
            <Input
              label='Email'
              type='email'
              name='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='tu@email.com'
              required
              autoComplete='email'
              autoFocus
              icon={<MailIcon size={18} />}
            />
          </div>
          <div data-tour='login-password'>
            <Input
              label='Contraseña'
              type='password'
              name='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='••••••••'
              required
              autoComplete='current-password'
            />
          </div>

          {error && <Alert variant='error'>{error}</Alert>}

          <div data-tour='login-submit'>
            <Button
              type='submit'
              loading={loading}
              size='lg'
              className='w-full'
            >
              Ingresar
            </Button>
          </div>
        </form>

        <div className='mt-6 flex flex-col gap-2.5 text-sm text-center'>
          <Link
            href='/recuperar-password'
            className='text-(--color-text-muted) hover:text-(--color-text) transition-colors'
          >
            ¿Olvidaste tu contraseña?
          </Link>
          <p className='text-(--color-text-muted)' data-tour='register-link'>
            ¿No tienes cuenta?{' '}
            <Link
              href='/registro'
              className='text-(--color-primary) font-medium hover:underline'
            >
              Regístrate
            </Link>
          </p>
        </div>

        <Link
          href='/'
          className='flex items-center justify-center gap-1.5 mt-6 text-[11px] font-semibold uppercase tracking-[0.15em] text-(--color-text-muted) hover:text-(--color-text) transition-colors'
        >
          <ArrowLeftIcon size={14} />
          Volver al inicio
        </Link>
      </div>
    </AuthShell>
  )
}
