import { useState } from 'react'
import type { Reservation } from '@/types'
import { canClientCancelReservation } from '@/lib/reservation-status'
import { Button } from '@/components/common/button'
import { Input } from '@/components/common/input'
import { Alert } from '@/components/common/alert'
import { CheckIcon, XIcon } from '@/components/common/icon'
import {
  cancelReservationByBusiness,
  cancelReservationByClient,
  confirmReservation,
  rejectReservation
} from '@/services/reservations'

type Viewer = 'client' | 'business'
type ReasonMode = 'reject' | 'cancel' | null

export type ReservationActionControlsProps = {
  reservation: Reservation
  viewer: Viewer
  /** Horas de antelación para cancelar una reserva confirmada (cliente). */
  cancellationLimitHours?: number
  /** Callback tras una acción exitosa; el padre recarga y sincroniza el sheet. */
  onChanged?: (reservationId: string) => void | Promise<void>
  /** Marca data-tour para el botón de cancelación (guías interactivas). */
  cancelTourKey?: string
}

export function ReservationActionControls({
  reservation,
  viewer,
  cancellationLimitHours = 2,
  onChanged,
  cancelTourKey
}: ReservationActionControlsProps) {
  const [acting, setActing] = useState(false)
  const [reasonMode, setReasonMode] = useState<ReasonMode>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canClientCancel = canClientCancelReservation(
    reservation,
    cancellationLimitHours
  )
  const hasActions =
    viewer === 'client'
      ? canClientCancel
      : reservation.status === 'pending' || reservation.status === 'confirmed'

  if (!hasActions) return null

  async function run(action: () => Promise<void>, errorLabel: string) {
    setActing(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(
        `${errorLabel}: ${err instanceof Error ? err.message : ''}`.trim()
      )
      setActing(false)
      return
    }
    setActing(false)
    setReasonMode(null)
    setReason('')
    await onChanged?.(reservation.id)
  }

  function requireReason(mode: Exclude<ReasonMode, null>): boolean {
    if (!reason.trim()) {
      setError(
        mode === 'reject'
          ? 'Escribe un motivo para el rechazo.'
          : 'Escribe un motivo para la cancelación.'
      )
      return false
    }
    return true
  }

  if (reasonMode) {
    const isReject = reasonMode === 'reject'
    return (
      <div className='flex w-full flex-col gap-2.5 animate-fade-up'>
        {error && (
          <Alert variant='error' onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Input
          label={isReject ? 'Motivo del rechazo' : 'Motivo de cancelación'}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            isReject
              ? 'Ej: recurso en mantenimiento'
              : 'Ej: el cliente no llegó'
          }
          autoFocus
        />
        <div className='flex gap-2'>
          <Button
            variant='danger'
            size='sm'
            loading={acting}
            onClick={() => {
              if (!requireReason(reasonMode)) return
              const trimmed = reason.trim()
              void run(
                () =>
                  isReject
                    ? rejectReservation(reservation.id, trimmed)
                    : cancelReservationByBusiness(reservation.id, trimmed),
                isReject ? 'Error al rechazar' : 'Error al cancelar'
              )
            }}
          >
            {isReject ? 'Confirmar rechazo' : 'Confirmar cancelación'}
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              setReasonMode(null)
              setReason('')
              setError(null)
            }}
          >
            {isReject ? 'Cancelar' : 'Cerrar'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='flex w-full flex-col gap-2.5'>
      {error && (
        <Alert variant='error' onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      <div className='flex flex-wrap items-center gap-2'>
        {viewer === 'client' && (
          <Button
            variant='danger'
            size='sm'
            loading={acting}
            data-tour={cancelTourKey}
            onClick={() => {
              if (
                !window.confirm('¿Seguro que quieres cancelar esta reserva?')
              ) {
                return
              }
              void run(
                () => cancelReservationByClient(reservation.id),
                'No pudimos cancelar la reserva'
              )
            }}
          >
            Cancelar reserva
          </Button>
        )}

        {viewer === 'business' && reservation.status === 'pending' && (
          <>
            <Button
              variant='success'
              size='sm'
              loading={acting}
              onClick={() =>
                void run(
                  () => confirmReservation(reservation.id),
                  'Error al confirmar'
                )
              }
            >
              <CheckIcon size={16} />
              Confirmar
            </Button>
            <Button
              variant='danger'
              size='sm'
              onClick={() => setReasonMode('reject')}
            >
              <XIcon size={16} />
              Rechazar
            </Button>
          </>
        )}

        {viewer === 'business' && reservation.status === 'confirmed' && (
          <Button
            variant='danger'
            size='sm'
            data-tour={cancelTourKey}
            onClick={() => setReasonMode('cancel')}
          >
            <XIcon size={16} />
            Cancelar reserva
          </Button>
        )}
      </div>
    </div>
  )
}
