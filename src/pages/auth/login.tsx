import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'wouter'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Card } from '@/components/common/card'
import { Alert } from '@/components/common/alert'
import { CourtIcon, MailIcon, ArrowLeftIcon } from '@/components/common/icon'

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

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    })

    setLoading(false)

    if (authError) {
      setError('Email o contraseña incorrectos.')
      return
    }

    navigate(redirect)
  }

  return (
    <div className='flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-8'>
      <div className='w-full max-w-md animate-fade-up'>
        {/* Brand mark */}
        <div className='flex flex-col items-center gap-3 mb-8'>
          <div className='flex items-center justify-center w-14 h-14 rounded-2xl bg-pitch-800 text-flood-400 shadow-(--shadow-pitch)'>
            <CourtIcon size={28} strokeWidth={2.5} />
          </div>
        </div>

        <Card elevated className='p-6 md:p-8'>
          <h1 className='text-2xl font-bold text-(--color-text) mb-1 tracking-tight'>
            Iniciar sesión
          </h1>
          <p className='text-sm text-(--color-text-muted) mb-6'>
            Ingresa para gestionar tus reservas.
          </p>

          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
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

            {error && <Alert variant='error'>{error}</Alert>}

            <Button
              type='submit'
              loading={loading}
              size='lg'
              className='w-full'
            >
              Ingresar
            </Button>
          </form>

          <div className='mt-6 flex flex-col gap-2.5 text-sm text-center'>
            <Link
              href='/recuperar-password'
              className='text-(--color-text-muted) hover:text-(--color-text) transition-colors'
            >
              ¿Olvidaste tu contraseña?
            </Link>
            <p className='text-(--color-text-muted)'>
              ¿No tienes cuenta?{' '}
              <Link
                href='/registro'
                className='text-(--color-primary) font-medium hover:underline'
              >
                Regístrate
              </Link>
            </p>
          </div>
        </Card>

        <Link
          href='/'
          className='flex items-center justify-center gap-1.5 mt-6 text-sm text-(--color-text-muted) hover:text-(--color-text) transition-colors'
        >
          <ArrowLeftIcon size={16} />
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
