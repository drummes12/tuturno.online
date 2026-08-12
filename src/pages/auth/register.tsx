import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'wouter'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Card } from '@/components/common/card'

export function RegisterPage() {
  const [, navigate] = useLocation()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    if (data.user && !data.session) {
      setSuccess(true)
    } else if (data.session) {
      navigate('/')
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-8">
        <Card elevated className="w-full max-w-md p-6 md:p-8 text-center">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-xl font-bold mb-2">Revisa tu correo</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            Te enviamos un enlace de confirmación a <strong>{email}</strong>.
            Haz clic en el enlace para activar tu cuenta.
          </p>
          <Link href="/login">
            <Button variant="secondary" className="w-full">Volver a iniciar sesión</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-8">
      <Card elevated className="w-full max-w-md p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-1">Crear cuenta</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Regístrate para solicitar reservas.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nombre completo"
            type="text"
            name="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan Pérez"
            required
            autoComplete="name"
            autoFocus
          />
          <Input
            label="Teléfono"
            type="tel"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+57 300 123 4567"
            required
            autoComplete="tel"
            hint="Lo usará el negocio para contactarte. No se verifica automáticamente."
          />
          <Input
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            autoComplete="email"
          />
          <Input
            label="Contraseña"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            autoComplete="new-password"
          />

          {error && (
            <p className="text-sm text-[var(--color-danger)] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} size="lg" className="w-full">
            Crear cuenta
          </Button>
        </form>

        <p className="mt-6 text-sm text-center text-[var(--color-text-muted)]">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[var(--color-primary)] font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}
