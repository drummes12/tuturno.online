import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'wouter'
import { resetPassword, updatePassword, signOut } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Card } from '@/components/common/card'

export function RecoverPasswordPage() {
  const { user } = useAuthStore()
  const [, navigate] = useLocation()

  // Si hay sesión activa al llegar a esta página, viene del flow de recovery
  // (Supabase verificó el token y creó una sesión temporal).
  const isRecoveryFlow = !!user

  // Estado del formulario de solicitud (enviar email)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  // Estado del formulario de nueva contraseña
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  const [updated, setUpdated] = useState(false)

  async function handleRequestReset(e: FormEvent) {
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

  async function handleUpdatePassword(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setUpdating(true)

    try {
      await updatePassword(newPassword)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al actualizar la contraseña.'
      )
      setUpdating(false)
      return
    }

    setUpdating(false)
    setUpdated(true)

    // Cerrar la sesión temporal del recovery y redirigir al login
    setTimeout(async () => {
      await signOut()
      navigate('/login')
    }, 2000)
  }

  return (
    <div className='flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-8'>
      <Card elevated className='w-full max-w-md p-6 md:p-8'>
        {/* --- Flow de recovery: establecer nueva contraseña --- */}
        {isRecoveryFlow && !updated && (
          <>
            <h1 className='text-2xl font-bold mb-1'>Nueva contraseña</h1>
            <p className='text-sm text-(--color-text-muted) mb-6'>
              Establece una nueva contraseña para tu cuenta.
            </p>
            <form
              onSubmit={handleUpdatePassword}
              className='flex flex-col gap-4'
            >
              <Input
                label='Nueva contraseña'
                type='password'
                name='newPassword'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder='••••••••'
                required
                autoComplete='new-password'
                autoFocus
                minLength={6}
              />
              <Input
                label='Confirmar contraseña'
                type='password'
                name='confirmPassword'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder='••••••••'
                required
                autoComplete='new-password'
                minLength={6}
              />
              {error && (
                <p className='text-sm text-(--color-danger) bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
                  {error}
                </p>
              )}
              <Button
                type='submit'
                loading={updating}
                size='lg'
                className='w-full'
              >
                Guardar nueva contraseña
              </Button>
            </form>
          </>
        )}

        {/* --- Contraseña actualizada --- */}
        {isRecoveryFlow && updated && (
          <>
            <h1 className='text-xl font-bold mb-2'>Contraseña actualizada</h1>
            <p className='text-sm text-(--color-text-muted) mb-6'>
              Tu contraseña se actualizó correctamente. Te redirigiremos al
              inicio de sesión…
            </p>
            <Link href='/login'>
              <Button variant='secondary' className='w-full'>
                Ir a iniciar sesión
              </Button>
            </Link>
          </>
        )}

        {/* --- Flow normal: solicitar enlace de recuperación --- */}
        {!isRecoveryFlow && sent && (
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
        )}

        {!isRecoveryFlow && !sent && (
          <>
            <h1 className='text-2xl font-bold mb-1'>Recuperar contraseña</h1>
            <p className='text-sm text-(--color-text-muted) mb-6'>
              Te enviaremos un enlace para crear una nueva contraseña.
            </p>
            <form onSubmit={handleRequestReset} className='flex flex-col gap-4'>
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
