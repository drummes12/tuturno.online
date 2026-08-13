import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/common/button'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('renders with default variant (primary) and size (md)', () => {
    render(<Button>Default</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary')
    expect(button).toHaveClass('text-base')
    expect(button).toHaveClass('px-5')
    expect(button).toHaveClass('py-2.5')
  })

  it('applies correct variant classes for each variant', () => {
    const variants: Array<[string, string]> = [
      ['primary', 'bg-primary'],
      ['secondary', 'bg-surface-elevated'],
      ['ghost', 'bg-transparent'],
      ['danger', 'bg-danger'],
      ['success', 'bg-success']
    ]

    for (const [variant, expectedClass] of variants) {
      const { unmount } = render(
        <Button variant={variant as 'primary'}>{variant}</Button>
      )
      expect(screen.getByRole('button')).toHaveClass(expectedClass)
      unmount()
    }
  })

  it('applies correct size classes for each size', () => {
    const sizes: Array<[string, string]> = [
      ['sm', 'text-sm'],
      ['md', 'text-base'],
      ['lg', 'text-lg']
    ]

    for (const [size, expectedClass] of sizes) {
      const { unmount } = render(<Button size={size as 'sm'}>{size}</Button>)
      expect(screen.getByRole('button')).toHaveClass(expectedClass)
      unmount()
    }
  })

  it('merges custom className', () => {
    render(<Button className='custom-class'>Custom</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('shows spinner and disables when loading=true', () => {
    render(<Button loading>Loading</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    const svg = button.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('animate-spin')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('handles onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('passes through additional HTML attributes (type, aria-label, data-testid)', () => {
    render(
      <Button type='submit' aria-label='Submit form' data-testid='submit-btn'>
        Submit
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveAttribute('aria-label', 'Submit form')
    expect(button).toHaveAttribute('data-testid', 'submit-btn')
  })

  it('is disabled when both loading and disabled', () => {
    render(
      <Button loading disabled>
        Both
      </Button>
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
