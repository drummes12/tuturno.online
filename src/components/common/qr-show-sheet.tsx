import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { renderBusinessQr } from '@/lib/qr-render'
import { StoreIcon, XIcon } from '@/components/common/icon'
import { Spinner } from '@/components/common/spinner'

type QrShowSheetProps = {
  /** Slug del negocio, ej: "canchas-el-parque" */
  slug: string
  businessName?: string
  onClose: () => void
}

/**
 * Pantalla completa con el QR del negocio, pensada para mostrar el
 * dispositivo al cliente en el mostrador: fondo blanco puro para máximo
 * contraste de escaneo, QR tan grande como quepa.
 */
export function QrShowSheet({ slug, businessName, onClose }: QrShowSheetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 0)

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return
    renderBusinessQr(
      canvas,
      `${window.location.origin}/b/${slug}`
    ).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  return createPortal(
    <div
      role='dialog'
      aria-modal='true'
      aria-label={`Código QR de ${businessName ?? 'tu negocio'}`}
      className='fixed inset-0 z-50 flex flex-col bg-white animate-backdrop-in'
      onClick={onClose}
    >
      <button
        ref={closeButtonRef}
        type='button'
        onClick={onClose}
        className='touch-target absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-center rounded-full text-graphite-500 transition-all duration-150 ease-out hover:bg-graphite-900/5 hover:text-graphite-900 active:scale-[0.92]'
        aria-label='Cerrar QR'
      >
        <XIcon size={24} />
      </button>

      <div className='flex min-w-0 flex-1 flex-col items-center justify-center gap-5 px-6 pb-[env(safe-area-inset-bottom)]'>
        <div className='flex items-center gap-2 text-graphite-500'>
          <StoreIcon size={17} />
          <span className='font-mono text-[11px] font-semibold uppercase tracking-[0.14em]'>
            {businessName ?? 'Mi negocio'}
          </span>
        </div>

        <div className='relative aspect-square w-[min(88vw,60dvh)]'>
          {!ready && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <Spinner size='lg' />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`h-full w-full transition-opacity duration-200 ${ready ? 'opacity-100' : 'opacity-0'}`}
            aria-label='Código QR de la página de reservas'
            role='img'
          />
        </div>

        <p className='text-center text-sm text-graphite-500'>
          El cliente escanea este código para ver tu disponibilidad
        </p>
      </div>
    </div>,
    document.body
  )
}
