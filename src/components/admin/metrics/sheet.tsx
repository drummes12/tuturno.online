import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Shell de bottom-sheet para las vistas ampliadas del dashboard
 * (filtros, heatmap, lista de clientes). Mismo patrón que
 * ReservationDetailsSheet: backdrop, panel redondeado y Escape para cerrar.
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
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      prevActive?.focus()
    }
  }, [onClose])

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
        aria-label={title}
        className='flex w-full max-h-[min(92dvh,760px)] flex-col overflow-hidden rounded-t-3xl bg-surface-elevated shadow-(--shadow-lg) animate-sheet-up sm:max-w-2xl sm:rounded-3xl sm:animate-fade-up'
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className='flex justify-center pt-2.5 sm:hidden'
          aria-hidden='true'
        >
          <span className='h-1 w-10 rounded-full bg-graphite-200' />
        </div>
        <header className='flex items-center justify-between px-5 pt-4 pb-3'>
          <h2 className='text-sm font-semibold tracking-tight'>{title}</h2>
          <button
            type='button'
            onClick={onClose}
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
      </section>
    </div>,
    document.body
  )
}
