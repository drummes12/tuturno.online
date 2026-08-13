import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, StatusBadge } from '@/components/common/badge'
import type { ReservationStatus } from '@/types'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders as span', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active').tagName).toBe('SPAN')
  })

  it('applies variant classes for each variant', () => {
    const variants: Array<[string, string]> = [
      ['neutral', 'bg-surface-inset'],
      ['success', 'bg-pitch-100'],
      ['warning', 'bg-orange-50'],
      ['danger', 'bg-red-50'],
      ['info', 'bg-blue-50'],
      ['accent', 'bg-yellow-50']
    ]

    for (const [variant, expectedClass] of variants) {
      const { unmount } = render(
        <Badge variant={variant as 'neutral'}>{variant}</Badge>
      )
      expect(screen.getByText(variant)).toHaveClass(expectedClass)
      unmount()
    }
  })

  it('defaults to neutral variant', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('bg-surface-inset')
  })
})

describe('StatusBadge', () => {
  const statusLabels: Record<ReservationStatus, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    rejected: 'Rechazada',
    cancelled_by_client: 'Cancelada por cliente',
    cancelled_by_business: 'Cancelada por negocio',
    expired: 'Expirada',
    completed: 'Completada'
  }

  Object.entries(statusLabels).forEach(([status, label]) => {
    it(`renders correct label for ${status}`, () => {
      render(<StatusBadge status={status as ReservationStatus} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  it('renders a dot (span with aria-hidden)', () => {
    const { container } = render(<StatusBadge status='pending' />)
    const dot = container.querySelector('span[aria-hidden="true"]')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass('rounded-full')
  })
})
