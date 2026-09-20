import { Component, type ReactNode } from 'react'
import { Button } from '@/components/common/button'
import { RefreshIcon, WifiOffIcon } from '@/components/common/icon'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

/**
 * Atrapa fallos de renderizado de rutas — el caso típico es un chunk
 * lazy que no se pudo descargar (offline o red intermitente). Sin
 * boundary, React desmonta el árbol con un error en crudo; aquí se
 * muestra un fallback de marca con reintento.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('[TuTurno] Ruta no pudo cargarse:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div
        role='alert'
        className='flex flex-col items-center justify-center gap-4 py-16 text-center animate-fade-up'
      >
        <WifiOffIcon
          size={32}
          className='text-text-muted'
          aria-hidden='true'
        />
        <div className='flex flex-col gap-1'>
          <h2 className='text-lg font-bold'>No pudimos cargar esta vista</h2>
          <p className='max-w-xs text-sm text-(--color-text-muted)'>
            Puede ser un corte de conexión. Revisa tu red e intenta de
            nuevo.
          </p>
        </div>
        <Button
          variant='secondary'
          onClick={() => {
            this.setState({ failed: false })
            window.location.reload()
          }}
        >
          <RefreshIcon size={16} />
          Reintentar
        </Button>
      </div>
    )
  }
}
