import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Reservation } from '@/types'

const { mockConfirm, mockReject, mockCancelBusiness, mockCancelClient } =
  vi.hoisted(() => ({
    mockConfirm: vi.fn(),
    mockReject: vi.fn(),
    mockCancelBusiness: vi.fn(),
    mockCancelClient: vi.fn()
  }))
vi.mock('@/services/reservations', () => ({
  confirmReservation: mockConfirm,
  rejectReservation: mockReject,
  cancelReservationByBusiness: mockCancelBusiness,
  cancelReservationByClient: mockCancelClient
}))

import { ReservationActionControls } from '@/components/common/reservation-action-controls'
import { canClientCancelReservation } from '@/lib/reservation-status'

const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

const baseReservation: Reservation = {
  id: 'reservation-1',
  business_id: 'business-1',
  resource_id: 'resource-1',
  user_id: 'user-1',
  client_id: null,
  reservation_number: 1,
  starts_at: futureStart,
  ends_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
  status: 'pending',
  hold_expires_at: null,
  notes: null,
  decision_reason: null,
  decided_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('canClientCancelReservation', () => {
  it('permite cancelar pendientes sin límite de tiempo', () => {
    const soon = {
      ...baseReservation,
      starts_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    }
    expect(canClientCancelReservation(soon, 2)).toBe(true)
  })

  it('bloquea confirmadas dentro del límite de cancelación', () => {
    const soon = {
      ...baseReservation,
      status: 'confirmed' as const,
      starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }
    expect(canClientCancelReservation(soon, 2)).toBe(false)
    expect(canClientCancelReservation(soon, 0.5)).toBe(true)
  })

  it('no permite cancelar estados finales', () => {
    for (const status of [
      'rejected',
      'cancelled_by_client',
      'cancelled_by_business',
      'expired',
      'completed'
    ] as const) {
      expect(
        canClientCancelReservation({ ...baseReservation, status }, 2)
      ).toBe(false)
    }
  })
})

describe('ReservationActionControls', () => {
  it('cliente: cancela una reserva tras confirmar el diálogo', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onChanged = vi.fn()
    render(
      <ReservationActionControls
        reservation={baseReservation}
        viewer='client'
        onChanged={onChanged}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }))

    expect(mockCancelClient).toHaveBeenCalledWith('reservation-1')
    expect(onChanged).toHaveBeenCalledWith('reservation-1')
  })

  it('cliente: no cancela si el usuario rechaza la confirmación', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(
      <ReservationActionControls
        reservation={baseReservation}
        viewer='client'
      />
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }))

    expect(mockCancelClient).not.toHaveBeenCalled()
  })

  it('cliente: no renderiza acciones cuando ya no puede cancelar', () => {
    const { container } = render(
      <ReservationActionControls
        reservation={{ ...baseReservation, status: 'rejected' }}
        viewer='client'
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('negocio: confirma una reserva pendiente', async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn()
    render(
      <ReservationActionControls
        reservation={baseReservation}
        viewer='business'
        onChanged={onChanged}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mockConfirm).toHaveBeenCalledWith('reservation-1')
    expect(onChanged).toHaveBeenCalledWith('reservation-1')
  })

  it('negocio: exige motivo antes de rechazar', async () => {
    const user = userEvent.setup()
    render(
      <ReservationActionControls
        reservation={baseReservation}
        viewer='business'
      />
    )

    await user.click(screen.getByRole('button', { name: 'Rechazar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))

    expect(mockReject).not.toHaveBeenCalled()
    expect(
      screen.getByText('Escribe un motivo para el rechazo.')
    ).toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Motivo del rechazo'),
      'Sin disponibilidad'
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))
    expect(mockReject).toHaveBeenCalledWith(
      'reservation-1',
      'Sin disponibilidad'
    )
  })

  it('negocio: cancela una reserva confirmada con motivo', async () => {
    const user = userEvent.setup()
    render(
      <ReservationActionControls
        reservation={{ ...baseReservation, status: 'confirmed' }}
        viewer='business'
      />
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
    await user.type(
      screen.getByLabelText('Motivo de cancelación'),
      'El cliente no llegó'
    )
    await user.click(
      screen.getByRole('button', { name: 'Confirmar cancelación' })
    )

    expect(mockCancelBusiness).toHaveBeenCalledWith(
      'reservation-1',
      'El cliente no llegó'
    )
  })

  it('muestra el error del RPC y permite reintentar', async () => {
    const user = userEvent.setup()
    mockConfirm.mockRejectedValueOnce(new Error('ya confirmada'))
    render(
      <ReservationActionControls
        reservation={baseReservation}
        viewer='business'
      />
    )

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText(/Error al confirmar/)).toBeInTheDocument()
    expect(screen.getByText(/ya confirmada/)).toBeInTheDocument()
  })
})
