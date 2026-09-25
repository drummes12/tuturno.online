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

import { CookiesPage } from './cookies'
import { PrivacyPage } from './privacy'
import { RefundsPage } from './refunds'
import { TermsPage } from './terms'

describe('páginas legales', () => {
  it.each([
    [
      'datos personales',
      PrivacyPage,
      'Política de Tratamiento de Datos Personales'
    ],
    ['términos', TermsPage, 'Términos y Condiciones de Uso'],
    ['cookies', CookiesPage, 'Política de cookies y almacenamiento'],
    ['reembolsos', RefundsPage, 'Política de cancelaciones y reembolsos']
  ])('publica la página de %s', (_name, PageComponent, title) => {
    render(<PageComponent />)
    expect(
      screen.getByRole('heading', { level: 1, name: title })
    ).toBeInTheDocument()
  })
})
