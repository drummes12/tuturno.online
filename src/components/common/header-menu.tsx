import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'wouter'
import {
  LockIcon,
  LogOutIcon,
  MenuIcon,
  UserIcon
} from '@/components/common/icon'

interface HeaderMenuProps {
  isAdmin: boolean
  isPlatformAdmin: boolean
  businessSelector?: ReactNode
  nextPath: string
  notificationIcon: ReactNode
  notificationLabel: string
  userEmail?: string
  onSignOut: () => void
}

export function HeaderMenu({
  isAdmin,
  isPlatformAdmin,
  businessSelector,
  nextPath,
  notificationIcon,
  notificationLabel,
  userEmail,
  onSignOut
}: HeaderMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
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
  const encodedNextPath = encodeURIComponent(nextPath)

  return (
    <div ref={menuRef} className='relative shrink-0'>
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        className='inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/85 shadow-sm transition-[background-color,border-color,transform,color] hover:border-white/30 hover:bg-white/15 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flood-400 touch-target'
        aria-label='Más opciones'
        aria-haspopup='dialog'
        aria-expanded={open}
        title='Más opciones'
      >
        <MenuIcon open={open} size={18} />
      </button>

      {open && (
        <div
          className='absolute right-0 top-[calc(100%+0.5rem)] z-50 flex min-w-56 flex-col gap-1 rounded-xl border border-border bg-surface-elevated p-1.5 shadow-(--shadow-md) animate-popover-in'
          role='dialog'
          aria-label='Más opciones'
        >
          {userEmail && (
            <div className='border-b border-border px-3 pb-2 pt-1.5'>
              <span className='block truncate font-mono text-[11px] text-(--color-text-muted)'>
                {userEmail}
              </span>
            </div>
          )}

          {businessSelector && (
            <div className='flex flex-col gap-1.5 border-b border-border px-2 pb-2'>
              <span className='font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted'>
                Organización activa
              </span>
              {businessSelector}
            </div>
          )}

          <Link
            href={`/notificaciones?next=${encodedNextPath}`}
            onClick={close}
            className='flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--color-text) transition-colors hover:bg-surface-inset touch-target'
          >
            {notificationIcon}
            <span>{notificationLabel}</span>
          </Link>

          {isPlatformAdmin && (
            <Link
              href='/plataforma'
              onClick={close}
              className='flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--color-text) transition-colors hover:bg-surface-inset touch-target'
            >
              <LockIcon size={17} className='shrink-0 text-text-muted' />
              <span>Plataforma</span>
            </Link>
          )}

          {!isAdmin && (
            <Link
              href={`/preferencias?next=${encodedNextPath}`}
              onClick={close}
              className='flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--color-text) transition-colors hover:bg-surface-inset touch-target'
            >
              <UserIcon size={17} className='shrink-0 text-text-muted' />
              <span>Privacidad</span>
            </Link>
          )}

          <div className='my-1 h-px bg-border' />
          <button
            type='button'
            onClick={() => {
              close()
              void onSignOut()
            }}
            className='flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-signal-red/10 touch-target'
          >
            <LogOutIcon size={17} className='shrink-0' />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  )
}
