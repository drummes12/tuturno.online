import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'wouter'
import jsQR from 'jsqr'
import { AlertIcon, QrIcon, XIcon } from '@/components/common/icon'
import { Spinner } from '@/components/common/spinner'

type QrScannerSheetProps = {
  onClose: () => void
}

type BarcodeDetectorResult = { rawValue: string }
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]>
}

const BarcodeDetectorImpl = (
  window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
).BarcodeDetector

const BUSINESS_PATH_PATTERN = /^\/b\/([a-z0-9][a-z0-9-]*)/

function parseBusinessSlug(raw: string): string | null {
  let pathname: string
  try {
    pathname = new URL(raw).pathname
  } catch {
    pathname = raw
  }
  return BUSINESS_PATH_PATTERN.exec(pathname)?.[1] ?? null
}

/**
 * Sheet con escáner QR propio: dentro del PWA instalado el SO no captura
 * links, así que el usuario apunta la cámara al QR del negocio y navega
 * a /b/{slug} sin salir de la app.
 *
 * Decodifica con la API nativa BarcodeDetector (Chrome/Android) y cae a
 * jsQR sobre frames de canvas donde no existe (iOS).
 */
export function QrScannerSheet({ onClose }: QrScannerSheetProps) {
  const [, navigate] = useLocation()
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const actionsRef = useRef({ navigate, onClose })
  const lastNoticeAtRef = useRef(0)
  const [starting, setStarting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  actionsRef.current = { navigate, onClose }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 0)

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        actionsRef.current.onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let stream: MediaStream | null = null
    let frameId = 0
    let lastScanAt = 0
    let disposed = false
    const canvas = document.createElement('canvas')
    const detector = BarcodeDetectorImpl
      ? new BarcodeDetectorImpl({ formats: ['qr_code'] })
      : null

    function handleDecoded(raw: string) {
      const slug = parseBusinessSlug(raw)
      if (slug) {
        actionsRef.current.onClose()
        actionsRef.current.navigate(`/b/${slug}`)
        return
      }
      const now = Date.now()
      if (now - lastNoticeAtRef.current > 3000) {
        lastNoticeAtRef.current = now
        setNotice('Ese QR no es de TuTurno. Apunta al código del negocio.')
      }
    }

    async function decode(): Promise<string | null> {
      if (!video || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        return null
      }
      if (detector) {
        try {
          const [code] = await detector.detect(video)
          return code?.rawValue ?? null
        } catch {
          return null
        }
      }
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx || canvas.width === 0) return null
      ctx.drawImage(video, 0, 0)
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
      return jsQR(frame.data, frame.width, frame.height)?.data ?? null
    }

    async function tick(now: number) {
      if (disposed) return
      if (now - lastScanAt >= 200) {
        lastScanAt = now
        const raw = await decode()
        if (raw && !disposed) handleDecoded(raw)
      }
      frameId = requestAnimationFrame(tick)
    }

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        video.srcObject = stream
        await video.play()
        setStarting(false)
        frameId = requestAnimationFrame(tick)
      } catch (err) {
        if (disposed) return
        setStarting(false)
        setError(
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Necesitamos permiso para usar la cámara. Habilítalo y vuelve a intentar.'
            : 'No pudimos acceder a la cámara de este dispositivo.'
        )
      }
    }

    void start()

    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  return createPortal(
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm animate-backdrop-in sm:items-center sm:p-6'
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby='qr-scanner-title'
        className='flex w-full flex-col overflow-hidden rounded-t-3xl bg-surface-elevated shadow-(--shadow-lg) animate-sheet-up sm:max-w-md sm:rounded-3xl sm:animate-fade-up'
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className='flex justify-center pt-2.5 sm:hidden'
          aria-hidden='true'
        >
          <span className='h-1 w-10 rounded-full bg-graphite-200' />
        </div>

        <div className='flex items-center gap-3 px-5 pb-3 pt-4'>
          <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pitch-100 text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300'>
            <QrIcon size={18} />
          </span>
          <div className='min-w-0 flex-1'>
            <h2
              id='qr-scanner-title'
              className='text-sm font-semibold tracking-tight text-(--color-text)'
            >
              Escanea el QR del negocio
            </h2>
            <p className='mt-0.5 text-xs text-(--color-text-muted)'>
              Apunta la cámara al código
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type='button'
            onClick={onClose}
            className='touch-target -mr-2 flex shrink-0 items-center justify-center rounded-full text-(--color-text-muted) transition-all duration-150 ease-out hover:bg-surface-inset hover:text-(--color-text) active:scale-[0.92]'
            aria-label='Cerrar escáner'
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className='relative mx-5 mb-[max(1.25rem,env(safe-area-inset-bottom))] aspect-square overflow-hidden rounded-2xl bg-pitch-950'>
          {error ? (
            <div className='flex h-full flex-col items-center justify-center gap-3 px-8 text-center'>
              <AlertIcon size={28} className='text-flood-400' />
              <p className='text-sm text-chalk-dim'>{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className='absolute inset-0 h-full w-full object-cover'
              />
              <div
                aria-hidden='true'
                className='pointer-events-none absolute inset-0 flex items-center justify-center'
              >
                <span className='h-3/5 w-3/5 animate-pulse rounded-2xl border-2 border-pitch-400/80' />
              </div>
              {starting && (
                <div className='absolute inset-0 flex items-center justify-center'>
                  <Spinner />
                </div>
              )}
              {notice && (
                <p className='absolute inset-x-4 bottom-4 rounded-xl bg-black/70 px-3 py-2 text-center text-xs text-chalk backdrop-blur-sm'>
                  {notice}
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>,
    document.body
  )
}
