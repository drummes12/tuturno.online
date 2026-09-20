import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'wouter'
import {
  format,
  differenceInMinutes,
  isToday,
  isYesterday,
  parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'
import { useNotifications } from '@/hooks/use-notifications'
import {
  describeNotification,
  getNotificationState,
  getNotificationUrl,
  isNotificationUnread
} from '@/lib/notifications'
import { confirmReservation } from '@/services/reservations'
import { Alert } from '@/components/common/alert'
import { StatusBadge } from '@/components/common/badge'
import { Skeleton } from '@/components/common/skeleton'
import {
  ArrowRightIcon,
  BellIcon,
  CalendarPlusIcon,
  CheckIcon,
  ChevronRightIcon,
  SettingsIcon,
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

/** Cabecera de grupo por día: "Hoy", "Ayer", "20 sep". */
function dayLabel(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Hoy'
  if (isYesterday(date)) return 'Ayer'
  return format(date, 'd MMM', { locale: es })
}

function payloadText(n: AppNotification, key: string): string | null {
  const value = n.payload[key]
  return typeof value === 'string' && value ? value : null
}

/** "18:00 – 19:00" desde el payload; null si el evento no trae horario. */
function slotTime(n: AppNotification): string | null {
  const start = payloadText(n, 'starts_at')
  const end = payloadText(n, 'ends_at')
  if (!start) return null
  const startDate = parseISO(start)
  const dateLabel = format(startDate, 'EEE d MMM', { locale: es }).toUpperCase()
  const range = end
    ? `${format(startDate, 'HH:mm')} – ${format(parseISO(end), 'HH:mm')}`
    : format(startDate, 'HH:mm')
  return `${dateLabel} · ${range}`
}

type Filter = 'all' | 'unread' | 'pending'

/**
 * Fila deslizable (solo táctil): arrastrar a la izquierda revela la zona
 * de eliminar. El gesto muta transform directamente (sin re-renders);
 * el estado solo cambia al soltar. Un flick rápido también elimina,
 * aunque no supere el umbral de distancia.
 */
function SwipeableRow({
  onDelete,
  children
}: {
  onDelete: () => void
  children: ReactNode
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const start = useRef({ x: 0, y: 0, t: 0 })
  const deltaX = useRef(0)
  const swiping = useRef(false)
  const suppressClick = useRef(false)

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0]
    start.current = { x: touch.clientX, y: touch.clientY, t: Date.now() }
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
    const elapsed = Date.now() - start.current.t
    const velocity = Math.abs(deltaX.current) / Math.max(elapsed, 1)
    el.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
    if (deltaX.current < -el.offsetWidth * 0.35 || velocity > 0.5) {
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
        className='absolute inset-0 flex items-center justify-end gap-2 bg-danger px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white pointer-fine:hidden'
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
 * Glifo semántico por tipo de evento — inline, sin tile de fondo.
 */
function TypeGlyph({ type }: { type: string }) {
  if (type === 'reservation_confirmed') {
    return (
      <CheckIcon
        size={15}
        className='shrink-0 text-pitch-600 dark:text-pitch-300'
      />
    )
  }
  if (type === 'reservation_rejected') {
    return <XIcon size={15} className='shrink-0 text-signal-red' />
  }
  if (type.startsWith('reservation_cancelled')) {
    return <XIcon size={15} className='shrink-0 text-text-muted' />
  }
  if (type === 'reservation_expired') {
    return (
      <TimerIcon
        size={15}
        className='shrink-0 text-flood-600 dark:text-flood-400'
      />
    )
  }
  if (type.startsWith('reservation_created')) {
    return <CalendarPlusIcon size={15} className='shrink-0 text-signal-blue' />
  }
  return <BellIcon size={15} className='shrink-0 text-text-muted' />
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
    refresh,
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
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const touchActive = useRef(false)
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
      // Solo cerrar si el scroll ocurre fuera del panel y no hay
      // un gesto táctil en curso (el scroll residual de un swipe
      // vertical parcial no debe cerrar el centro).
      if (event.type === 'scroll' && touchActive.current) return
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

  /** Agrupa la lista filtrada por día para escanear el historial. */
  const groups = useMemo(() => {
    const map = new Map<string, AppNotification[]>()
    for (const n of filtered) {
      const label = dayLabel(n.created_at)
      const group = map.get(label)
      if (group) group.push(n)
      else map.set(label, [n])
    }
    return [...map.entries()]
  }, [filtered])

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

  /** Confirmar inline: solo para solicitudes pendientes del negocio. */
  async function handleConfirm(n: AppNotification) {
    if (!n.reservation_id) return
    setActionBusyId(n.id)
    setActionError(null)
    try {
      await confirmReservation(n.reservation_id)
      if (isNotificationUnread(n)) void markRead(n.id)
      void refresh()
    } catch {
      setActionError('No pudimos confirmar la reserva.')
    } finally {
      setActionBusyId(null)
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
              className='fixed inset-0 z-40 cursor-default bg-black/40 animate-backdrop-in sm:hidden'
            />
            <div
              ref={dialogRef}
              role='dialog'
              aria-label='Notificaciones'
              onTouchStart={() => {
                touchActive.current = true
              }}
              onTouchEnd={() => {
                touchActive.current = false
              }}
              onTouchCancel={() => {
                touchActive.current = false
              }}
              className='fixed inset-x-0 bottom-0 z-50 flex max-h-[72vh] flex-col overflow-hidden rounded-t-2xl pb-(--bottom-nav-height) sm:pb-0 border border-border bg-surface-elevated text-(--color-text) shadow-(--shadow-md) sm:inset-x-auto sm:max-h-[62vh] sm:w-[min(24rem,calc(100vw-2rem))] sm:rounded-xl animate-sheet-up sm:animate-popover-in'
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
              <div className='flex items-center justify-between gap-2 border-b border-border px-4 py-2.5'>
                <h2 className='text-[11px] font-semibold uppercase tracking-[0.14em] text-primary'>
                  Notificaciones
                </h2>
                <div className='flex items-center gap-1'>
                  <button
                    type='button'
                    onClick={() => void markAllRead()}
                    disabled={unreadCount === 0}
                    aria-label='Marcar todas leídas'
                    title='Marcar todas leídas'
                    className='flex h-7 w-7 items-center justify-center rounded-lg text-primary transition-[background-color,color,transform] hover:bg-surface-inset active:scale-95 disabled:cursor-not-allowed disabled:text-text-muted/40 disabled:hover:bg-transparent touch-target'
                  >
                    <CheckIcon size={14} />
                  </button>
                  <button
                    type='button'
                    onClick={() => void archiveRead()}
                    disabled={readCount === 0}
                    aria-label='Limpiar leídas'
                    title='Limpiar leídas'
                    className='flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-[background-color,color,transform] hover:bg-surface-inset hover:text-text active:scale-95 disabled:cursor-not-allowed disabled:text-text-muted/40 disabled:hover:bg-transparent touch-target'
                  >
                    <TrashIcon size={13} />
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
                    className={`min-w-max flex items-center justify-center flex-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-center text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
                      filter === key
                        ? 'bg-(--color-primary) text-on-primary'
                        : 'text-text-muted hover:text-text'
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
                {actionError && (
                  <div className='p-3 pb-0'>
                    <Alert variant='error'>{actionError}</Alert>
                  </div>
                )}
                {loading && notifications.length === 0 ? (
                  <div className='flex flex-col gap-3 p-4'>
                    <Skeleton className='h-16 w-full' />
                    <Skeleton className='h-16 w-full' />
                    <Skeleton className='h-16 w-full' />
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
                  groups.map(([label, items]) => (
                    <section key={label} aria-label={label}>
                      <h3 className='border-b border-border/60 bg-surface-inset/50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                        {label}
                      </h3>
                      <ul className='flex flex-col'>
                        {items.map((n) => {
                          const state = getNotificationState(n)
                          const { title, body } = describeNotification(n)
                          const businessName = payloadText(n, 'business_name')
                          const resourceName = payloadText(n, 'resource_name')
                          const reason = payloadText(n, 'reason')
                          const time = slotTime(n)
                          const url = getNotificationUrl(n)
                          const unread = isNotificationUnread(n)
                          const canConfirm =
                            n.type === 'reservation_created_business' &&
                            state === 'pending' &&
                            Boolean(n.reservation_id)
                          const busy = actionBusyId === n.id
                          return (
                            <li
                              key={n.id}
                              className='group border-b border-border/60'
                            >
                              <SwipeableRow onDelete={() => void archive(n.id)}>
                                <div className='relative bg-surface-elevated transition-colors hover:bg-surface-inset/70'>
                                  <button
                                    type='button'
                                    onClick={() => handleItemClick(n)}
                                    className='flex w-full min-w-0 flex-col px-4 pb-3 pt-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--color-primary) touch-target'
                                  >
                                    <span className='flex items-center justify-between gap-2'>
                                      <span
                                        className={`flex min-w-0 items-center gap-1.5 text-[13px] ${
                                          unread
                                            ? 'font-semibold'
                                            : 'font-medium text-(--color-text)/75'
                                        }`}
                                      >
                                        <TypeGlyph type={n.type} />
                                        {unread && (
                                          <span
                                            className='h-1.5 w-1.5 shrink-0 rounded-full bg-primary'
                                            aria-hidden='true'
                                          />
                                        )}
                                        <span className='truncate'>
                                          {title}
                                        </span>
                                      </span>
                                      <span className='shrink-0 text-[10px] tracking-wide text-text-muted/70 transition-opacity pointer-fine:group-hover:opacity-0'>
                                        {timeAgo(n.created_at)}
                                      </span>
                                    </span>
                                    {time && (
                                      <span className='mt-1.5 flex items-center justify-between gap-2'>
                                        <span className='text-[13px] font-semibold font-mono tracking-wide text-text'>
                                          {time}
                                        </span>
                                        {n.reservation_status && (
                                          <StatusBadge
                                            status={n.reservation_status}
                                            compact
                                          />
                                        )}
                                      </span>
                                    )}
                                    {!time && n.reservation_status && (
                                      <span className='mt-1.5 block'>
                                        <StatusBadge
                                          status={n.reservation_status}
                                          compact
                                        />
                                      </span>
                                    )}
                                    <span className='mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted'>
                                      {resourceName && (
                                        <span className='truncate font-medium text-text/80'>
                                          {resourceName}
                                        </span>
                                      )}
                                      {businessName && (
                                        <span className='truncate'>
                                          {businessName}
                                        </span>
                                      )}
                                      {n.reservation_number && (
                                        <span className='font-mono'>
                                          #{n.reservation_number}
                                        </span>
                                      )}
                                    </span>
                                    {reason && (
                                      <span className='mt-1.5 block border-l-2 border-border pl-2.5 text-xs italic leading-relaxed text-text-muted'>
                                        “{reason}”
                                      </span>
                                    )}
                                    {!time && (
                                      <span className='mt-1.5 line-clamp-2 block text-sm leading-relaxed text-text-muted'>
                                        {body}
                                      </span>
                                    )}
                                  </button>
                                  {(canConfirm ||
                                    (url && state === 'pending')) && (
                                    <div className='flex items-center gap-2.5 px-4 pb-3.5'>
                                      {canConfirm && (
                                        <button
                                          type='button'
                                          disabled={busy}
                                          onClick={() => void handleConfirm(n)}
                                          className='rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-primary shadow-sm transition-[background-color,transform] hover:opacity-90 active:scale-95 disabled:cursor-wait disabled:opacity-50'
                                        >
                                          {busy ? 'Confirmando…' : 'Confirmar'}
                                        </button>
                                      )}
                                      {url && (
                                        <button
                                          type='button'
                                          onClick={() => handleItemClick(n)}
                                          className='flex items-center gap-1 px-1 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted transition-[color,transform] hover:text-primary active:scale-95'
                                        >
                                          Revisar
                                          <ArrowRightIcon size={11} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  <button
                                    type='button'
                                    aria-label='Eliminar notificación'
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void archive(n.id)
                                    }}
                                    className='absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-md bg-surface-inset text-text-muted/70 opacity-0 transition-[color,background-color,opacity] hover:text-danger focus-visible:opacity-100 pointer-fine:flex pointer-fine:group-hover:opacity-100'
                                  >
                                    <XIcon size={14} />
                                  </button>
                                </div>
                              </SwipeableRow>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ))
                )}
              </div>

              <div className='border-t border-border'>
                <Link
                  href={settingsHref}
                  onClick={close}
                  className='group/link flex items-center justify-between gap-2 px-4 py-2.5 not-sm:mb-4 text-xs font-medium text-text-muted transition-colors hover:bg-surface-inset hover:text-text touch-target'
                >
                  <span className='flex items-center gap-2'>
                    <SettingsIcon size={14} />
                    Configurar avisos
                  </span>
                  <ChevronRightIcon
                    size={14}
                    className='transition-transform group-hover/link:translate-x-0.5'
                  />
                </Link>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
