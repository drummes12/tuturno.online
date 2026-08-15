import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const { mockFetchBusinessContactById } = vi.hoisted(() => ({
  mockFetchBusinessContactById: vi.fn()
}))

vi.mock('@/services/business', () => ({
  fetchBusinessContactById: mockFetchBusinessContactById
}))

vi.mock('@/hooks/use-tenant', () => ({
  useTenant: () => ({ business: null, loading: false, error: null })
}))

vi.mock('@/lib/slug', () => ({
  getSlugFromUrl: () => null,
  extractSlugFromPath: () => null
}))

import { WhatsAppFab } from '@/components/common/whatsapp-fab'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('WhatsAppFab', () => {
  it('no renderiza nada cuando no hay phone', async () => {
    mockFetchBusinessContactById.mockResolvedValue(null)
    const { container } = render(<WhatsAppFab businessId='biz-1' />)
    await vi.waitFor(() => {
      expect(mockFetchBusinessContactById).toHaveBeenCalled()
    })
    expect(container.querySelector('a')).toBeNull()
  })

  it('no renderiza nada cuando fetchBusinessContactById falla', async () => {
    mockFetchBusinessContactById.mockResolvedValue(null)
    const { container } = render(<WhatsAppFab businessId='biz-1' />)
    await vi.waitFor(() => {
      expect(mockFetchBusinessContactById).toHaveBeenCalled()
    })
    expect(container.querySelector('a')).toBeNull()
  })

  it('renderiza el botón cuando hay phone', async () => {
    mockFetchBusinessContactById.mockResolvedValue({
      id: 'biz-1',
      phone: '+57 300 123 4567',
      name: 'Canchas Test',
      slug: 'test',
      street: null,
      neighborhood: null,
      city: null,
      state: null,
      country: null,
      resource_label_singular: 'Cancha',
      resource_label_plural: 'Canchas',
      reservation_instructions_md: null,
      whatsapp_link: null,
      is_demo: false
    })
    render(<WhatsAppFab businessId='biz-1' />)
    await vi.waitFor(() => {
      expect(screen.getByRole('link')).toBeInTheDocument()
    })
  })

  it('el link apunta a wa.me con el número limpio', async () => {
    mockFetchBusinessContactById.mockResolvedValue({
      id: 'biz-1',
      phone: '+57 300 123 4567',
      name: 'Canchas Test',
      slug: 'test',
      street: null,
      neighborhood: null,
      city: null,
      state: null,
      country: null,
      resource_label_singular: 'Cancha',
      resource_label_plural: 'Canchas',
      reservation_instructions_md: null,
      whatsapp_link: null,
      is_demo: false
    })
    render(<WhatsAppFab businessId='biz-1' />)
    await vi.waitFor(() => {
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href')
      const href = link.getAttribute('href')!
      expect(href).toContain('wa.me/573001234567')
    })
  })

  it('el link incluye el nombre del negocio en el mensaje', async () => {
    mockFetchBusinessContactById.mockResolvedValue({
      id: 'biz-1',
      phone: '3001234567',
      name: 'Mi Cancha',
      slug: 'test',
      street: null,
      neighborhood: null,
      city: null,
      state: null,
      country: null,
      resource_label_singular: 'Cancha',
      resource_label_plural: 'Canchas',
      reservation_instructions_md: null,
      whatsapp_link: null,
      is_demo: false
    })
    render(<WhatsAppFab businessId='biz-1' />)
    await vi.waitFor(() => {
      const link = screen.getByRole('link')
      const href = link.getAttribute('href')!
      expect(href).toContain(encodeURIComponent('Mi Cancha'))
    })
  })

  it('tiene target _blank y rel noopener', async () => {
    mockFetchBusinessContactById.mockResolvedValue({
      id: 'biz-1',
      phone: '3001234567',
      name: 'Test',
      slug: 'test',
      street: null,
      neighborhood: null,
      city: null,
      state: null,
      country: null,
      resource_label_singular: 'Cancha',
      resource_label_plural: 'Canchas',
      reservation_instructions_md: null,
      whatsapp_link: null,
      is_demo: false
    })
    render(<WhatsAppFab businessId='biz-1' />)
    await vi.waitFor(() => {
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('tiene aria-label descriptivo', async () => {
    mockFetchBusinessContactById.mockResolvedValue({
      id: 'biz-1',
      phone: '3001234567',
      name: 'Cancha Premium',
      slug: 'test',
      street: null,
      neighborhood: null,
      city: null,
      state: null,
      country: null,
      resource_label_singular: 'Cancha',
      resource_label_plural: 'Canchas',
      reservation_instructions_md: null,
      whatsapp_link: null,
      is_demo: false
    })
    render(<WhatsAppFab businessId='biz-1' />)
    await vi.waitFor(() => {
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('aria-label')
      expect(link.getAttribute('aria-label')).toContain('Cancha Premium')
      expect(link.getAttribute('aria-label')).toContain('WhatsApp')
    })
  })

  it('usa whatsapp_link cuando está configurado (prioridad sobre phone)', async () => {
    mockFetchBusinessContactById.mockResolvedValue({
      id: 'biz-1',
      phone: '3001234567',
      whatsapp_link: 'https://wa.me/573009876543',
      name: 'Test',
      slug: 'test',
      street: null,
      neighborhood: null,
      city: null,
      state: null,
      country: null,
      resource_label_singular: 'Cancha',
      resource_label_plural: 'Canchas',
      reservation_instructions_md: null,
      is_demo: false
    })
    render(<WhatsAppFab businessId='biz-1' />)
    await vi.waitFor(() => {
      const link = screen.getByRole('link')
      const href = link.getAttribute('href')!
      expect(href).toContain('wa.me/573009876543')
      expect(href).not.toContain('wa.me/3001234567')
    })
  })

  it('usa phone cuando whatsapp_link es null', async () => {
    mockFetchBusinessContactById.mockResolvedValue({
      id: 'biz-1',
      phone: '+57 300 123 4567',
      whatsapp_link: null,
      name: 'Test',
      slug: 'test',
      street: null,
      neighborhood: null,
      city: null,
      state: null,
      country: null,
      resource_label_singular: 'Cancha',
      resource_label_plural: 'Canchas',
      reservation_instructions_md: null,
      is_demo: false
    })
    render(<WhatsAppFab businessId='biz-1' />)
    await vi.waitFor(() => {
      const link = screen.getByRole('link')
      const href = link.getAttribute('href')!
      expect(href).toContain('wa.me/573001234567')
    })
  })

  it('no renderiza nada cuando no hay phone ni whatsapp_link', async () => {
    mockFetchBusinessContactById.mockResolvedValue({
      id: 'biz-1',
      phone: null,
      whatsapp_link: null,
      name: 'Test',
      slug: 'test',
      street: null,
      neighborhood: null,
      city: null,
      state: null,
      country: null,
      resource_label_singular: 'Cancha',
      resource_label_plural: 'Canchas',
      reservation_instructions_md: null,
      is_demo: false
    })
    const { container } = render(<WhatsAppFab businessId='biz-1' />)
    await vi.waitFor(() => {
      expect(mockFetchBusinessContactById).toHaveBeenCalled()
    })
    expect(container.querySelector('a')).toBeNull()
  })
})
