import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNotifications } from '@/hooks/use-notifications'
import {
  describeNotification,
  getNotificationState,
  getNotificationUrl,
  isNotificationUnread,
  type NotificationState
} from '@/lib/notifications'
import { Alert } from '@/components/common/alert'
import { Badge } from '@/components/common/badge'
import { Skeleton } from '@/components/common/skeleton'
import {
  BellIcon,
  CheckIcon,
  ClockIcon,
  InboxIcon,
  XIcon
} from '@/components/common/icon'
import type { AppNotification } from '@/types'

type Filter = 'all' | 'unread' | 'pending'

const filterLabels: Record<Filter, string> = {
  all: 'Todas',
  unread: 'Sin leer',
  pending: 'Pendientes'
}

const stateBadge: Record<
  NotificationState,
  { label: string; variant: 'accent' | 'success' | 'neutral' }
> = {
  pending: { label: 'Pendiente', variant: 'accent' },
  unread: { label: 'Nueva', variant: 'success' },
  read: { label: 'Leída', variant: 'neutral' }
}

function StateIcon({ state }: { state: NotificationState }) {
  if (state === 'pending') {
    return (
      <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-700'>
        <ClockIcon size={16} />
      </span>
    )
  }
  if (state === 'unread') {
    return (
      <span className='relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pitch-100 text-primary'>
        <BellIcon size={16} />
        <span
          className='absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary'
          aria-hidden='true'
        />
      </span>
    )
  }
  return (
    <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-inset text-text-muted'>
      <CheckIcon size={16} />
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
  const rootRef = useRef<HTMLDivElement>(null)
  const [, navigate] = useLocation()

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const close = () => setOpen(false)

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
      return notifications.filter(
        (n) => getNotificationState(n) === 'pending'
      )
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
        type='button'
        onClick={() => setOpen((value) => !value)}
        className='relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/85 shadow-sm transition-[background-color,border-color,transform,color] hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flood-400 touch-target'
        aria-label={badgeLabel}
        aria-haspopup='dialog'
        aria-expanded={open}
        title='Notificaciones'
      >
        <BellIcon size={18} />
        {unreadCount > 0 && (
          <span
            className='absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-danger px-1 py-0.5 text-[10px] font-bold leading-none text-white'
            aria-hidden='true'
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop solo en mobile (bottom sheet) */}
          <button
            type='button'
            aria-label='Cerrar notificaciones'
            onClick={close}
            className='fixed inset-0 z-40 cursor-default bg-black/40 sm:hidden'
          />
          <div
            role='dialog'
            aria-label='Notificaciones'
            className='fixed inset-x-0 bottom-(--bottom-nav-height) z-50 flex max-h-[calc(80vh-var(--bottom-nav-height))] flex-col overflow-hidden rounded-t-2xl border border-border bg-surface-elevated text-(--color-text) shadow-(--shadow-md) sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:max-h-[70vh] sm:w-[min(24rem,calc(100vw-2rem))] sm:rounded-xl'
          >
            <div className='flex items-center justify-between gap-2 border-b border-border px-4 py-3'>
              <h2 className='text-sm font-semibold'>Notificaciones</h2>
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

            <div className='flex gap-1 border-b border-border px-3 py-2'>
              {(Object.keys(filterLabels) as Filter[]).map((key) => (
                <button
                  key={key}
                  type='button'
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors touch-target ${
                    filter === key
                      ? 'bg-(--color-primary) text-white'
                      : 'bg-surface-inset text-text-muted hover:text-text'
                  }`}
                >
                  {filterLabels[key]}
                  <span className='ml-1 opacity-70'>{counts[key]}</span>
                </button>
              ))}
            </div>

            <div className='flex-1 overflow-y-auto'>
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
                    return (
                      <li key={n.id}>
                        <div
                          className={`flex items-start gap-2 border-b border-border/60 px-2 py-1.5 ${
                            isNotificationUnread(n) ? 'bg-pitch-100/50' : ''
                          }`}
                        >
                          <button
                            type='button'
                            onClick={() => handleItemClick(n)}
                            className='flex min-w-0 flex-1 items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) touch-target'
                          >
                            <StateIcon state={state} />
                            <span className='min-w-0 flex-1'>
                              <span className='flex items-center gap-2'>
                                <span
                                  className={`truncate text-sm ${
                                    isNotificationUnread(n)
                                      ? 'font-semibold'
                                      : 'font-medium'
                                  }`}
                                >
                                  {title}
                                </span>
                                <Badge variant={stateBadge[state].variant}>
                                  {stateBadge[state].label}
                                </Badge>
                              </span>
                              <span className='mt-0.5 line-clamp-2 block text-sm text-text-muted'>
                                {body}
                              </span>
                              <span className='mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-text-muted'>
                                <span>
                                  {formatDistanceToNow(
                                    parseISO(n.created_at),
                                    { locale: es, addSuffix: true }
                                  )}
                                </span>
                                {businessName && (
                                  <>
                                    <span aria-hidden='true'>·</span>
                                    <span className='truncate'>
                                      {businessName}
                                    </span>
                                  </>
                                )}
                                {n.reservation_number && (
                                  <>
                                    <span aria-hidden='true'>·</span>
                                    <span>#{n.reservation_number}</span>
                                  </>
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
                            className='flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-inset hover:text-text touch-target'
                          >
                            <XIcon size={15} />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className='border-t border-border px-4 py-2'>
              <Link
                href={settingsHref}
                onClick={close}
                className='block rounded-lg px-2 py-2 text-center text-xs font-medium text-primary transition-colors hover:bg-surface-inset touch-target'
              >
                Configurar avisos push
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
