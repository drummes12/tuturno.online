import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner, ClockLoader } from '@/components/common/spinner'

describe('Spinner', () => {
  it('renders with role="status"', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has aria-label="Cargando"', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Cargando')
  })

  it('usa el arco loader con el tamaño correcto para sm', () => {
    render(<Spinner size='sm' />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('arc-loader')
    expect(el.style.getPropertyValue('--arc-size')).toBe(`${16 / 48}px`)
  })

  it('usa el tamaño correcto para md', () => {
    render(<Spinner size='md' />)
    expect(
      screen.getByRole('status').style.getPropertyValue('--arc-size')
    ).toBe(`${24 / 48}px`)
  })

  it('usa el tamaño correcto para lg', () => {
    render(<Spinner size='lg' />)
    expect(
      screen.getByRole('status').style.getPropertyValue('--arc-size')
    ).toBe(`${40 / 48}px`)
  })

  it('defaults to md size', () => {
    render(<Spinner />)
    expect(
      screen.getByRole('status').style.getPropertyValue('--arc-size')
    ).toBe(`${24 / 48}px`)
  })
})

describe('ClockLoader', () => {
  it('renders el reloj de dígitos con role="status"', () => {
    render(<ClockLoader />)
    const status = screen.getByRole('status')
    expect(status.querySelector('.digit-clock')).toBeInTheDocument()
  })

  it('los dígitos son decorativos (aria-hidden)', () => {
    render(<ClockLoader />)
    expect(
      screen.getByRole('status').querySelector('.digit-clock')
    ).toHaveAttribute('aria-hidden', 'true')
  })

  it('usa el tamaño lg por defecto', () => {
    render(<ClockLoader />)
    const clock = screen
      .getByRole('status')
      .querySelector('.digit-clock') as HTMLElement
    expect(clock.style.getPropertyValue('--clock-fs')).toBe('30px')
  })
})
