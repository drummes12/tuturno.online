import { useState, type FormEvent } from 'react'
import { Link } from 'wouter'
import { resetPassword } from '@/services/auth'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Card } from '@/components/common/card'

export function RecoverPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await resetPassword(email)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al enviar el enlace.'
      )
      setLoading(false)
      return
    }

    setLoading(false)
    setSent(true)
  }

  return (
    <div className='flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-8'>
      <Card elevated className='w-full max-w-md p-6 md:p-8'>
        {sent ? (
          <>
            <h1 className='text-xl font-bold mb-2'>Revisa tu correo</h1>
            <p className='text-sm text-(--color-text-muted) mb-6'>
              Te enviamos un enlace para restablecer tu contraseña a{' '}
              <strong>{email}</strong>.
            </p>
            <Link href='/login'>
              <Button variant='secondary' className='w-full'>
                Volver a iniciar sesión
              </Button>
            </Link>
          </>
        ) : (
          <>
            <h1 className='text-2xl font-bold mb-1'>Recuperar contraseña</h1>
            <p className='text-sm text-(--color-text-muted) mb-6'>
              Te enviaremos un enlace para crear una nueva contraseña.
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
              />
              {error && (
                <p className='text-sm text-(--color-danger) bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
                  {error}
                </p>
              )}
              <Button
                type='submit'
                loading={loading}
                size='lg'
                className='w-full'
              >
                Enviar enlace
              </Button>
            </form>
            <p className='mt-6 text-sm text-center text-(--color-text-muted)'>
              <Link
                href='/login'
                className='text-(--color-primary) font-medium hover:underline'
              >
                Volver a iniciar sesión
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
