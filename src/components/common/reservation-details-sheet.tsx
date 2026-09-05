import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { differenceInMinutes } from 'date-fns'
import type { ReactNode } from 'react'
import type { Reservation } from '@/types'
import { StatusBadge } from '@/components/common/badge'
import {
  CalendarIcon,
  ClockIcon,
  MailIcon,
  PhoneIcon,
  ResourceIcon,
  UserIcon,
  WhatsAppIcon,
  XIcon
} from '@/components/common/icon'
import { formatLocal } from '@/lib/time'

type ReservationDetailsSheetProps = {
  reservation: Reservation
  onClose: () => void
  resourceLabel?: string
  whatsappHref?: string | null
  actions?: ReactNode
}

type DetailRowProps = {
  icon: ReactNode
  label: string
  children: ReactNode
}

function DetailRow({ icon, label, children }: DetailRowProps) {
  return (
    <div className='flex items-start gap-3 py-3 first:pt-0 last:pb-0'>
      <span className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-text-muted'>
        {icon}
      </span>
      <div className='min-w-0 flex-1'>
        <p className='text-xs font-medium uppercase tracking-wide text-text-muted'>
          {label}
        </p>
        <div className='mt-0.5 text-sm text-(--color-text)'>{children}</div>
      </div>
    </div>
  )
}

function formatDuration(reservation: Reservation): string {
  const minutes = differenceInMinutes(
    new Date(reservation.ends_at),
    new Date(reservation.starts_at)
  )
  return `${minutes} min`
}

