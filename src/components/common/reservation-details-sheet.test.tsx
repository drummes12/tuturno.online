import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Reservation } from '@/types'
import { ReservationDetailsSheet } from '@/components/common/reservation-details-sheet'

const reservation: Reservation = {
  id: 'reservation-1',
  business_id: 'business-1',
  resource_id: 'resource-1',
  user_id: 'user-1',
  client_id: 'client-1',
  reservation_number: 1,
  starts_at: '2026-08-26T15:00:00Z',
  ends_at: '2026-08-26T16:30:00Z',
  status: 'confirmed',
  hold_expires_at: null,
  notes: 'Traer balón propio',
  decision_reason: null,
  decided_by: null,
  created_at: '2026-08-20T12:00:00Z',
  updated_at: '2026-08-21T12:00:00Z',
  resource: {
    id: 'resource-1',
    business_id: 'business-1',
    name: 'Cancha Norte',
    description: null,
    is_active: true,
    sort_order: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  client: {
    id: 'client-1',
    business_id: 'business-1',
    name: 'Ana Pérez',
    phone: '+573001112233',
    email: 'ana@example.com',
    user_id: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
}

describe('ReservationDetailsSheet', () => {
  it('muestra información completa de la reserva y el cliente', () => {
    render(
      <ReservationDetailsSheet
        reservation={reservation}
        onClose={vi.fn()}
        whatsappHref='https://wa.me/573001112233'
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Cancha Norte' })
    ).toBeInTheDocument()
    expect(screen.getByText('Confirmada')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Enviar mensaje por WhatsApp' })
    ).toHaveAttribute('href', 'https://wa.me/573001112233')
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('+573001112233')).toHaveAttribute(
      'href',
      'tel:+573001112233'
    )
    expect(screen.getByText('ana@example.com')).toHaveAttribute(
      'href',
      'mailto:ana@example.com'
    )
    expect(screen.getByText('Traer balón propio')).toBeInTheDocument()
    expect(screen.getByText('(90 min)')).toBeInTheDocument()
  })

  it('cierra al pulsar el botón de cerrar o Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ReservationDetailsSheet reservation={reservation} onClose={onClose} />
    )

    await user.click(
      screen.getByRole('button', { name: 'Cerrar detalle de reserva' })
    )
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('mueve el foco al sheet y lo devuelve al elemento anterior', async () => {
    const user = userEvent.setup()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { unmount } = render(
      <ReservationDetailsSheet reservation={reservation} onClose={vi.fn()} />
    )
    const closeButton = screen.getByRole('button', {
      name: 'Cerrar detalle de reserva'
    })

    await waitFor(() => expect(closeButton).toHaveFocus())
    await user.tab({ shift: true })
    expect(screen.getByText('ana@example.com')).toHaveFocus()

    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })
})
