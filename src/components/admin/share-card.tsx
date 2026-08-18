import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Card } from '@/components/common/card'
import { Button } from '@/components/common/button'
import {
  QrIcon,
  CopyIcon,
  DownloadIcon,
  CheckIcon,
  ExternalLinkIcon
} from '@/components/common/icon'

interface ShareCardProps {
  /** Slug del negocio, ej: "new-business" */
  slug: string
  /** Nombre del negocio para el nombre del archivo descargado */
  businessName?: string
}

/**
 * Carga el logo de TuTurno como HTMLImageElement.
 * Devuelve null si no se puede cargar (el QR se genera sin logo).
 */
function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo-clock.svg'
  })
}

/**
 * Dibuja un rectángulo redondeado en el contexto del canvas.
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/**
 * Tarjeta de "Compartir tu página" para el panel admin.
 * Muestra un QR code de la página pública de reservas, permite copiar
 * el link y descargar el QR como PNG.
 *
 * Responsive: en mobile el QR y las acciones se apilan; en desktop
 * se muestran lado a lado.
 */
export function ShareCard({ slug, businessName }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publicUrl = `${window.location.origin}/b/${slug}`

  // Generar QR en un canvas y dibujar el logo de TuTurno en el centro.
  // Se usa errorCorrectionLevel 'H' (alto, ~30% de redundancia) para que
  // el QR siga siendo escaneable aunque el logo tape parte del código.
  useEffect(() => {
    let cancelled = false
    async function generate() {
      const canvas = canvasRef.current
      if (!canvas) return
      try {
        // 1. Generar el QR base con alta corrección de errores
        await QRCode.toCanvas(canvas, publicUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#04210f', // pitch-900
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        })
        if (cancelled) return

        // 2. Cargar el logo de TuTurno
        const logo = await loadLogo()
        if (cancelled || !logo) {
          // Si el logo no carga, el QR ya está listo sin logo
          const url = canvas.toDataURL('image/png')
          setQrDataUrl(url)
          return
        }

        // 3. Dibujar el logo en el centro con fondo blanco para contraste
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          const url = canvas.toDataURL('image/png')
          setQrDataUrl(url)
          return
        }

        const size = canvas.width
        const logoSize = Math.round(size * 0.26) // 26% del QR
        const padding = Math.round(logoSize * 0.1)
        const boxSize = logoSize + padding * 2
        const boxX = (size - boxSize) / 2
        const boxY = (size - boxSize) / 2
        const logoX = boxX + padding
        const logoY = boxY + padding

        // Fondo blanco redondeado detrás del logo para contraste
        const radius = Math.round(boxSize * 0.22)
        ctx.fillStyle = '#ffffff'
        roundedRect(ctx, boxX, boxY, boxSize, boxSize, radius)
        ctx.fill()

        // Logo (reloj sin cuadro verde)
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)

        const url = canvas.toDataURL('image/png')
        setQrDataUrl(url)
      } catch {
        if (!cancelled) {
          setError('No se pudo generar el código QR.')
        }
      }
    }
    generate()
    return () => {
      cancelled = true
    }
  }, [publicUrl])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: seleccionar y copiar con execCommand ( navegadores antiguos)
      try {
        const textarea = document.createElement('textarea')
        textarea.value = publicUrl
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        setError('No se pudo copiar. Copia el link manualmente.')
      }
    }
  }, [publicUrl])

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) return
    const safeName = (businessName ?? slug)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
    const link = document.createElement('a')
    link.download = `qr-tuturno-${safeName}.png`
    link.href = qrDataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [qrDataUrl, businessName, slug])

  return (
    <Card className='p-5 animate-fade-up'>
      <div className='flex items-center gap-2 mb-4'>
        <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-pitch-100 text-pitch-700'>
          <QrIcon size={18} />
        </div>
        <div className='min-w-0 flex-1'>
          <h2 className='font-semibold text-sm tracking-tight'>
            Comparte tu página de reservas
          </h2>
          <p className='text-xs text-(--color-text-muted) mt-0.5'>
            Tus clientes pueden escanear el QR o abrir el link para reservar.
          </p>
        </div>
      </div>

      {error && (
        <p className='text-sm text-(--color-danger) mb-3' role='alert'>
          {error}
        </p>
      )}

      <div className='flex flex-col sm:flex-row gap-5 items-center sm:items-start'>
        {/* QR code */}
        <div className='shrink-0'>
          <div className='rounded-xl border border-border bg-white p-3 shadow-sm'>
            <canvas
              ref={canvasRef}
              className='block w-50 h-50 sm:w-45 sm:h-45'
              aria-label={`Código QR para ${publicUrl}`}
              role='img'
            />
          </div>
        </div>

        {/* URL + acciones */}
        <div className='flex flex-col gap-3 w-full min-w-0 flex-1'>
          {/* URL display */}
          <div>
            <label className='text-xs font-medium text-(--color-text-muted) mb-1.5 block'>
              Link de tu página
            </label>
            <a
              href={publicUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800 hover:bg-green-100 hover:border-green-300 transition-colors touch-target w-full sm:w-auto'
              aria-label='Abrir página de reservas en nueva pestaña'
              title='Abre la página que ven tus clientes'
            >
              <span className='truncate flex-1 min-w-0'>{publicUrl}</span>
              <ExternalLinkIcon size={14} className='opacity-60' />
            </a>
          </div>

          {/* Acciones */}
          <div className='flex flex-col sm:flex-row gap-2'>
            <Button
              variant='secondary'
              size='sm'
              onClick={handleCopy}
              className='flex-1'
              aria-label='Copiar link'
            >
              {copied ? (
                <>
                  <CheckIcon size={16} />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <CopyIcon size={16} />
                  <span>Copiar link</span>
                </>
              )}
            </Button>
            <Button
              variant='secondary'
              size='sm'
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className='flex-1'
              aria-label='Descargar código QR'
            >
              <DownloadIcon size={16} />
              <span>Descargar QR</span>
            </Button>
          </div>

          {/* Sugerencia de uso */}
          <p className='text-xs text-(--color-text-muted) leading-relaxed'>
            Imprime el QR y pégalo en tu mostrador, mesa de recepción o
            publicidad. También puedes copiar el link y compartirlo por
            WhatsApp, Instagram o cualquier red social.
          </p>
        </div>
      </div>
    </Card>
  )
}
