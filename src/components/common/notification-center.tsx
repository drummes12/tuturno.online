import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'wouter'
import { format, differenceInMinutes, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNotifications } from '@/hooks/use-notifications'
import {
  describeNotification,
  getNotificationState,
  getNotificationUrl,
  isNotificationUnread
} from '@/lib/notifications'
import { Alert } from '@/components/common/alert'
import { Badge } from '@/components/common/badge'
import { Skeleton } from '@/components/common/skeleton'
import {
  BellIcon,
  CalendarPlusIcon,
  CheckIcon,
  TimerIcon,
  TrashIcon,
  InboxIcon,
  XIcon
} from '@/components/common/icon'
import type { AppNotification } from '@/types'

/** Tiempo relativo compacto: "2 min", "5 h", "3 d", "12 sep". */
function timeAgo(dateStr: string): string {
  const mins = differenceInMinutes(new Date(), parseISO(dateStr))
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d`
  return format(parseISO(dateStr), 'd MMM', { locale: es })
}

type Filter = 'all' | 'unread' | 'pending'

/**
 * Fila deslizable (solo táctil): arrastrar a la izquierda revela la zona
 * de eliminar. El gesto muta transform directamente (sin re-renders);
 * el estado solo cambia al soltar.
 */
function SwipeableRow({
  onDelete,
  children
}: {
  onDelete: () => void
  children: ReactNode
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const start = useRef({ x: 0, y: 0 })
  const deltaX = useRef(0)
  const swiping = useRef(false)
  const suppressClick = useRef(false)

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0]
    start.current = { x: touch.clientX, y: touch.clientY }
    deltaX.current = 0
    swiping.current = false
    if (rowRef.current) rowRef.current.style.transition = 'none'
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0]
    const dx = touch.clientX - start.current.x
    const dy = touch.clientY - start.current.y
    if (!swiping.current) {
      // Intención horizontal clara: no competir con el scroll vertical
      if (Math.abs(dx) < 10 || Math.abs(dx) <= Math.abs(dy)) return
      swiping.current = true
    }
    deltaX.current = Math.min(0, dx)
    rowRef.current?.style.setProperty(
      'transform',
      `translateX(${deltaX.current}px)`
    )
  }

  function handleTouchEnd() {
    const el = rowRef.current
    if (!swiping.current || !el) return
    suppressClick.current = true
    el.style.transition = 'transform 0.25s ease'
    if (deltaX.current < -el.offsetWidth * 0.35) {
      el.style.transform = `translateX(-${el.offsetWidth}px)`
      el.addEventListener('transitionend', () => onDelete(), { once: true })
    } else {
      el.style.transform = 'translateX(0)'
    }
    swiping.current = false
    deltaX.current = 0
  }

  return (
    <div className='relative overflow-hidden'>
      <div
        className='absolute inset-0 flex items-center justify-end gap-2 bg-danger px-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white'
        aria-hidden='true'
      >
        <TrashIcon size={15} />
        Eliminar
      </div>
      <div
        ref={rowRef}
        className='relative'
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault()
            event.stopPropagation()
            suppressClick.current = false
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}

const filterLabels: Record<Filter, string> = {
  all: 'Todas',
  unread: 'Sin leer',
  pending: 'Pendientes'
}

/**
 * Icono semántico por tipo de evento — el estado (leída/pendiente)
 * se comunica con peso tipográfico y el punto, no con el icono.
 */
function TypeIcon({ type }: { type: string }) {
  const base = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'
  if (type === 'reservation_confirmed') {
    return (
      <span
        className={`${base} bg-pitch-500/15 text-pitch-700 dark:text-pitch-300`}
      >
        <CheckIcon size={16} />
      </span>
    )
  }
  if (type === 'reservation_rejected') {
    return (
      <span
        className={`${base} bg-signal-red/10 text-signal-red dark:text-red-300`}
      >
        <XIcon size={16} />
      </span>
    )
  }
  if (type.startsWith('reservation_cancelled')) {
    return (
      <span className={`${base} bg-surface-inset text-text-muted`}>
        <XIcon size={16} />
      </span>
    )
  }
  if (type === 'reservation_expired') {
    return (
      <span
        className={`${base} bg-flood-500/15 text-yellow-700 dark:text-flood-300`}
      >
        <TimerIcon size={16} />
      </span>
    )
  }
  if (type.startsWith('reservation_created')) {
    return (
      <span
        className={`${base} bg-signal-blue/10 text-signal-blue dark:text-blue-300`}
      >
        <CalendarPlusIcon size={16} />
      </span>
    )
  }
  return (
    <span className={`${base} bg-surface-inset text-text-muted`}>
      <BellIcon size={16} />
    </span>
  )
}

interface NotificationCenterProps {
  userId: string
  settingsHref: string
}

export function NotificationCenter({
  userId,
  settingsHref
}: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    archive,
    archiveRead
  } = useNotifications(userId)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(
    null
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [, navigate] = useLocation()

  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (
        !rootRef.current?.contains(target) &&
        !dialogRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    function handleViewportChange(event: Event) {
      // Solo cerrar si el scroll ocurre fuera del panel
      if (
        event.type === 'scroll' &&
        dialogRef.current?.contains(event.target as Node)
      ) {
        return
      }
      setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [open])

  const counts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter(isNotificationUnread).length,
      pending: notifications.filter(
        (n) => getNotificationState(n) === 'pending'
      ).length
    }),
    [notifications]
  )

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter(isNotificationUnread)
    if (filter === 'pending') {
      return notifications.filter((n) => getNotificationState(n) === 'pending')
    }
    return notifications
  }, [filter, notifications])

  const readCount = counts.all - counts.unread
  const badgeLabel =
    unreadCount > 0
      ? `Notificaciones, ${unreadCount} sin leer`
      : 'Notificaciones'

  function handleItemClick(n: AppNotification) {
    if (isNotificationUnread(n)) void markRead(n.id)
    const url = getNotificationUrl(n)
    if (url) {
      close()
      navigate(url)
    }
  }

  const emptyMessages: Record<Filter, string> = {
    all: 'No tienes notificaciones',
    unread: 'Todo leído',
    pending: 'Nada pendiente'
  }

  return (
    <div ref={rootRef} className='relative shrink-0'>
      <button
        ref={bellRef}
        type='button'
        onClick={() => {
          if (!open && bellRef.current) {
            const r = bellRef.current.getBoundingClientRect()
            setAnchor({ top: r.bottom + 8, right: window.innerWidth - r.right })
          }
          setOpen((value) => !value)
        }}
        className='relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/85 shadow-sm transition-[background-color,border-color,transform,color] hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flood-400 touch-target'
        aria-label={badgeLabel}
        aria-haspopup='dialog'
        aria-expanded={open}
        title='Notificaciones'
      >
        <BellIcon size={18} />
        {unreadCount > 0 && (
          <span
            className='absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-danger px-1 aspect-square text-[10px] font-bold leading-none text-white'
            aria-hidden='true'
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <>
            {/* Backdrop solo en mobile (bottom sheet) */}
            <button
              type='button'
              aria-label='Cerrar notificaciones'
              onClick={close}
              className='fixed inset-0 z-40 cursor-default bg-black/40 sm:hidden'
            />
            <div
              ref={dialogRef}
              role='dialog'
              aria-label='Notificaciones'
              className='fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-t-2xl pb-(--bottom-nav-height) sm:pb-0 border border-border bg-surface-elevated text-(--color-text) shadow-(--shadow-md) sm:inset-x-auto sm:max-h-[70vh] sm:w-[min(24rem,calc(100vw-2rem))] sm:rounded-xl animate-sheet-up sm:animate-popover-in'
              style={
                anchor && window.matchMedia('(min-width: 640px)').matches
                  ? {
                      top: anchor.top,
                      right: anchor.right,
                      bottom: 'auto',
                      left: 'auto'
                    }
                  : undefined
              }
            >
              <div
                className='flex shrink-0 justify-center pt-2.5 sm:hidden'
                aria-hidden='true'
              >
                <span className='h-1.5 w-12 rounded-full bg-graphite-200 dark:bg-white/15' />
              </div>
              <div className='flex items-center justify-between gap-2 border-b border-border px-4 py-3'>
                <h2 className='font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary'>
                  Notificaciones
                </h2>
                <div className='flex items-center gap-3'>
                  <button
                    type='button'
                    onClick={() => void markAllRead()}
                    disabled={unreadCount === 0}
                    className='text-xs font-medium text-primary transition-colors hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline'
                  >
                    Marcar todas leídas
                  </button>
                  <button
                    type='button'
                    onClick={() => void archiveRead()}
                    disabled={readCount === 0}
                    className='text-xs font-medium text-primary transition-colors hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline'
                  >
                    Limpiar leídas
                  </button>
                </div>
              </div>

              <div className='scrollbar-none flex gap-1 overflow-x-auto border-b border-border px-3 py-2'>
                {(Object.keys(filterLabels) as Filter[]).map((key) => (
                  <button
                    key={key}
                    type='button'
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                    className={`min-w-max flex items-center justify-center flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors ${
                      filter === key
                        ? 'bg-(--color-primary) text-white'
                        : 'bg-surface-inset text-text-muted hover:text-text'
                    }`}
                  >
                    {filterLabels[key]}
                    <span className='opacity-70'> · {counts[key]}</span>
                  </button>
                ))}
              </div>

              <div className='h-96 max-h-[55dvh] overflow-y-auto scrollbar-gutter-stable'>
                {error && (
                  <div className='p-3'>
                    <Alert variant='error'>{error}</Alert>
                  </div>
                )}
                {loading && notifications.length === 0 ? (
                  <div className='flex flex-col gap-3 p-4'>
                    <Skeleton className='h-14 w-full' />
                    <Skeleton className='h-14 w-full' />
                    <Skeleton className='h-14 w-full' />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className='flex flex-col items-center gap-2 px-4 py-10 text-center'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-inset text-text-muted'>
                      <InboxIcon size={24} />
                    </div>
                    <p className='text-sm text-text-muted'>
                      {emptyMessages[filter]}
                    </p>
                  </div>
                ) : (
                  <ul className='flex flex-col'>
                    {filtered.map((n) => {
                      const state = getNotificationState(n)
                      const { title, body } = describeNotification(n)
                      const businessName =
                        typeof n.payload.business_name === 'string'
                          ? n.payload.business_name
                          : null
                      const unread = isNotificationUnread(n)
                      return (
                        <li
                          key={n.id}
                          className='group border-b border-border/60'
                        >
                          <SwipeableRow onDelete={() => void archive(n.id)}>
                            <div
                              className={`flex items-stretch gap-0.5 transition-colors ${
                                unread
                                  ? 'bg-pitch-100 group-hover:bg-pitch-200 dark:bg-pitch-900 dark:group-hover:bg-pitch-800'
                                  : 'bg-surface-elevated group-hover:bg-surface-inset'
                              }`}
                            >
                              <button
                                type='button'
                                onClick={() => handleItemClick(n)}
                                className='flex min-w-0 flex-1 items-start gap-3 rounded-l-lg px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) touch-target'
                              >
                                <TypeIcon type={n.type} />
                                <span className='min-w-0 flex-1'>
                                  <span className='flex items-baseline justify-between gap-2'>
                                    <span
                                      className={`flex min-w-0 items-center gap-1.5 text-sm ${
                                        unread
                                          ? 'font-semibold'
                                          : 'font-medium text-(--color-text)/85'
                                      }`}
                                    >
                                      {unread && (
                                        <span
                                          className='h-1.5 w-1.5 shrink-0 rounded-full bg-primary'
                                          aria-hidden='true'
                                        />
                                      )}
                                      <span className='truncate'>{title}</span>
                                    </span>
                                    <span className='shrink-0 font-mono text-[10px] tracking-wide text-text-muted/70'>
                                      {timeAgo(n.created_at)}
                                    </span>
                                  </span>
                                  <span className='mt-0.5 line-clamp-2 block text-sm text-text-muted'>
                                    {body}
                                  </span>
                                  <span className='mt-1.5 flex items-center gap-1.5 text-xs text-text-muted'>
                                    {state === 'pending' && (
                                      <Badge variant='accent'>Pendiente</Badge>
                                    )}
                                    {businessName && (
                                      <span className='truncate'>
                                        {businessName}
                                      </span>
                                    )}
                                    {n.reservation_number && (
                                      <span className='font-mono'>
                                        · #{n.reservation_number}
                                      </span>
                                    )}
                                  </span>
                                </span>
                              </button>
                              <button
                                type='button'
                                aria-label='Eliminar notificación'
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void archive(n.id)
                                }}
                                className='relative flex w-11 shrink-0 items-center justify-center self-stretch text-text-muted/50 transition-colors duration-300 before:absolute before:inset-0 before:bg-linear-to-l before:from-danger/30 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:text-danger hover:before:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                              >
                                <XIcon size={15} />
                              </button>
                            </div>
                          </SwipeableRow>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className='border-t border-border p-2'>
                <Link
                  href={settingsHref}
                  onClick={close}
                  className='flex items-center justify-center rounded-lg p-2 text-center text-xs font-medium text-primary transition-colors hover:bg-surface-inset touch-target'
                >
                  Configurar avisos push
                </Link>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
