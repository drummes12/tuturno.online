import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('wouter', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  )
}))

import { BackLink } from '@/components/common/back-link'

describe('BackLink', () => {
  it('enlaza al href indicado con un aria-label accesible', () => {
    render(<BackLink href='/admin/negocio' label='Negocio' />)

    const link = screen.getByRole('link', { name: 'Volver a Negocio' })
    expect(link).toHaveAttribute('href', '/admin/negocio')
  })
})
