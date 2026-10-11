import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Sheet } from '@/components/common/sheet'

/**
 * Shell de bottom-sheet para las vistas ampliadas del dashboard
 * (filtros, heatmap, lista de clientes). Usa el Sheet común: backdrop,
 * panel redondeado, Escape, focus trap y drag-to-close en móvil.
 */
export function MetricsSheet({
  title,
  onClose,
  children
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return createPortal(
    <Sheet
      onClose={onClose}
      label={title}
      className='flex w-full max-h-[min(92dvh,760px)] flex-col overflow-hidden rounded-t-3xl bg-surface-elevated shadow-(--shadow-lg) sm:max-w-2xl sm:rounded-3xl'
    >
      {(requestClose) => (
        <>
          <header className='flex items-center justify-between px-5 pt-4 pb-3'>
            <h2 className='text-sm font-semibold tracking-tight'>{title}</h2>
            <button
              type='button'
              onClick={requestClose}
              aria-label='Cerrar'
              className='flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-inset hover:text-(--color-text) touch-target'
            >
              <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={1.75}
                strokeLinecap='round'
                width={18}
                height={18}
                aria-hidden
              >
                <line x1='6' y1='6' x2='18' y2='18' />
                <line x1='18' y1='6' x2='6' y2='18' />
              </svg>
            </button>
          </header>
          <div className='min-h-0 flex-1 overflow-y-auto px-5 pb-6'>
            {children}
          </div>
        </>
      )}
    </Sheet>,
    document.body
  )
}
