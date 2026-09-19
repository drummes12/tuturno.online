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

// Lado del PNG generado. A 2048px el download sirve para impresión y el
// preview (~200px CSS) queda nítido en pantallas de alta densidad.
const QR_CANVAS_SIZE = 2048
// Zona silenciosa mínima de la spec QR (módulos vacíos alrededor).
const QUIET_MODULES = 4
// Radio de los módulos como fracción del módulo (look "dots" premium).
const DOT_RADIUS = 0.4

/**
 * Carga el logo de TuTurno como HTMLImageElement, forzando al SVG a
 * rasterizarse en alta resolución. Si no, algunos navegadores lo
 * rasterizan a su tamaño intrínseco (300px) y escala borroso.
 * Devuelve null si no se puede cargar (el QR se genera sin logo).
 */
async function loadLogo(px: number): Promise<HTMLImageElement | null> {
  try {
    const response = await fetch('/logo-clock.svg')
    if (!response.ok) return null
    const svg = (await response.text()).replace(
      /<svg\b/,
      `<svg width="${px}" height="${px}"`
    )
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    return await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      img.src = url
    })
  } catch {
    return null
  }
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
 * Dibuja un "ojo" del QR (finder pattern): anillo redondeado de 7×7
 * módulos con pupila de 3×3 centrada.
 */
function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  module: number
): void {
  const outer = module * 7
  ctx.lineWidth = module
  roundedRect(
    ctx,
    x + module / 2,
    y + module / 2,
    outer - module,
    outer - module,
    module * 1.5
  )
  ctx.stroke()

  const pupil = module * 3
  const pupilOffset = (outer - pupil) / 2
  roundedRect(ctx, x + pupilOffset, y + pupilOffset, pupil, pupil, module * 0.9)
  ctx.fill()
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

  // Generar QR estilizado: módulos redondeados, ojos custom y el logo de
  // TuTurno centrado. Se usa errorCorrectionLevel 'H' (alto, ~30% de
  // redundancia) para que siga escaneable aunque el logo tape módulos.
  // El contenido es solo la URL — compatible con los QR ya impresos.
  useEffect(() => {
    let cancelled = false
    async function generate() {
      const canvas = canvasRef.current
      if (!canvas) return
      try {
        const qr = QRCode.create(publicUrl, { errorCorrectionLevel: 'H' })
        const moduleCount = qr.modules.size

        canvas.width = QR_CANVAS_SIZE
        canvas.height = QR_CANVAS_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          if (!cancelled) setQrDataUrl(canvas.toDataURL('image/png'))
          return
        }

        // Escala entera: cada módulo cae en píxeles exactos. Sin esto los
        // bordes antialiased dificultan la binarización de los lectores.
        const scale = Math.floor(
          QR_CANVAS_SIZE / (moduleCount + QUIET_MODULES * 2)
        )
        const offset = Math.floor((QR_CANVAS_SIZE - scale * moduleCount) / 2)
        const inEye = (row: number, col: number) =>
          (row < 7 && col < 7) ||
          (row < 7 && col >= moduleCount - 7) ||
          (row >= moduleCount - 7 && col < 7)

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, QR_CANVAS_SIZE, QR_CANVAS_SIZE)
        ctx.fillStyle = '#04210f' // pitch-900
        ctx.strokeStyle = '#04210f'

        // Módulos de datos a tamaño completo con esquinas redondeadas:
        // se fusionan donde se tocan (look fluido) sin dejar huecos que
        // rompan la lectura. Un gap entre módulos hace fallar a jsQR.
        for (let row = 0; row < moduleCount; row++) {
          for (let col = 0; col < moduleCount; col++) {
            if (!qr.modules.get(row, col) || inEye(row, col)) continue
            roundedRect(
              ctx,
              offset + col * scale,
              offset + row * scale,
              scale,
              scale,
              scale * DOT_RADIUS
            )
            ctx.fill()
          }
        }

        drawEye(ctx, offset, offset, scale)
        drawEye(ctx, offset + (moduleCount - 7) * scale, offset, scale)
        drawEye(ctx, offset, offset + (moduleCount - 7) * scale, scale)

        // Logo centrado con fondo blanco para contraste
        const logo = await loadLogo(Math.round(QR_CANVAS_SIZE * 0.24))
        if (cancelled) return
        if (logo) {
          const box = QR_CANVAS_SIZE * 0.26
          const boxX = (QR_CANVAS_SIZE - box) / 2
          const padding = box * 0.09
          ctx.fillStyle = '#ffffff'
          roundedRect(ctx, boxX, boxX, box, box, box * 0.22)
          ctx.fill()
          ctx.drawImage(
            logo,
            boxX + padding,
            boxX + padding,
            box - padding * 2,
            box - padding * 2
          )
        }

        if (!cancelled) setQrDataUrl(canvas.toDataURL('image/png'))
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
        <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-pitch-100 text-pitch-700 dark:bg-pitch-500/15 dark:text-pitch-300'>
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
              className='inline-flex items-center justify-center gap-2 rounded-lg border border-pitch-600/30 bg-pitch-100 px-4 py-2.5 text-sm font-medium text-pitch-800 hover:bg-pitch-200 dark:bg-pitch-500/15 dark:text-pitch-300 dark:border-pitch-500/30 dark:hover:bg-pitch-500/25 transition-colors touch-target w-full sm:w-auto'
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
