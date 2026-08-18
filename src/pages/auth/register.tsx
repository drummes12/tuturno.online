import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'wouter'
import { signUpWithEmail } from '@/services/auth'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { PhoneInput } from '@/components/common/phone-input'
import { Card } from '@/components/common/card'
import { Alert } from '@/components/common/alert'
import {
  StoreIcon,
  MailIcon,
  UserIcon,
  ArrowLeftIcon
} from '@/components/common/icon'

export function RegisterPage() {
  const [, navigate] = useLocation()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (!acceptedTerms) {
      setError(
        'Debes aceptar los Términos y la Política de Datos para registrarte.'
      )
      return
    }

    setLoading(true)

    try {
      const { user, session } = await signUpWithEmail(
        email,
        password,
        fullName,
        phone
      )

      setLoading(false)

      if (user && !session) {
        setSuccess(true)
      } else if (session) {
        navigate('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className='flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-8'>
        <div className='w-full max-w-md animate-fade-up'>
          <Card elevated className='p-8 text-center'>
            <div className='flex flex-col items-center gap-4'>
              <div className='w-16 h-16 rounded-2xl bg-pitch-100 flex items-center justify-center text-pitch-700'>
                <MailIcon size={32} />
              </div>
              <div>
                <h1 className='text-xl font-bold mb-2 tracking-tight'>
                  Revisa tu correo
                </h1>
                <p className='text-sm text-(--color-text-muted) max-w-xs'>
                  Te enviamos un enlace de confirmación a{' '}
                  <strong>{email}</strong>. Haz clic en el enlace para activar
                  tu cuenta.
                </p>
              </div>
            </div>
            <Link href='/login' className='block mt-6'>
              <Button variant='secondary' className='w-full'>
                Volver a iniciar sesión
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-8'>
      <div className='w-full max-w-md animate-fade-up'>
        {/* Brand mark */}
        <div className='flex flex-col items-center gap-3 mb-8'>
          <div className='flex items-center justify-center w-14 h-14 rounded-2xl bg-pitch-800 text-flood-400 shadow-(--shadow-pitch)'>
            <StoreIcon size={28} strokeWidth={2.5} />
          </div>
        </div>

        <Card elevated className='p-6 md:p-8'>
          <h1 className='text-2xl font-bold mb-1 tracking-tight'>
            Crear cuenta
          </h1>
          <p className='text-sm text-(--color-text-muted) mb-6'>
            Regístrate para solicitar reservas.
          </p>

          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <Input
              label='Nombre completo'
              type='text'
              name='full_name'
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder='Juan Pérez'
              required
              autoComplete='name'
              autoFocus
              icon={<UserIcon size={18} />}
            />
            <PhoneInput
              label='Teléfono'
              value={phone}
              onChange={setPhone}
              required
              hint='Lo usará el negocio para contactarte. No se verifica automáticamente.'
            />
            <Input
              label='Email'
              type='email'
              name='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='tu@email.com'
              required
              autoComplete='email'
              icon={<MailIcon size={18} />}
            />
            <Input
              label='Contraseña'
              type='password'
              name='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Mínimo 6 caracteres'
              required
              autoComplete='new-password'
            />

            {/* Consentimiento obligatorio de Términos y Política */}
            <label className='flex items-start gap-3 text-sm text-(--color-text) cursor-pointer select-none'>
              <input
                type='checkbox'
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className='mt-0.5 h-4 w-4 rounded border-border text-(--color-primary) focus:ring-(--color-primary) cursor-pointer'
                required
              />
              <span className='leading-relaxed'>
                He leído y acepto los{' '}
                <Link
                  href='/terminos'
                  target='_blank'
                  className='text-(--color-primary) font-medium hover:underline'
                >
                  Términos
                </Link>{' '}
                y la{' '}
                <Link
                  href='/privacidad'
                  target='_blank'
                  className='text-(--color-primary) font-medium hover:underline'
                >
                  Política de Tratamiento de Datos Personales
                </Link>
                . Esta aceptación es necesaria para crear la cuenta y gestionar
                reservas.
              </span>
            </label>

            {error && <Alert variant='error'>{error}</Alert>}

            <Button
              type='submit'
              loading={loading}
              size='lg'
              className='w-full'
            >
              Crear cuenta
            </Button>
          </form>

          <p className='mt-6 text-sm text-center text-(--color-text-muted)'>
            ¿Ya tienes cuenta?{' '}
            <Link
              href='/login'
              className='text-(--color-primary) font-medium hover:underline'
            >
              Inicia sesión
            </Link>
          </p>
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
