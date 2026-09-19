import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'wouter'
import { differenceInMinutes } from 'date-fns'
import type { ReactNode } from 'react'
import type { Reservation } from '@/types'
import { StatusBadge } from '@/components/common/badge'
import { PitchTicket } from '@/components/common/pitch-ticket'
import {
  ChevronRightIcon,
  MailIcon,
  MessageIcon,
  PhoneIcon,
  StoreIcon,
  UserIcon,
  WhatsAppIcon,
  XIcon
} from '@/components/common/icon'
import { formatLocal } from '@/lib/time'
import { RESERVATION_BEAM_CLASS } from '@/lib/reservation-status'

type ReservationDetailsSheetProps = {
  reservation: Reservation
  onClose: () => void
  resourceLabel?: string
  whatsappHref?: string | null
  actions?: ReactNode
  /**
   * 'business': la sección de contacto muestra al cliente (panel admin).
   * 'client': muestra los datos del negocio (mis reservas) — el cliente
   * ya sabe quién es; lo que necesita es cómo contactar al negocio.
   */
  viewer?: 'client' | 'business'
}

function formatDuration(reservation: Reservation): string {
  const minutes = differenceInMinutes(
    new Date(reservation.ends_at),
    new Date(reservation.starts_at)
  )
  return `${minutes} min`
}

/* Fila de contacto — icono en inset, label mono y el valor como
   enlace accionable a todo lo ancho (tel:, mailto:, wa.me). */
function ContactRow({
  icon,
  label,
  href,
  external,
  onNavigate,
  children
}: {
  icon: ReactNode
  label: string
  href?: string
  external?: boolean
  onNavigate?: () => void
  children: ReactNode
}) {
  const linkClass =
    'nums mt-0.5 block truncate text-sm font-medium text-primary underline-offset-2 transition-colors hover:text-(--color-primary-hover) hover:underline'
  const value = href ? (
    href.startsWith('/') ? (
      <Link href={href} onClick={onNavigate} className={linkClass}>
        {children}
      </Link>
    ) : (
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={linkClass}
      >
        {children}
      </a>
    )
  ) : (
    <span className='mt-0.5 block truncate text-sm font-medium text-(--color-text)'>
      {children}
    </span>
  )

  return (
    <div className='group flex items-center gap-3 px-4 py-3 transition-colors duration-150'>
      <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-inset text-text-muted transition-colors duration-150 group-hover:bg-graphite-100 group-hover:text-(--color-text) dark:group-hover:bg-graphite-700'>
        {icon}
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-text-muted'>
          {label}
        </span>
        {value}
      </span>
      {href && (
        <ChevronRightIcon size={16} className='shrink-0 text-text-muted/60' />
      )}
    </div>
  )
}

