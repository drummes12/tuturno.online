import { useEffect, useState } from 'react'
import { Alert } from '@/components/common/alert'
import { BackLink } from '@/components/common/back-link'
import { Badge } from '@/components/common/badge'
import { Button } from '@/components/common/button'
import { Card } from '@/components/common/card'
import { BellIcon, MailIcon } from '@/components/common/icon'
import { savePushSubscription } from '@/services/push'
import {
  getExistingPushSubscription,
  getNotificationPermission,
  isPushSupported,
  requestNotificationPermission,
  subscribeToPush,
  type NotificationPermissionState
} from '@/lib/push'
import { isIosDevice } from '@/lib/pwa-install'
import { Page } from '@/components/layout/page'

export function NotificationsPage() {
  const initialPermission = getNotificationPermission()
  const requestedReturnPath = new URLSearchParams(window.location.search).get(
    'next'
  )
  const returnPath = requestedReturnPath?.startsWith('/')
    ? requestedReturnPath
    : '/'
  const backLabel = returnPath.includes('/mis-reservas')
    ? 'tus reservas'
    : 'inicio'
  const [permission, setPermission] =
    useState<NotificationPermissionState>(initialPermission)
  const [requesting, setRequesting] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [checkingSubscription, setCheckingSubscription] = useState(
    initialPermission === 'granted'
  )
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supported = isPushSupported()
  const ios = isIosDevice()

  useEffect(() => {
    if (!supported || permission !== 'granted') {
      setCheckingSubscription(false)
      return
    }

    let active = true
    setCheckingSubscription(true)
    void getExistingPushSubscription()
      .then((existingSubscription) => {
        if (active && existingSubscription) {
          setSubscription(existingSubscription)
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setCheckingSubscription(false)
      })

    return () => {
      active = false
    }
  }, [permission, supported])

  async function registerCurrentSubscription() {
    const nextSubscription = await subscribeToPush()
    setSubscription(nextSubscription)
    await savePushSubscription(nextSubscription)
  }

  async function handleEnable() {
    setRequesting(true)
    setError(null)
    setSuccess(null)

    try {
      const nextPermission = await requestNotificationPermission()
      setPermission(nextPermission)

      if (nextPermission === 'granted') {
        await registerCurrentSubscription()
        setSuccess('Este dispositivo quedó registrado para recibir avisos.')
      } else if (nextPermission === 'denied') {
        setError(
          'Las notificaciones quedaron bloqueadas. Sigue las instrucciones para habilitarlas desde los permisos del dispositivo.'
        )
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos activar las notificaciones.'
      )
    } finally {
      setRequesting(false)
    }
  }

  async function handleSubscribe() {
    setSubscribing(true)
    setError(null)
    setSuccess(null)

    try {
      await registerCurrentSubscription()
      setSuccess('Este dispositivo quedó registrado para recibir avisos.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos registrar este dispositivo.'
      )
    } finally {
      setSubscribing(false)
    }
  }

  const pushState = !supported
    ? { label: 'No disponible', variant: 'warning' as const }
    : permission === 'denied'
      ? { label: 'Bloqueado', variant: 'danger' as const }
      : permission === 'default'
        ? { label: 'Inactivo', variant: 'neutral' as const }
        : checkingSubscription
          ? { label: 'Comprobando…', variant: 'neutral' as const }
          : subscription
            ? { label: 'Activo', variant: 'success' as const }
            : { label: 'Sin sincronizar', variant: 'accent' as const }

  const pushDescription = !supported
    ? 'Este navegador no soporta push. Usa Chrome, Brave o Safari con la PWA instalada.'
    : permission === 'denied'
      ? 'Bloqueadas en el navegador. Sigue los pasos de abajo.'
      : permission === 'default'
        ? 'Todavía sin permiso en este dispositivo.'
        : checkingSubscription
          ? 'Verificando el registro de este dispositivo…'
          : subscription
            ? 'Este dispositivo está sincronizado con tu cuenta.'
            : 'Permiso concedido, falta sincronizar este dispositivo.'

  return (
    <Page width='narrow'>
      <div>
        <div className='flex items-center gap-1'>
          <BackLink href={returnPath} label={backLabel} />
          <h1 className='text-2xl font-bold tracking-tight'>Notificaciones</h1>
        </div>
        <p className='mt-1 text-sm leading-relaxed text-(--color-text-muted)'>
          Revisa el estado de los avisos de TuTurno en este dispositivo.
        </p>
      </div>

      <Card className='overflow-hidden p-0 animate-fade-up'>
        <div className='border-b border-border px-5 py-4 sm:px-6'>
          <p className='font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-(--color-text-muted)'>
            Canales de aviso
          </p>
          <p className='mt-1 text-sm leading-relaxed text-(--color-text-muted)'>
            Los avisos push complementan el correo: te enteras al momento cuando
            cambia el estado de una reserva.
          </p>
        </div>

        <div className='divide-y divide-border'>
          <div className='flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
            <div className='flex min-w-0 items-start gap-3'>
              <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pitch-500/15 text-pitch-700 dark:text-pitch-300'>
                <BellIcon size={18} />
              </span>
              <div className='min-w-0'>
                <p className='font-semibold tracking-tight'>
                  Push · este dispositivo
                </p>
                <p className='mt-0.5 text-sm leading-relaxed text-(--color-text-muted)'>
                  {pushDescription}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2 pl-12 sm:shrink-0 sm:pl-0'>
              <Badge variant={pushState.variant}>{pushState.label}</Badge>
              {supported && permission === 'default' && (
                <Button size='sm' loading={requesting} onClick={handleEnable}>
                  Activar
                </Button>
              )}
              {supported &&
                permission === 'granted' &&
                !checkingSubscription &&
                !subscription && (
                  <Button
                    variant='secondary'
                    size='sm'
                    loading={subscribing}
                    onClick={handleSubscribe}
                  >
                    Sincronizar
                  </Button>
                )}
            </div>
          </div>

          <div className='flex items-center justify-between gap-3 px-5 py-4 sm:px-6'>
            <div className='flex min-w-0 items-start gap-3'>
              <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-signal-blue/10 text-signal-blue dark:text-blue-300'>
                <MailIcon size={18} />
              </span>
              <div className='min-w-0'>
                <p className='font-semibold tracking-tight'>
                  Correo electrónico
                </p>
                <p className='mt-0.5 text-sm leading-relaxed text-(--color-text-muted)'>
                  Te llega un aviso cuando cambia el estado de una reserva.
                </p>
              </div>
            </div>
            <Badge variant='success'>Activo</Badge>
          </div>
        </div>
      </Card>

      {(success || error) && (
        <div className='flex flex-col gap-3 animate-fade-up'>
          {success && <Alert variant='success'>{success}</Alert>}
          {error && <Alert variant='error'>{error}</Alert>}
        </div>
      )}

      {supported && permission === 'denied' && (
        <Card className='p-5 sm:p-6 animate-fade-up'>
          <div className='flex flex-col gap-4'>
            <div>
              <h2 className='font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted'>
                Cómo volver a activarlas
              </h2>
              <p className='mt-2 text-sm leading-relaxed text-(--color-text-muted)'>
                El navegador no puede mostrar el permiso nuevamente desde la
                app. Debes cambiarlo desde la configuración del sitio o del
                dispositivo.
              </p>
            </div>

            <ol className='flex flex-col gap-3'>
              {(ios
                ? [
                    'Abre Configuración en tu iPhone o iPad.',
                    'Entra en Notificaciones y busca TuTurno.',
                    'Activa Permitir notificaciones y vuelve a abrir la PWA.'
                  ]
                : [
                    'Abre los permisos del sitio desde el ícono junto a la dirección web.',
                    'Busca Notificaciones y selecciona Permitir.',
                    'Vuelve a TuTurno y cierra y abre la aplicación.'
                  ]
              ).map((step, index) => (
                <li key={step} className='flex items-start gap-3 text-sm'>
                  <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pitch-500/15 font-mono text-[11px] font-semibold text-pitch-700 dark:text-pitch-300'>
                    {index + 1}
                  </span>
                  <span className='pt-0.5 leading-relaxed text-(--color-text-muted)'>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      )}
    </Page>
  )
}
