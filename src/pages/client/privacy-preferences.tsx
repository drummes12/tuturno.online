import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import {
  fetchMyMarketingConsents,
  withdrawMarketingConsent,
  setMarketingConsent
} from '@/services/privacy'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import { Alert } from '@/components/common/alert'
import { Spinner } from '@/components/common/spinner'
import { ArrowLeftIcon, CheckIcon, MailIcon } from '@/components/common/icon'

interface ConsentRow {
  business_id: string
  business_name: string
  status: 'accepted' | 'withdrawn'
  accepted_at: string | null
  withdrawn_at: string | null
  policy_version: string
}

export function PrivacyPreferencesPage() {
  const { user } = useAuthStore()
  const [consents, setConsents] = useState<ConsentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    if (!user) return
    setLoading(true)
    try {
      const data = await fetchMyMarketingConsents()
      setConsents(data as ConsentRow[])
    } catch {
      setError('No pudimos cargar tus preferencias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleWithdraw(businessId: string) {
    setBusyId(businessId)
    setError(null)
    try {
      await withdrawMarketingConsent(businessId)
      await load()
    } catch {
      setError('No pudimos actualizar tu preferencia. Intenta de nuevo.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReaccept(businessId: string) {
    setBusyId(businessId)
    setError(null)
    try {
      await setMarketingConsent(businessId, true, 'preferences')
      await load()
    } catch {
      setError('No pudimos actualizar tu preferencia. Intenta de nuevo.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-3'>
        <Spinner size='lg' />
        <p className='text-sm text-(--color-text-muted)'>Cargando…</p>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4 max-w-2xl mx-auto'>
      <Link
        href='/'
        className='flex items-center gap-1.5 text-sm text-(--color-text-muted) hover:text-(--color-text) transition-colors w-fit touch-target -ml-2 px-2 rounded-lg'
      >
        <ArrowLeftIcon size={16} />
        Volver al inicio
      </Link>

      <div className='animate-fade-up'>
        <h1 className='text-2xl font-bold tracking-tight'>
          Preferencias de privacidad
        </h1>
        <p className='text-sm text-(--color-text-muted) mt-1'>
          Gestiona tu consentimiento para recibir promociones por email de los
          negocios donde has reservado.
        </p>
      </div>

      <Card className='p-5 animate-fade-up' style={{ animationDelay: '60ms' }}>
        <div className='flex items-start gap-3 mb-4'>
          <MailIcon size={20} className='text-(--color-text-muted) mt-0.5' />
          <div>
            <h2 className='text-sm font-semibold'>
              Promociones por correo electrónico
            </h2>
            <p className='text-xs text-(--color-text-muted) mt-1'>
              Cada negocio gestiona su propio marketing. Puedes darte de baja o
              reactivar tu consentimiento por negocio cuando quieras. Esto no
              afecta las notificaciones operativas de tus reservas.
            </p>
          </div>
        </div>

        {error && <Alert variant='error'>{error}</Alert>}

        {consents.length === 0 ? (
          <p className='text-sm text-(--color-text-muted) py-4 text-center'>
            No tienes consentimientos de marketing registrados. Cuando reserves
            y aceptes promociones de un negocio, aparecerán aquí.
          </p>
        ) : (
          <ul className='flex flex-col gap-3'>
            {consents.map((c) => (
              <li
                key={c.business_id}
                className='flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface-elevated'
              >
                <div className='flex flex-col min-w-0'>
                  <span className='text-sm font-medium truncate'>
                    {c.business_name}
                  </span>
                  <span className='text-xs text-(--color-text-muted)'>
                    {c.status === 'accepted'
                      ? `Aceptado${c.accepted_at ? ` · ${new Date(c.accepted_at).toLocaleDateString('es-CO')}` : ''}`
                      : 'Dado de baja'}
                  </span>
                </div>
                {c.status === 'accepted' ? (
                  <Button
                    variant='secondary'
                    size='sm'
                    loading={busyId === c.business_id}
                    onClick={() => handleWithdraw(c.business_id)}
                  >
                    Dar de baja
                  </Button>
                ) : (
                  <Button
                    variant='secondary'
                    size='sm'
                    loading={busyId === c.business_id}
                    onClick={() => handleReaccept(c.business_id)}
                  >
                    <CheckIcon size={16} />
                    Reactivar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className='p-5 animate-fade-up' style={{ animationDelay: '120ms' }}>
        <h2 className='text-sm font-semibold mb-2'>Tus derechos</h2>
        <p className='text-xs text-(--color-text-muted) leading-relaxed'>
          Puedes consultar, corregir, solicitar la supresión o retirar tu
          consentimiento de marketing en cualquier momento. Para ejercer tus
          derechos sobre tus datos personales, escribe a{' '}
          <strong>privacidad@tuturno.online</strong>. Consulta la{' '}
          <Link
            href='/privacidad'
            className='text-(--color-primary) hover:underline'
          >
            Política de Datos
          </Link>{' '}
          para más información.
        </p>
      </Card>
    </div>
  )
}