export function ReservationDetailsSheet({
  reservation,
  onClose,
  resourceLabel = 'Recurso',
  whatsappHref,
  actions,
  viewer = 'business'
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

  const isBusinessViewer = viewer === 'business'
  const clientName =
    reservation.client?.name ??
    reservation.profile?.full_name ??
    'Cliente sin nombre'
  const phone = isBusinessViewer
    ? (reservation.client?.phone ?? reservation.profile?.phone)
    : reservation.business?.phone
  const email = reservation.client?.email
  const hasAccount = Boolean(reservation.client?.user_id ?? reservation.user_id)
  const resourceName = reservation.resource?.name ?? resourceLabel
  const duration = formatDuration(reservation)
  const businessName = reservation.business?.name ?? 'Negocio'
  const businessSlug = reservation.business?.slug
  const contactHref = isBusinessViewer
    ? whatsappHref
    : (reservation.business?.whatsapp_link ?? whatsappHref)

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
        aria-labelledby='reservation-details-title'
        aria-describedby='reservation-details-description'
        className='grid w-full max-h-[min(92dvh,720px)] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden rounded-t-3xl bg-surface-elevated shadow-(--shadow-lg) animate-sheet-up sm:max-w-3xl sm:grid-rows-none sm:grid-cols-[minmax(0,10fr)_minmax(0,13fr)] sm:rounded-3xl sm:animate-fade-up'
        onClick={(event) => event.stopPropagation()}
      >
        <p id='reservation-details-description' className='sr-only'>
          Detalle completo del turno y del cliente.
        </p>

        <div
          className='flex justify-center pt-2.5 sm:hidden'
          aria-hidden='true'
        >
          <span className='h-1 w-10 rounded-full bg-graphite-200' />
        </div>

        {/* Panel pitch — la papeleta del turno, sigue el tema de la
            app. En mobile es la cabecera del sheet; en desktop es la
            columna de contexto, como el panel del landing. */}
        {/* Border-beam solo en mobile: un arco de luz pitch recorre
            el borde de la papeleta. En desktop el panel es full-bleed
            y la cancha habla por sí sola. */}
        {/* Papeleta pitch — el mismo PitchTicket del sistema, con los
            extras del sheet: #reserva + cerrar en la barra, acta de
            metadata en el pie. En desktop es la columna de contexto
            full-bleed; el beam queda solo en mobile. */}
        <PitchTicket
          kicker={
            <span className='flex items-baseline gap-2 text-graphite-500 dark:text-chalk-dim/70'>
              Reserva
              {reservation.reservation_number && (
                <span className='text-graphite-900 dark:text-chalk'>
                  #{reservation.reservation_number}
                </span>
              )}
            </span>
          }
          badge={
            <span className='flex items-center gap-2'>
              <StatusBadge status={reservation.status} />
              <button
                ref={closeButtonRef}
                type='button'
                onClick={onClose}
                className='touch-target -mr-2 flex shrink-0 items-center justify-center rounded-full text-graphite-500 transition-all duration-150 ease-out hover:bg-graphite-900/5 hover:text-graphite-900 active:scale-[0.92] dark:text-chalk-dim/70 dark:hover:bg-white/10 dark:hover:text-chalk'
                aria-label='Cerrar detalle de reserva'
              >
                <XIcon size={20} />
              </button>
            </span>
          }
          dateLabel={formatLocal(
            reservation.starts_at,
            "EEEE d 'de' MMMM 'de' yyyy"
          )}
          timeLabel={
            <>
              {formatLocal(reservation.starts_at, 'HH:mm')}
              <span className='mx-1.5 text-graphite-400 dark:text-chalk/40'>
                –
              </span>
              {formatLocal(reservation.ends_at, 'HH:mm')}
            </>
          }
          resourceName={
            <h2 id='reservation-details-title' className='truncate'>
              {resourceName}
            </h2>
          }
          resourceIcon={<StoreIcon size={16} />}
          resourceLabel={resourceLabel}
          meta={`(${duration})`}
          note={
            <dl className='flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-graphite-500 sm:h-11 sm:items-center dark:text-chalk-dim/50'>
              <div className='flex items-baseline gap-1.5'>
                <dt>Creada</dt>
                <dd className='nums text-graphite-700 dark:text-chalk-dim/80'>
                  {formatLocal(reservation.created_at, 'd MMM yyyy, HH:mm')}
                </dd>
              </div>
              <div className='flex items-baseline gap-1.5'>
                <dt>Actualizada</dt>
                <dd className='nums text-graphite-700 dark:text-chalk-dim/80'>
                  {formatLocal(reservation.updated_at, 'd MMM yyyy, HH:mm')}
                </dd>
              </div>
            </dl>
          }
          beam={RESERVATION_BEAM_CLASS[reservation.status]}
          className='mx-4 mt-3 sm:m-0 sm:rounded-none sm:before:hidden'
          panelClassName='sm:flex sm:h-full sm:flex-col sm:rounded-none'
          contentClassName='sm:mt-0 sm:flex sm:flex-1 sm:flex-col sm:justify-center'
          timeClassName='text-[40px] sm:text-[44px]'
        />

        {/* Columna de operación */}
        <div className='min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-5 sm:pt-5 sm:pb-5'>
          {/* Acciones del contexto (admin o cliente) */}
          {actions && <div>{actions}</div>}

          {/* Contacto — el negocio ve al cliente; el cliente ve al negocio */}
          <section className='mt-4 overflow-hidden rounded-2xl border border-border'>
            <div className='flex items-center justify-between border-b border-border bg-surface-inset/50 px-4 py-2.5'>
              <h3 className='font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                {isBusinessViewer ? 'Cliente' : 'Negocio'}
              </h3>
              <span className='font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-muted/70'>
                {isBusinessViewer
                  ? hasAccount
                    ? 'Cuenta registrada'
                    : 'Invitado'
                  : businessSlug}
              </span>
            </div>
            <div className='divide-y divide-border'>
              {isBusinessViewer ? (
                <ContactRow icon={<UserIcon size={17} />} label='Nombre'>
                  {clientName}
                </ContactRow>
              ) : (
                <ContactRow icon={<StoreIcon size={17} />} label='Nombre'>
                  {businessName}
                </ContactRow>
              )}
              {phone && (
                <ContactRow
                  icon={<PhoneIcon size={17} />}
                  label='Teléfono'
                  href={`tel:${phone}`}
                >
                  {phone}
                </ContactRow>
              )}
              {isBusinessViewer && email && (
                <ContactRow
                  icon={<MailIcon size={17} />}
                  label='Correo'
                  href={`mailto:${email}`}
                >
                  {email}
                </ContactRow>
              )}
              {contactHref && (
                <ContactRow
                  icon={<WhatsAppIcon size={17} />}
                  label='WhatsApp'
                  href={contactHref}
                  external
                >
                  Enviar mensaje por WhatsApp
                </ContactRow>
              )}
              {!isBusinessViewer && businessSlug && (
                <ContactRow
                  icon={<StoreIcon size={17} />}
                  label='Página'
                  href={`/b/${businessSlug}`}
                  onNavigate={onClose}
                >
                  Ver disponibilidad
                </ContactRow>
              )}
            </div>
          </section>

          {(reservation.notes || reservation.decision_reason) && (
            <section className='mt-4 rounded-2xl border border-border p-4'>
              <h3 className='flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-text-muted'>
                <MessageIcon size={13} />
                Notas
              </h3>
              <div className='mt-3 flex flex-col gap-3 text-sm'>
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
        </div>
      </section>
    </div>,
    document.body
  )
}
