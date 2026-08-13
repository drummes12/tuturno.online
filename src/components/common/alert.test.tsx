import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Alert, ErrorBanner } from '@/components/common/alert'

describe('Alert', () => {
  it('renders children', () => {
    render(<Alert variant='info'>Alert message</Alert>)
    expect(screen.getByText('Alert message')).toBeInTheDocument()
  })

  it('has role="alert"', () => {
    render(<Alert variant='info'>Message</Alert>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders correct icon for each variant', () => {
    const { unmount } = render(<Alert variant='error'>Error</Alert>)
    expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument()
    unmount()
  })

  it('renders AlertIcon for error variant', () => {
    render(<Alert variant='error'>Error</Alert>)
    const svg = screen.getByRole('alert').querySelector('svg')
    expect(svg).toBeInTheDocument()
    // AlertIcon has a triangle path
    expect(svg?.querySelector('path')).toBeInTheDocument()
  })

  it('renders InfoIcon for info variant', () => {
    render(<Alert variant='info'>Info</Alert>)
    const svg = screen.getByRole('alert').querySelector('svg')
    expect(svg).toBeInTheDocument()
    // InfoIcon has a circle
    expect(svg?.querySelector('circle')).toBeInTheDocument()
  })

  it('renders CheckIcon for success variant', () => {
    render(<Alert variant='success'>Success</Alert>)
    const svg = screen.getByRole('alert').querySelector('svg')
    expect(svg).toBeInTheDocument()
    // CheckIcon has a polyline
    expect(svg?.querySelector('polyline')).toBeInTheDocument()
  })

  it('renders AlertIcon for warning variant', () => {
    render(<Alert variant='warning'>Warning</Alert>)
    const svg = screen.getByRole('alert').querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.querySelector('path')).toBeInTheDocument()
  })

  it('renders dismiss button when onDismiss provided', () => {
    render(<Alert variant='info' onDismiss={() => {}}>Message</Alert>)
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
  })

  it('does not render dismiss button when onDismiss not provided', () => {
    render(<Alert variant='info'>Message</Alert>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('dismiss button has aria-label="Cerrar"', () => {
    render(<Alert variant='info' onDismiss={() => {}}>Message</Alert>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Cerrar')
  })

  it('calls onDismiss when dismiss clicked', async () => {
    const onDismiss = vi.fn()
    render(<Alert variant='info' onDismiss={onDismiss}>Message</Alert>)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})

describe('ErrorBanner', () => {
  it('renders message', () => {
    render(<ErrorBanner message='Something went wrong' />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('has role="alert"', () => {
    render(<ErrorBanner message='Error' />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders dismiss button when onDismiss provided', () => {
    render(<ErrorBanner message='Error' onDismiss={() => {}} />)
    expect(screen.getByRole('button', { name: 'Cerrar error' })).toBeInTheDocument()
  })

  it('does not render dismiss button when onDismiss not provided', () => {
    render(<ErrorBanner message='Error' />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('dismiss button has aria-label="Cerrar error"', () => {
    render(<ErrorBanner message='Error' onDismiss={() => {}} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Cerrar error')
  })

  it('calls onDismiss when dismiss clicked', async () => {
    const onDismiss = vi.fn()
    render(<ErrorBanner message='Error' onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar error' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
