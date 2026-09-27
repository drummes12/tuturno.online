import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { OriginCard } from '@/components/admin/metrics/origin-card'

const origin = {
  client: {
    total: 10,
    completed: 4,
    confirmed: 6,
    pending: 0,
    rejected: 0,
    expired: 0,
    cancelledByClient: 0,
    cancelledByBusiness: 0
  },
  business: {
    total: 5,
    completed: 0,
    confirmed: 5,
    pending: 0,
    rejected: 0,
    expired: 0,
    cancelledByClient: 0,
    cancelledByBusiness: 0
  }
}

describe('OriginCard chart detail', () => {
  it('shows a segment count and its share of that origin after selection', () => {
    render(<OriginCard origin={origin} />)
    const segment = screen.getByRole('button', {
      name: /Completadas.*4 de 10 reservas.*40% del cliente/
    })

    fireEvent.click(segment)

    expect(
      screen.getByText('Completadas', { selector: 'p' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('4 de 10 reservas · 40% del cliente')
    ).toBeInTheDocument()
  })
})
