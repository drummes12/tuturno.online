import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ClientsCard } from '@/components/admin/metrics/clients-card'
import type { DashboardClientListRow } from '@/types'

const row: DashboardClientListRow = {
  client_id: 'c1',
  name: 'María González',
  phone: null,
  client_since: '2026-01-10',
  reservations: 12,
  confirmed: 2,
  completed: 8,
  cancelled: 1,
  total_count: 1
}

const props = {
  topClients: [row],
  businessId: 'b1',
  from: '2026-04-01',
  to: '2026-04-30'
}

describe('ClientsCard status breakdown', () => {
  it('shows the per-status detail after selecting a client', () => {
    render(<ClientsCard {...props} />)
    const clientRow = screen.getByRole('button', {
      name: /María González\. 12 reservas/
    })

    fireEvent.click(clientRow)

    // El nombre aparece en la fila y en el título del detalle
    expect(screen.getAllByText('María González')).toHaveLength(2)
    expect(
      screen.getByText(
        '12 reservas · 8 completadas · 2 confirmadas · 1 pendiente · 1 perdida'
      )
    ).toBeInTheDocument()
  })

  it('renders the legend with the status buckets present', () => {
    render(<ClientsCard {...props} />)
    expect(screen.getByText('Completadas')).toBeInTheDocument()
    expect(screen.getByText('Confirmadas')).toBeInTheDocument()
    expect(screen.getByText('Pendientes')).toBeInTheDocument()
    expect(screen.getByText('Perdidas')).toBeInTheDocument()
  })
})
