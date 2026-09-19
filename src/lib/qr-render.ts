import QRCode from 'qrcode'

// Lado del PNG generado. A 2048px el download sirve para impresión y el
// preview (~200px CSS) queda nítido en pantallas de alta densidad.
export const QR_CANVAS_SIZE = 2048
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
 * Renderiza el QR estilizado del negocio sobre un canvas: módulos
 * redondeados, ojos custom y el logo de TuTurno centrado.
 * Se usa errorCorrectionLevel 'H' (alto, ~30% de redundancia) para que
 * siga escaneable aunque el logo tape módulos.
 *
 * Notas de escaneabilidad (verificadas con jsQR):
 * - Escala entera por módulo: sin esto los bordes antialiased dificultan
 *   la binarización de los lectores.
 * - Módulos a tamaño completo: se fusionan donde se tocan sin dejar
 *   huecos. Un gap entre módulos hace fallar a lectores estrictos.
 */
export async function renderBusinessQr(
  canvas: HTMLCanvasElement,
  url: string
): Promise<void> {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const moduleCount = qr.modules.size

  canvas.width = QR_CANVAS_SIZE
  canvas.height = QR_CANVAS_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const scale = Math.floor(QR_CANVAS_SIZE / (moduleCount + QUIET_MODULES * 2))
  const offset = Math.floor((QR_CANVAS_SIZE - scale * moduleCount) / 2)
  const inEye = (row: number, col: number) =>
    (row < 7 && col < 7) ||
    (row < 7 && col >= moduleCount - 7) ||
    (row >= moduleCount - 7 && col < 7)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, QR_CANVAS_SIZE, QR_CANVAS_SIZE)
  ctx.fillStyle = '#04210f' // pitch-900
  ctx.strokeStyle = '#04210f'

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

  const logo = await loadLogo(Math.round(QR_CANVAS_SIZE * 0.24))
  if (!logo) return

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
