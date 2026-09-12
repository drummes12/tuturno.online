import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { Alert } from '@/components/common/alert'
import { Button } from '@/components/common/button'
import { Card } from '@/components/common/card'
import { ArrowLeftIcon, BellIcon, CheckIcon } from '@/components/common/icon'
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

export function NotificationsPage() {
  const initialPermission = getNotificationPermission()
  const requestedReturnPath = new URLSearchParams(window.location.search).get(
    'next'
  )
  const returnPath = requestedReturnPath?.startsWith('/')
    ? requestedReturnPath
    : '/'
  const returnLabel = returnPath.includes('/mis-reservas')
    ? 'Volver a tus reservas'
    : 'Volver'
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

  return (
    <div className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
      <Link
        href={returnPath}
        className='-ml-2 flex w-fit items-center gap-1.5 rounded-lg px-2 text-sm text-(--color-text-muted) transition-colors hover:text-(--color-text) touch-target'
      >
        <ArrowLeftIcon size={16} />
        {returnLabel}
      </Link>

      <header className='flex flex-col gap-1'>
        <h1 className='text-2xl font-bold tracking-tight'>Notificaciones</h1>
        <p className='text-sm leading-relaxed text-(--color-text-muted)'>
          Revisa el estado de los avisos de TuTurno en este dispositivo.
        </p>
      </header>

      <Card className='p-5 sm:p-6'>
        <div className='flex flex-col gap-5'>
          <div className='flex items-start gap-3'>
            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pitch-100 text-primary'>
              <BellIcon size={20} />
            </span>
            <div className='min-w-0'>
              <h2 className='text-base font-semibold'>
                Estado del dispositivo
              </h2>
              <p className='mt-1 text-sm leading-relaxed text-(--color-text-muted)'>
                Las notificaciones push son complementarias al correo y te
                avisan cuando cambia el estado de una reserva.
              </p>
            </div>
          </div>

          <div className='flex flex-col gap-3'>
            {success && <Alert variant='success'>{success}</Alert>}
            {error && <Alert variant='error'>{error}</Alert>}

            {!supported && (
              <Alert variant='info'>
                Este navegador no tiene soporte completo para notificaciones
                push. Abre TuTurno en Chrome, Brave o Safari con la PWA
                instalada.
              </Alert>
            )}

            {supported && permission === 'default' && (
              <Alert variant='info'>
                Todavía no has concedido permiso para recibir avisos en este
                dispositivo.
              </Alert>
            )}

            {supported && permission === 'denied' && !error && (
              <Alert variant='warning'>
                Las notificaciones están bloqueadas para este sitio o
                aplicación.
              </Alert>
            )}

            {supported &&
              permission === 'granted' &&
              !checkingSubscription &&
              subscription && (
                <Alert variant='success'>
                  <div className='flex flex-col gap-1'>
                    <span className='font-medium'>
                      Notificaciones activas en este dispositivo.
                    </span>
                    <span className='text-xs opacity-80'>
                      Este dispositivo está sincronizado con tu cuenta.
                    </span>
                  </div>
                </Alert>
              )}

            {supported &&
              permission === 'granted' &&
              !checkingSubscription &&
              !subscription &&
              !success && (
                <Alert variant='warning'>
                  El permiso está concedido, pero este dispositivo todavía no
                  está sincronizado con tu cuenta.
                </Alert>
              )}
          </div>

          {supported && permission === 'default' && (
            <Button
              loading={requesting}
              onClick={handleEnable}
              className='w-full sm:w-fit'
            >
              <BellIcon size={18} />
              Activar notificaciones
            </Button>
          )}

          {supported &&
            permission === 'granted' &&
            !checkingSubscription &&
            !subscription && (
              <Button
                variant='secondary'
                loading={subscribing}
                onClick={handleSubscribe}
                className='w-full sm:w-fit'
              >
                <BellIcon size={18} />
                Reintentar sincronización
              </Button>
            )}
        </div>
      </Card>

      {supported && permission === 'denied' && (
        <Card className='p-5 sm:p-6'>
          <div className='flex flex-col gap-4'>
            <div>
              <h2 className='text-base font-semibold'>
                Cómo volver a activarlas
              </h2>
              <p className='mt-1 text-sm leading-relaxed text-(--color-text-muted)'>
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
                  <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pitch-100 text-xs font-semibold text-primary'>
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

      <Card className='p-5 sm:p-6'>
        <div className='flex flex-col gap-3'>
          <h2 className='text-base font-semibold'>Cómo funciona</h2>
          <ul className='flex flex-col gap-3 text-sm text-(--color-text-muted)'>
            <li className='flex items-start gap-2.5'>
              <CheckIcon size={17} className='mt-0.5 shrink-0 text-primary' />
              <span>
                Recibes avisos cuando cambia el estado de una reserva.
              </span>
            </li>
            <li className='flex items-start gap-2.5'>
              <CheckIcon size={17} className='mt-0.5 shrink-0 text-primary' />
              <span>El correo sigue disponible como canal de respaldo.</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
