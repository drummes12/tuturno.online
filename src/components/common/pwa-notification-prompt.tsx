import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { Button } from '@/components/common/button'
import { BellIcon, XIcon } from '@/components/common/icon'
import type { PushNotificationState } from '@/hooks/use-push-notifications'

interface PwaNotificationPromptProps {
  state: PushNotificationState
}

export function PwaNotificationPrompt({ state }: PwaNotificationPromptProps) {
  const { permission, busy, error, showPrompt, requestAndRegister, dismiss } =
    state
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!showPrompt) {
      setVisible(false)
      return
    }

    const timeout = window.setTimeout(() => setVisible(true), 1500)
    return () => window.clearTimeout(timeout)
  }, [showPrompt])

  if (!showPrompt || !visible) return null

  const denied = permission === 'denied'

  return (
    <div className='w-full' role='alert' aria-live='polite'>
      <div className='flex items-center gap-3 rounded-2xl border border-pitch-300 bg-pitch-100 p-3 shadow-[0_12px_35px_rgba(4,33,15,0.2)]'>
        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white'>
          <BellIcon size={20} />
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold text-(--color-text)'>
            {denied ? 'Activa las notificaciones' : 'Recibe avisos de TuTurno'}
          </p>
          <p className='text-xs text-(--color-text-muted) mt-0.5'>
            {error ??
              (denied
                ? 'Están bloqueadas en este dispositivo. Revisa los permisos del sitio.'
                : 'Te avisaremos cuando cambie el estado de tus reservas.')}
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-1.5'>
          {denied ? (
            <Link
              href='/notificaciones'
              onClick={dismiss}
              className='inline-flex h-11 items-center justify-center rounded-lg bg-primary px-3.5 text-sm font-medium text-white touch-target'
            >
              Ver instrucciones
            </Link>
          ) : (
            <Button size='sm' loading={busy} onClick={requestAndRegister}>
              Activar
            </Button>
          )}
          <button
            type='button'
            onClick={dismiss}
            className='inline-flex h-11 w-11 items-center justify-center rounded-lg text-(--color-text-muted) transition-colors hover:bg-pitch-200 hover:text-(--color-text) touch-target'
            aria-label='Cerrar aviso de notificaciones'
            title='Más tarde'
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