export function ReservationDetailsSheet({
  reservation,
  onClose,
  resourceLabel = 'Recurso',
  whatsappHref,
  actions
}: ReservationDetailsSheetProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 0)

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
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
  }, [onClose])

  const clientName =
    reservation.client?.name ??
    reservation.profile?.full_name ??
    'Cliente sin nombre'
  const phone = reservation.client?.phone ?? reservation.profile?.phone
  const email = reservation.client?.email
  const hasAccount = Boolean(reservation.client?.user_id ?? reservation.user_id)
  const resourceName = reservation.resource?.name ?? resourceLabel

  return createPortal(
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6'
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby='reservation-details-title'
        aria-describedby='reservation-details-description'
        className='flex w-full max-h-[min(88dvh,760px)] flex-col overflow-hidden rounded-t-2xl bg-surface-elevated shadow-(--shadow-lg) animate-sheet-up sm:max-w-2xl sm:rounded-3xl sm:animate-fade-up'
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className='flex shrink-0 justify-center pt-3 sm:hidden'
          aria-hidden='true'
        >
          <span className='h-1.5 w-12 rounded-full bg-graphite-200' />
        </div>

        <div className='flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-4 sm:px-7 sm:pt-7'>
          <div className='min-w-0'>
            <p className='text-xs font-semibold uppercase tracking-[0.14em] text-primary'>
              Detalle de reserva
            </p>
            <h2
              id='reservation-details-title'
              className='mt-1 text-xl font-bold tracking-tight sm:text-2xl'
            >
              {resourceName}
            </h2>
            {reservation.reservation_number && (
              <p className='mt-1 text-sm font-medium text-text-muted'>
                Reserva #{reservation.reservation_number}
              </p>
            )}
            <p
              id='reservation-details-description'
              className='mt-1 text-sm text-text-muted'
            >
              Revisa la información completa del turno y del cliente.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type='button'
            onClick={onClose}
            className='touch-target flex shrink-0 items-center justify-center rounded-full bg-surface-inset text-text-muted transition-colors hover:bg-graphite-100 hover:text-(--color-text)'
            aria-label='Cerrar detalle de reserva'
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-7 sm:pb-7'>
          <div className='mb-5 flex items-center justify-between gap-3 rounded-2xl bg-surface-inset p-4'>
            <div>
              <p className='text-xs font-medium uppercase tracking-wide text-text-muted'>
                Estado actual
              </p>
              <div className='mt-1'>
                <StatusBadge status={reservation.status} />
              </div>
            </div>
            <div className='text-right'>
              <p className='nums text-2xl font-bold tracking-tight text-primary'>
                {formatLocal(reservation.starts_at, 'HH:mm')}
              </p>
              <p className='text-xs text-text-muted'>
                {formatLocal(reservation.starts_at, "EEE d 'de' MMMM")}
              </p>
            </div>
          </div>

          {whatsappHref && (
            <a
              href={whatsappHref}
              target='_blank'
              rel='noopener noreferrer'
              className='mb-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 active:bg-green-800'
              aria-label='Enviar mensaje por WhatsApp'
            >
              <WhatsAppIcon size={18} />
              Enviar mensaje por WhatsApp
            </a>
          )}

          {actions}

          <div className='grid gap-5 sm:grid-cols-2'>
            <section className='rounded-2xl border border-border p-4'>
              <h3 className='mb-3 text-sm font-semibold tracking-tight'>
                Reserva
              </h3>
              <div className='divide-y divide-border'>
                <DetailRow
                  icon={<ResourceIcon size={17} />}
                  label={resourceLabel}
                >
                  <span className='font-medium'>{resourceName}</span>
                </DetailRow>
                <DetailRow icon={<CalendarIcon size={17} />} label='Fecha'>
                  <span className='capitalize'>
                    {formatLocal(
                      reservation.starts_at,
                      "EEEE d 'de' MMMM 'de' yyyy"
                    )}
                  </span>
                </DetailRow>
                <DetailRow icon={<ClockIcon size={17} />} label='Horario'>
                  <span className='nums'>
                    {formatLocal(reservation.starts_at, 'HH:mm')} –{' '}
                    {formatLocal(reservation.ends_at, 'HH:mm')}{' '}
                    <span className='text-text-muted'>
                      ({formatDuration(reservation)})
                    </span>
                  </span>
                </DetailRow>
              </div>
            </section>

            <section className='rounded-2xl border border-border p-4'>
              <h3 className='mb-3 text-sm font-semibold tracking-tight'>
                Cliente
              </h3>
              <div className='divide-y divide-border'>
                <DetailRow icon={<UserIcon size={17} />} label='Nombre'>
                  <span className='font-medium'>{clientName}</span>
                  <span className='mt-1 block text-xs text-text-muted'>
                    {hasAccount ? 'Cuenta registrada' : 'Cliente invitado'}
                  </span>
                </DetailRow>
                {phone && (
                  <DetailRow icon={<PhoneIcon size={17} />} label='Teléfono'>
                    <a
                      href={`tel:${phone}`}
                      className='font-medium text-primary underline-offset-2 hover:underline'
                    >
                      {phone}
                    </a>
                  </DetailRow>
                )}
                {email && (
                  <DetailRow icon={<MailIcon size={17} />} label='Correo'>
                    <a
                      href={`mailto:${email}`}
                      className='break-all font-medium text-primary underline-offset-2 hover:underline'
                    >
                      {email}
                    </a>
                  </DetailRow>
                )}
              </div>
            </section>
          </div>

          {(reservation.notes || reservation.decision_reason) && (
            <section className='mt-5 rounded-2xl border border-border p-4'>
              <h3 className='mb-3 text-sm font-semibold tracking-tight'>
                Notas
              </h3>
              <div className='flex flex-col gap-3 text-sm'>
                {reservation.notes && (
                  <p className='border-l-2 border-primary pl-3 text-text-muted'>
                    {reservation.notes}
                  </p>
                )}
                {reservation.decision_reason && (
                  <p className='border-l-2 border-border-strong pl-3 text-text-muted'>
                    <span className='font-medium text-(--color-text)'>
                      Motivo:
                    </span>{' '}
                    {reservation.decision_reason}
                  </p>
                )}
              </div>
            </section>
          )}

          <dl className='mt-5 grid grid-cols-2 gap-3 text-xs text-text-muted'>
            <div className='rounded-xl bg-surface-inset p-3'>
              <dt>Creada</dt>
              <dd className='mt-1 font-medium text-(--color-text)'>
                {formatLocal(reservation.created_at, 'd MMM yyyy, HH:mm')}
              </dd>
            </div>
            <div className='rounded-xl bg-surface-inset p-3'>
              <dt>Última actualización</dt>
              <dd className='mt-1 font-medium text-(--color-text)'>
                {formatLocal(reservation.updated_at, 'd MMM yyyy, HH:mm')}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>,
    document.body
  )
}
