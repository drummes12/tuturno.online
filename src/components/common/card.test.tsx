import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from '@/components/common/card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('has border classes by default (bordered=true)', () => {
    render(<Card>Content</Card>)
    expect(screen.getByText('Content').closest('div')).toHaveClass('border', 'border-border')
  })

  it('no border classes when bordered=false', () => {
    render(<Card bordered={false}>Content</Card>)
    const card = screen.getByText('Content').closest('div')
    expect(card).not.toHaveClass('border')
    expect(card).not.toHaveClass('border-border')
  })

  it('has elevated shadow when elevated=true', () => {
    render(<Card elevated>Content</Card>)
    expect(screen.getByText('Content').closest('div')).toHaveClass('shadow-(--shadow-md)')
  })

  it('has default shadow when elevated=false', () => {
    render(<Card elevated={false}>Content</Card>)
    expect(screen.getByText('Content').closest('div')).toHaveClass('shadow-(--shadow-xs)')
  })

  it('merges custom className', () => {
    render(<Card className='custom-card'>Content</Card>)
    expect(screen.getByText('Content').closest('div')).toHaveClass('custom-card')
  })

  it('applies inline style prop', () => {
    render(<Card style={{ backgroundColor: 'rgb(255, 0, 0)' }}>Content</Card>)
    const card = screen.getByText('Content').closest('div')
    expect(card).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' })
  })
})
