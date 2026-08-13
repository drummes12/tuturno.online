import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from '@/components/common/spinner'

describe('Spinner', () => {
  it('renders with role="status"', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has aria-label="Cargando"', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Cargando')
  })

  it('applies correct size class for sm (h-4 w-4)', () => {
    render(<Spinner size='sm' />)
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('h-4', 'w-4')
  })

  it('applies correct size class for md (h-6 w-6)', () => {
    render(<Spinner size='md' />)
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('h-6', 'w-6')
  })

  it('applies correct size class for lg (h-10 w-10)', () => {
    render(<Spinner size='lg' />)
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('h-10', 'w-10')
  })

  it('defaults to md size', () => {
    render(<Spinner />)
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('h-6', 'w-6')
  })

  it('renders an SVG element', () => {
    render(<Spinner />)
    const svg = screen.getByRole('status').querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.tagName).toBe('svg')
  })
})
