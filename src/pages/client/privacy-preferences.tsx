import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { useAuthStore } from '@/stores/auth'
import { useIsOffline } from '@/hooks/use-connectivity'
import {
  fetchMyMarketingConsents,
  withdrawMarketingConsent,
  setMarketingConsent
} from '@/services/privacy'
import { Card } from '@/components/common/card'
import { BackLink } from '@/components/common/back-link'
import { Button } from '@/components/common/button'
import { Alert } from '@/components/common/alert'
import { Spinner, PageLoader } from '@/components/common/spinner'
import { CheckIcon, MailIcon } from '@/components/common/icon'
import { Page } from '@/components/layout/page'
import { LEGAL_ENTITY } from '@/lib/legal'

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
  const offline = useIsOffline()
  const requestedReturnPath = new URLSearchParams(window.location.search).get(
    'next'
  )
  const returnPath = requestedReturnPath?.startsWith('/')
    ? requestedReturnPath
    : '/'
  const backLabel = returnPath.includes('/mis-reservas')
    ? 'tus reservas'
    : 'inicio'
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
      <PageLoader>
        <span className='flex flex-col items-center gap-3'>
          <Spinner size='lg' />
          <p className='text-sm text-(--color-text-muted)'>Cargando…</p>
        </span>
      </PageLoader>
    )
  }

  return (
    <Page width='narrow'>
      <div className='animate-fade-up'>
        <div className='flex items-center gap-1'>
          <BackLink href={returnPath} label={backLabel} />
          <h1 className='text-2xl font-bold tracking-tight'>
            Preferencias de privacidad
          </h1>
        </div>
        <p className='text-sm text-(--color-text-muted) mt-1'>
          Gestiona tu consentimiento para recibir promociones por email de los
          negocios donde has reservado.
        </p>
      </div>

      <Card
        className='p-0 overflow-hidden animate-fade-up'
        style={{ animationDelay: '60ms' }}
      >
        <div className='flex items-center gap-3 border-b border-border px-5 py-4'>
          <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pitch-100 text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300'>
            <MailIcon size={16} />
          </span>
          <div className='min-w-0'>
            <h2 className='text-[11px] font-semibold uppercase tracking-[0.14em] text-(--color-text)'>
              Promociones por correo
            </h2>
            <p className='text-xs text-(--color-text-muted) mt-0.5'>
              Marketing por negocio — no afecta los avisos de tus reservas.
            </p>
          </div>
        </div>

        {error && (
          <div className='p-4'>
            <Alert variant='error'>{error}</Alert>
          </div>
        )}

        {consents.length === 0 ? (
          <p className='text-sm text-(--color-text-muted) px-5 py-8 text-center'>
            No tienes consentimientos de marketing registrados. Cuando reserves
            y aceptes promociones de un negocio, aparecerán aquí.
          </p>
        ) : (
          <ul className='flex flex-col divide-y divide-border/60'>
            {consents.map((c) => {
              const accepted = c.status === 'accepted'
              return (
                <li
                  key={c.business_id}
                  className='flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface-inset/60'
                >
                  <div className='flex min-w-0 flex-col gap-0.5'>
                    <span className='text-sm font-medium truncate'>
                      {c.business_name}
                    </span>
                    <span
                      className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
                        accepted
                          ? 'text-pitch-700 dark:text-pitch-300'
                          : 'text-(--color-text-muted)'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${accepted ? 'bg-pitch-500' : 'bg-(--color-text-muted)/50'}`}
                        aria-hidden='true'
                      />
                      {accepted
                        ? `Aceptado${c.accepted_at ? ` · ${new Date(c.accepted_at).toLocaleDateString('es-CO')}` : ''}`
                        : 'Dado de baja'}
                    </span>
                  </div>
                  {accepted ? (
                    <Button
                      variant='secondary'
                      size='sm'
                      loading={busyId === c.business_id}
                      disabled={offline}
                      onClick={() => handleWithdraw(c.business_id)}
                    >
                      Dar de baja
                    </Button>
                  ) : (
                    <Button
                      variant='secondary'
                      size='sm'
                      loading={busyId === c.business_id}
                      disabled={offline}
                      onClick={() => handleReaccept(c.business_id)}
                    >
                      <CheckIcon size={16} />
                      Reactivar
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card className='p-5 animate-fade-up' style={{ animationDelay: '120ms' }}>
        <h2 className='text-[11px] font-semibold uppercase tracking-[0.14em] text-(--color-text) mb-2'>
          Tus derechos
        </h2>
        <p className='text-xs text-(--color-text-muted) leading-relaxed'>
          Puedes consultar, corregir, solicitar la supresión o retirar tu
          consentimiento de marketing en cualquier momento. Para ejercer tus
          derechos sobre tus datos personales, escribe a{' '}
          <strong>{LEGAL_ENTITY.email}</strong>. Consulta la{' '}
          <Link
            href='/privacidad'
            className='text-(--color-primary) hover:underline'
          >
            Política de Datos
          </Link>{' '}
          para más información.
        </p>
      </Card>
    </Page>
  )
}
