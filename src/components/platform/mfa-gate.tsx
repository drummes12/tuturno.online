import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Alert } from '@/components/common/alert'
import { Spinner } from '@/components/common/spinner'
import { LockIcon } from '@/components/common/icon'

type GateState = 'loading' | 'ready' | 'challenge' | 'enroll'

type EnrollData = { factorId: string; qrCode: string; secret: string }

/**
 * Exige un segundo factor verificado (TOTP) antes de mostrar su contenido.
 *
 * Es una defensa en profundidad: los RPCs de plataforma rechazan cualquier
 * llamada cuyo JWT no sea `aal2`, así que este componente evita que el operador
 * vea un panel que igual no podría usar, y le ofrece enrolar el factor.
 */
export function MfaGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>('loading')
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const evaluate = useCallback(async () => {
    setError(null)
    const { data, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalError) {
      setError(aalError.message)
      setState('enroll')
      return
    }

    if (data?.currentLevel === 'aal2') {
      setState('ready')
      return
    }

    const { data: factors } = await supabase.auth.mfa.listFactors()
    const verified = factors?.totp?.find((f) => f.status === 'verified')

    if (verified) {
      setFactorId(verified.id)
      setState('challenge')
      return
    }

    setState('enroll')
  }, [])

  useEffect(() => {
    evaluate()
  }, [evaluate])

  async function startEnrollment() {
    setError(null)
    setSubmitting(true)
    try {
      // Limpia intentos previos sin verificar para no acumular factores huérfanos.
      const { data: factors } = await supabase.auth.mfa.listFactors()
      for (const factor of factors?.totp ?? []) {
        if (factor.status !== 'verified') {
          await supabase.auth.mfa.unenroll({ factorId: factor.id })
        }
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `TuTurno plataforma ${new Date().toISOString().slice(0, 10)}`
      })
      if (enrollError) throw enrollError
      setEnrollData({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret
      })
      setFactorId(data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el enrolamiento')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setError(null)
    setSubmitting(true)
    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim()
      })
      if (verifyError) throw verifyError

      setCode('')
      setEnrollData(null)
      await evaluate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido')
    } finally {
      setSubmitting(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className='flex justify-center py-12'>
        <Spinner size='lg' />
      </div>
    )
  }

  if (state === 'ready') return <>{children}</>

  return (
    <div className='mx-auto max-w-md py-8'>
      <Card elevated className='p-6'>
        <div className='flex items-center gap-2 mb-4 text-pitch-800'>
          <LockIcon size={20} />
          <h1 className='text-lg font-bold tracking-tight'>
            Verificación en dos pasos
          </h1>
        </div>

        {state === 'challenge' && (
          <p className='text-sm text-(--color-text-muted) mb-4'>
            Ingresa el código de 6 dígitos de tu app de autenticación para
            acceder al panel de plataforma.
          </p>
        )}

        {state === 'enroll' && !enrollData && (
          <>
            <p className='text-sm text-(--color-text-muted) mb-4'>
              El panel de plataforma exige un segundo factor. Enrola una app de
              autenticación (Google Authenticator, 1Password, Authy) para
              continuar.
            </p>
            <Button
              onClick={startEnrollment}
              loading={submitting}
              className='w-full'
            >
              Enrolar app de autenticación
            </Button>
          </>
        )}

        {state === 'enroll' && enrollData && (
          <div className='mb-4'>
            <p className='text-sm text-(--color-text-muted) mb-3'>
              Escanea el código con tu app y luego ingresa el código de 6
              dígitos que genere.
            </p>
            <img
              src={enrollData.qrCode}
              alt='Código QR para enrolar el segundo factor'
              className='mx-auto w-44 h-44'
            />
            <p className='mt-3 text-xs text-center text-(--color-text-muted) break-all'>
              ¿No puedes escanear? Clave manual:{' '}
              <code className='font-mono'>{enrollData.secret}</code>
            </p>
          </div>
        )}

        {(state === 'challenge' || enrollData) && (
          <form onSubmit={submitCode} className='flex flex-col gap-4'>
            <Input
              label='Código de 6 dígitos'
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode='numeric'
              autoComplete='one-time-code'
              placeholder='123456'
              required
              autoFocus
            />
            <Button type='submit' loading={submitting} className='w-full'>
              Verificar
            </Button>
          </form>
        )}

        {error && (
          <div className='mt-4'>
            <Alert variant='error'>{error}</Alert>
          </div>
        )}
      </Card>
    </div>
  )
}
