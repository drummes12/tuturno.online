import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { HeatmapCard } from '@/components/admin/metrics/heatmap-card'

const props = {
  heatmap: {
    day: [{ hour: 18, total: 5, avg: 1.25 }],
    week: [{ dow: 1, hour: 18, total: 5, avg: 1.25 }],
    month: [{ date: '2026-04-01', total: 5 }]
  },
  businessHours: [{ dow: 1, open: '18:00', close: '19:00' }],
  periodFrom: '2026-04-01',
  periodTo: '2026-04-30'
} as Parameters<typeof HeatmapCard>[0]

describe('HeatmapCard chart detail', () => {
  it('shows average, total and period share after selecting a weekly cell', () => {
    render(<HeatmapCard {...props} />)
    const cell = screen.getByRole('button', {
      name: /Lunes · 18:00.*Promedio 1,3 reservas\/jornada/
    })

    fireEvent.click(cell)

    expect(screen.getByText('Lunes · 18:00')).toBeInTheDocument()
    expect(
      screen.getByText('Promedio 1,3 reservas/jornada · Total 5 · 100% del período')
    ).toBeInTheDocument()
  })
})
