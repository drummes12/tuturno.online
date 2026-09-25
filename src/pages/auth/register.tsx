import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'wouter'
import { signUpWithEmail } from '@/services/auth'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { PhoneInput } from '@/components/common/phone-input'
import { isValidPhoneNumber } from 'react-phone-number-input'
import { Card } from '@/components/common/card'
import { Alert } from '@/components/common/alert'
import { AuthShell } from '@/components/auth/auth-shell'
import { MailIcon, UserIcon, ArrowLeftIcon } from '@/components/common/icon'

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

    if (!isValidPhoneNumber(phone)) {
      setError('Ingresa un número de teléfono válido.')
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
      <div className='flex flex-1 items-center justify-center py-8'>
        <div className='w-full max-w-md animate-fade-up'>
          <Card elevated className='p-8 text-center'>
            <div className='flex flex-col items-center gap-4'>
              <div className='w-16 h-16 rounded-2xl bg-pitch-500/15 flex items-center justify-center text-pitch-700 dark:text-pitch-300'>
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
    <AuthShell>
      <div className='w-full animate-fade-up'>
        <h1 className='text-2xl font-bold mb-1 tracking-tight'>Crear cuenta</h1>
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
            hint='Los negocios lo usan para contactarte sobre tus reservas.'
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
              className='mt-0.5 h-4 w-4 rounded border-border accent-(--color-primary) cursor-pointer'
              required
            />
            <span className='leading-relaxed'>
              Confirmo que tengo 18 años o más, autorizo el tratamiento de mis
              datos para crear la cuenta y gestionar reservas, y acepto los{' '}
              <Link
                href='/terminos'
                target='_blank'
                className='text-(--color-primary) font-medium hover:underline'
              >
                Términos
                <span className='sr-only'>(se abre en otra pestaña)</span>
              </Link>{' '}
              y la{' '}
              <Link
                href='/privacidad'
                target='_blank'
                className='text-(--color-primary) font-medium hover:underline'
              >
                Política de Datos
                <span className='sr-only'>(se abre en otra pestaña)</span>
              </Link>
              . Esta aceptación es necesaria para crear la cuenta y gestionar
              reservas.
            </span>
          </label>

          {error && <Alert variant='error'>{error}</Alert>}

          <Button type='submit' loading={loading} size='lg' className='w-full'>
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
