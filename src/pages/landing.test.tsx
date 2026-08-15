import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn()
}))

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
  ),
  useLocation: () => ['/', mockNavigate] as [string, typeof mockNavigate]
}))

import { LandingPage } from '@/pages/landing'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LandingPage', () => {
  it('muestra el branding TuTurno', () => {
    render(<LandingPage />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/TuTurno/)
  })

  it('muestra el botón de demostración que enlaza a /b/demo', () => {
    render(<LandingPage />)
    const demoLink = screen.getByRole('link', { name: /demostración/i })
    expect(demoLink).toHaveAttribute('href', '/b/demo')
  })

  it('muestra el campo para ingresar el slug de organización', () => {
    render(<LandingPage />)
    expect(screen.getByPlaceholderText('mi-negocio')).toBeInTheDocument()
  })

  it('muestra el enlace de login para administradores', () => {
    render(<LandingPage />)
    const loginLink = screen.getByRole('link', { name: /iniciar sesión/i })
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('muestra error si se envía el formulario vacío', () => {
    render(<LandingPage />)
    const input = screen.getByPlaceholderText('mi-negocio')
    fireEvent.submit(input.closest('form')!)
    expect(
      screen.getByText('Ingresa el identificador de tu organización')
    ).toBeInTheDocument()
  })

  it('muestra error si el slug tiene caracteres inválidos', () => {
    render(<LandingPage />)
    const input = screen.getByPlaceholderText('mi-negocio')
    fireEvent.change(input, { target: { value: 'Invalid Slug!' } })
    fireEvent.submit(input.closest('form')!)
    expect(
      screen.getByText('Solo letras minúsculas, números y guiones')
    ).toBeInTheDocument()
  })

  it('acepta un slug válido sin mostrar error y navega', () => {
    render(<LandingPage />)
    const input = screen.getByPlaceholderText('mi-negocio')
    fireEvent.change(input, { target: { value: 'mi-negocio' } })
    fireEvent.submit(input.closest('form')!)
    expect(
      screen.queryByText('Solo letras minúsculas, números y guiones')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Ingresa el identificador de tu organización')
    ).not.toBeInTheDocument()
    expect(mockNavigate).toHaveBeenCalledWith('/b/mi-negocio')
  })

  it('normaliza el slug a minúsculas antes de navegar', () => {
    render(<LandingPage />)
    const input = screen.getByPlaceholderText('mi-negocio')
    fireEvent.change(input, { target: { value: '  Mi-Negocio  ' } })
    fireEvent.submit(input.closest('form')!)
    expect(mockNavigate).toHaveBeenCalledWith('/b/mi-negocio')
  })

  it('rechaza slugs demasiado cortos', () => {
    render(<LandingPage />)
    const input = screen.getByPlaceholderText('mi-negocio')
    fireEvent.change(input, { target: { value: 'a' } })
    fireEvent.submit(input.closest('form')!)
    expect(
      screen.getByText('Solo letras minúsculas, números y guiones')
    ).toBeInTheDocument()
  })
})
