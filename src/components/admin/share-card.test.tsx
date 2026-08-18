import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock de qrcode — no necesitamos generar QR real en tests
const { mockToCanvas } = vi.hoisted(() => ({
  mockToCanvas: vi.fn(() => Promise.resolve())
}))
vi.mock('qrcode', () => ({
  default: {
    toCanvas: mockToCanvas
  }
}))

import { ShareCard } from '@/components/admin/share-card'

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom no implementa toDataURL ni getContext en canvas
  HTMLCanvasElement.prototype.toDataURL = vi.fn(
    () => 'data:image/png;base64,mock'
  )
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: '',
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    drawImage: vi.fn()
  })) as any
  // Mock de Image para que el logo "cargue" inmediatamente
  Object.defineProperty(global, 'Image', {
    value: class MockImage {
      crossOrigin = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      private _src = ''
      set src(value: string) {
        this._src = value
        // Simular carga exitosa asíncrona
        setTimeout(() => this.onload?.(), 0)
      }
      get src() {
        return this._src
      }
    },
    writable: true,
    configurable: true
  })
  // window.location.origin en jsdom
  Object.defineProperty(window, 'location', {
    value: {
      ...window.location,
      origin: 'https://tuturno.online'
    },
    writable: true
  })
})

describe('ShareCard', () => {
  it('muestra el título y la descripción', () => {
    render(<ShareCard slug='mi-negocio' />)
    expect(
      screen.getByText('Comparte tu página de reservas')
    ).toBeInTheDocument()
  })

  it('construye la URL pública con el slug', () => {
    render(<ShareCard slug='new-business' />)
    expect(
      screen.getByText('https://tuturno.online/b/new-business')
    ).toBeInTheDocument()
  })

  it('muestra el link para abrir en nueva pestaña', () => {
    render(<ShareCard slug='demo' />)
    const openLink = screen.getByLabelText(
      'Abrir página de reservas en nueva pestaña'
    )
    expect(openLink).toHaveAttribute('href', 'https://tuturno.online/b/demo')
    expect(openLink).toHaveAttribute('target', '_blank')
  })

  it('renderiza el canvas para el QR', () => {
    render(<ShareCard slug='test' />)
    const canvas = screen.getByRole('img', {
      name: /Código QR para/
    })
    expect(canvas).toBeInTheDocument()
    expect(canvas.tagName).toBe('CANVAS')
  })

  it('llama a QRCode.toCanvas con errorCorrectionLevel H (alto)', async () => {
    render(<ShareCard slug='test' />)
    await vi.waitFor(() => {
      expect(mockToCanvas).toHaveBeenCalledWith(
        expect.anything(),
        'https://tuturno.online/b/test',
        expect.objectContaining({
          width: 256,
          margin: 2,
          errorCorrectionLevel: 'H'
        })
      )
    })
  })

  it('tiene botón de copiar link', () => {
    render(<ShareCard slug='test' />)
    expect(screen.getByLabelText('Copiar link')).toBeInTheDocument()
  })

  it('tiene botón de descargar QR', () => {
    render(<ShareCard slug='test' />)
    expect(screen.getByLabelText('Descargar código QR')).toBeInTheDocument()
  })

  it('copia el link al portapapeles al presionar el botón', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true
    })

    render(<ShareCard slug='copiable' />)
    await user.click(screen.getByLabelText('Copiar link'))

    expect(writeText).toHaveBeenCalledWith('https://tuturno.online/b/copiable')
  })

  it('muestra "¡Copiado!" después de copiar', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.resolve() },
      writable: true,
      configurable: true
    })

    render(<ShareCard slug='test' />)
    await user.click(screen.getByLabelText('Copiar link'))

    expect(screen.getByText('¡Copiado!')).toBeInTheDocument()
  })

  it('muestra la sugerencia de uso', () => {
    render(<ShareCard slug='test' />)
    expect(
      screen.getByText(/Imprime el QR y pégalo en tu mostrador/)
    ).toBeInTheDocument()
  })
})
