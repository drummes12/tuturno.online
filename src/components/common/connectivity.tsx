import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/common/button'
import {
  CheckIcon,
  RefreshIcon,
  WifiIcon,
  WifiOffIcon
} from '@/components/common/icon'
import type { Connectivity } from '@/hooks/use-connectivity'

/**
 * Píldora flotante de conectividad. Muestra "Conexión lenta" cuando la
 * red está degradada y "Sin conexión" cuando no hay red; al recuperarse
 * confirma unos segundos con "Conexión restablecida".
 */
export function ConnectivityIndicator({ status }: { status: Connectivity }) {
  const [restored, setRestored] = useState(false)
  const prevStatus = useRef(status)

  useEffect(() => {
    const prev = prevStatus.current
    prevStatus.current = status

    if (status === 'online' && prev !== 'online') {
      setRestored(true)
      const timer = setTimeout(() => setRestored(false), 3000)
      return () => clearTimeout(timer)
    }
    if (status !== 'online') setRestored(false)
  }, [status])

  if (status === 'online' && !restored) return null

  const config = restored
    ? {
        pill: 'bg-success text-on-primary',
        icon: <CheckIcon size={14} strokeWidth={2.5} />,
        label: 'Conexión restablecida'
      }
    : status === 'offline'
      ? {
          pill: 'bg-signal-red text-white',
          icon: <WifiOffIcon size={14} />,
          label: 'Sin conexión — reintentando'
        }
      : {
          pill: 'bg-warning text-white',
          icon: <WifiIcon size={14} />,
          label: 'Conexión lenta'
        }

  return (
    <div
      role='status'
      className='fixed left-1/2 top-[calc(4.75rem+env(safe-area-inset-top))] z-70 -translate-x-1/2'
    >
      <div
        className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap shadow-(--shadow-md) animate-popover-in ${config.pill}`}
      >
        {config.icon}
        <span>{config.label}</span>
      </div>
    </div>
  )
}

/**
 * Aviso persistente para usuarios autenticados sin conexión: la app sigue
 * visible con la última data cacheada, en modo solo lectura. Se renderiza
 * dentro del flujo del contenido (no overlay) para que el contexto sea
 * claro sin tapar la información.
 */
export function OfflineNotice() {
  return (
    <div
      role='status'
      className='mb-4 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 animate-fade-up'
    >
      <WifiOffIcon
        size={18}
        className='mt-0.5 shrink-0 text-warning'
        aria-hidden='true'
      />
      <div className='flex flex-col gap-0.5'>
        <p className='text-sm font-semibold'>Modo sin conexión</p>
        <p className='text-xs text-(--color-text-muted) leading-relaxed'>
          Estás viendo la última información guardada — puede no estar
          actualizada. Solo lectura: no puedes crear, editar ni eliminar
          hasta que vuelva la conexión.
        </p>
      </div>
    </div>
  )
}

/**
 * Pantalla completa para cuando definitivamente no hay conexión. Es un
 * overlay (no reemplaza la vista), así el estado de la página se
 * conserva y reaparece solo al volver la red.
 */
export function OfflineScreen({
  onRetry,
  onDismiss
}: {
  onRetry: () => Promise<void>
  onDismiss: () => void
}) {
  const [checking, setChecking] = useState(false)

  const handleRetry = async () => {
    setChecking(true)
    try {
      await onRetry()
    } finally {
      setChecking(false)
    }
  }

  return (
    <div
      role='alert'
      className='fixed inset-0 z-60 flex flex-col items-center justify-center gap-5 bg-surface px-6 text-center animate-fade-up'
    >
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0'
        style={{
          background:
            'radial-gradient(60% 50% at 50% 30%, rgb(52 211 153 / 0.14), transparent)'
        }}
      />
      <img
        src='/logo-mark.svg'
        alt='TuTurno'
        className='h-20 w-20 rounded-2xl shadow-(--shadow-lg)'
      />
      <div className='relative flex flex-col items-center gap-2'>
        <h1 className='text-xl font-bold'>Sin conexión</h1>
        <p className='max-w-xs text-sm text-(--color-text-muted)'>
          No pudimos conectar con TuTurno. Revisa tu WiFi o datos móviles;
          volvemos apenas se restablezca.
        </p>
      </div>
      <Button onClick={handleRetry} loading={checking} size='lg'>
        <RefreshIcon size={16} />
        Reintentar
      </Button>
      <p className='relative text-xs text-(--color-text-muted)'>
        La pantalla se restaurará sola cuando vuelva la conexión.
      </p>
      <button
        type='button'
        onClick={onDismiss}
        className='relative text-xs text-(--color-text-muted) underline underline-offset-2 transition-colors hover:text-(--color-text) touch-target'
      >
        Ver la app de todos modos
      </button>
    </div>
  )
}
