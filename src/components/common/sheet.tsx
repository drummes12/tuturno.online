import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type RefObject
} from 'react'

/**
 * Bottom-sheet compartido de la app. Entrega el backdrop, el panel con
 * rol dialog y toda la accesibilidad: bloqueo del scroll del body,
 * Escape para cerrar, focus trap (Tab), autofocus al abrir y foco de
 * regreso al cerrar. En móvil la fila del grabber permite arrastrar el
 * panel hacia abajo para cerrarlo (gesto estilo iOS): el panel sigue el
 * dedo y cierra al soltar si pasó el 33% de su alto o si el gesto fue
 * un fling (>0.6 px/ms); si no, regresa con transición.
 *
 * Los callers montan el componente dentro de su propio createPortal y
 * le dan la clase del panel (layout/look por sheet). Para cerrar hay
 * que llamar `onClose` real solo al terminar la animación — interno.
 */

const CLOSE_MS = 260
// Debajo del breakpoint sm el sheet es bottom-sheet con drag.
const PHONE_QUERY = '(max-width: 639px)'

interface SheetProps {
  onClose: () => void
  /** Children ya sea estáticos o función que recibe requestClose —
   *  usarlo en el botón X para que también anime el cierre. */
  children: ReactNode | ((close: () => void) => ReactNode)
  /** Clases del panel (layout, fondo, tamaño por sheet). */
  className?: string
  labelledBy?: string
  describedBy?: string
  /** aria-label cuando no hay título con id (ej. métricas). */
  label?: string
  /** Elemento a enfocar al abrir; por defecto [data-autofocus] o el
   *  primer focusable. */
  initialFocusRef?: RefObject<HTMLElement | null>
}

export function Sheet({
  onClose,
  children,
  className = '',
  labelledBy,
  describedBy,
  label,
  initialFocusRef
}: SheetProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const dragRef = useRef<{
    startY: number
    samples: Array<{ t: number; y: number }>
  } | null>(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // requestClose dispara la animación de salida; el onClose real llega
  // cuando termina, así el sheet no desaparece de golpe al soltar.
  const requestClose = useCallback(() => setClosing(true), [])

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => onCloseRef.current(), CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [closing])

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      const target =
        initialFocusRef?.current ??
        dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]') ??
        dialogRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      target?.focus()
    }, 0)

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
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
      previousFocusRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestClose])

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      !window.matchMedia(PHONE_QUERY).matches ||
      (event.target as HTMLElement).closest('button')
    )
      return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      startY: event.clientY,
      samples: [{ t: event.timeStamp, y: event.clientY }]
    }
    if (dialogRef.current) {
      dialogRef.current.style.transition = 'none'
      dialogRef.current.style.animation = 'none'
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = dragRef.current
    const panel = dialogRef.current
    if (!state || !panel) return
    const offset = Math.max(0, event.clientY - state.startY)
    panel.style.transform = `translateY(${offset}px)`
    state.samples.push({ t: event.timeStamp, y: event.clientY })
    if (state.samples.length > 6) state.samples.shift()
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const state = dragRef.current
    const panel = dialogRef.current
    dragRef.current = null
    if (!state || !panel) return
    const first = state.samples[0]
    const elapsed = Math.max(1, event.timeStamp - first.t)
    const velocity = (event.clientY - first.y) / elapsed
    const distance = event.clientY - state.startY
    panel.style.transition = ''
    panel.style.animation = ''
    panel.style.transform = ''
    if (
      distance > panel.offsetHeight * 0.33 ||
      (velocity > 0.6 && distance > 12)
    )
      requestClose()
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm animate-backdrop-in data-[state=closing]:animate-backdrop-out sm:items-center sm:p-6'
      data-state={closing ? 'closing' : 'open'}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <section
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-label={label}
        className={`${className} animate-sheet-up data-[state=closing]:animate-sheet-down sm:animate-fade-up`}
        data-state={closing ? 'closing' : 'open'}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className='flex touch-none cursor-grab justify-center py-2.5 sm:hidden active:cursor-grabbing'
          aria-hidden='true'
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className='h-1 w-10 rounded-full bg-graphite-200' />
        </div>
        {typeof children === 'function' ? children(requestClose) : children}
      </section>
    </div>
  )
}
