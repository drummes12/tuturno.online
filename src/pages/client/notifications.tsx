import { useState } from 'react'
import { Link } from 'wouter'
import { Alert } from '@/components/common/alert'
import { Button } from '@/components/common/button'
import { Card } from '@/components/common/card'
import { BellIcon, ArrowLeftIcon } from '@/components/common/icon'
import { savePushSubscription, sendTestPush } from '@/services/push'
import {
  getNotificationPermission,
  getReadyServiceWorker,
  isPushSupported,
  requestNotificationPermission,
  subscribeToPush,
  type NotificationPermissionState
} from '@/lib/push'

export function NotificationsPage() {
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    getNotificationPermission()
  )
  const [requesting, setRequesting] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supported = isPushSupported()

  async function handleEnable() {
    setRequesting(true)
    setError(null)
    setSuccess(null)

    try {
      const nextPermission = await requestNotificationPermission()
      setPermission(nextPermission)

      if (nextPermission === 'granted') {
        await getReadyServiceWorker()
        setSuccess(
          'Permiso concedido. Ahora puedes registrar este dispositivo.'
        )
      } else if (nextPermission === 'denied') {
        setError(
          'Las notificaciones fueron bloqueadas. Puedes habilitarlas desde los permisos del sitio en Chrome.'
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

  async function handleSendTestPush() {
    setSendingTest(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await sendTestPush()
      setSuccess(`Notificación enviada a ${result.sent} dispositivo(s).`)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No pudimos enviar la notificación de prueba.'
      )
    } finally {
      setSendingTest(false)
    }
  }

  async function handleSubscribe() {
    setSubscribing(true)
    setError(null)
    setSuccess(null)

    try {
      const nextSubscription = await subscribeToPush()
      setSubscription(nextSubscription)

      try {
        await savePushSubscription(nextSubscription)
        setSuccess(
          'PushSubscription creada y asociada a tu usuario en TuTurno.'
        )
      } catch (caught) {
        setError(
          caught instanceof Error
            ? `La suscripción local existe, pero no pudimos guardarla: ${caught.message}`
            : 'La suscripción local existe, pero no pudimos guardarla en TuTurno.'
        )
      }
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
    <div className='flex flex-col gap-4 max-w-2xl mx-auto'>
      <Link
        href='/'
        className='flex items-center gap-1.5 text-sm text-(--color-text-muted) hover:text-(--color-text) transition-colors w-fit touch-target -ml-2 px-2 rounded-lg'
      >
        <ArrowLeftIcon size={16} />
        Volver al inicio
      </Link>

      <div className='animate-fade-up'>
        <h1 className='text-2xl font-bold tracking-tight'>Notificaciones</h1>
        <p className='text-sm text-(--color-text-muted) mt-1'>
          Controla si este dispositivo puede recibir avisos de TuTurno.
        </p>
      </div>

      <Card className='p-5 animate-fade-up' style={{ animationDelay: '60ms' }}>
        <div className='flex items-start gap-3 mb-4'>
          <BellIcon size={20} className='text-(--color-text-muted) mt-0.5' />
          <div>
            <h2 className='text-sm font-semibold'>Notificaciones push</h2>
            <p className='text-xs text-(--color-text-muted) mt-1'>
              Recibe avisos sobre cambios importantes sin tener que mantener
              TuTurno abierto.
            </p>
          </div>
        </div>

        {success && <Alert variant='success'>{success}</Alert>}
        {error && <Alert variant='error'>{error}</Alert>}

        {!supported && (
          <Alert variant='info'>
            Este navegador no tiene soporte completo para notificaciones push.
            Abre TuTurno en Chrome Android o en un navegador compatible.
          </Alert>
        )}

        {supported && permission === 'granted' && !subscription && !success && (
          <Alert variant='success'>
            Las notificaciones están permitidas. Aún falta registrar este
            dispositivo con Push.
          </Alert>
        )}

        {subscription && (
          <Alert variant='success'>
            <div className='flex flex-col gap-1'>
              <span>Este dispositivo tiene una PushSubscription local.</span>
              <span className='text-xs opacity-80'>
                Servicio: {new URL(subscription.endpoint).origin}
              </span>
            </div>
          </Alert>
        )}

        {supported && permission === 'denied' && !error && (
          <Alert variant='warning'>
            Las notificaciones están bloqueadas para este sitio. Habilítalas
            desde la configuración de permisos de Chrome.
          </Alert>
        )}

        {supported && permission === 'default' && (
          <Button loading={requesting} onClick={handleEnable}>
            <BellIcon size={18} />
            Activar notificaciones
          </Button>
        )}

        {supported && permission === 'granted' && !subscription && (
          <Button loading={subscribing} onClick={handleSubscribe}>
            <BellIcon size={18} />
            Registrar este dispositivo
          </Button>
        )}

        {subscription && (
          <Button
            variant='secondary'
            loading={sendingTest}
            onClick={handleSendTestPush}
          >
            <BellIcon size={18} />
            Enviar push de prueba
          </Button>
        )}

        <p className='text-xs text-(--color-text-muted) mt-4 leading-relaxed'>
          La suscripción se crea localmente y se asocia de forma segura a tu
          usuario autenticado. Nunca exponemos sus claves en la interfaz.
        </p>
      </Card>
    </div>
  )
}
