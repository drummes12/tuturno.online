import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

const { mockNavigate, mockUseNotifications } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseNotifications: vi.fn()
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
  useLocation: () => ['/actual', mockNavigate] as [string, typeof mockNavigate]
}))

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: (userId: string | null) => mockUseNotifications(userId)
}))

import { NotificationCenter } from '@/components/common/notification-center'
import type { AppNotification } from '@/types'

function notification(partial: Partial<AppNotification>): AppNotification {
  return {
    id: 'n1',
    type: 'reservation_confirmed',
    payload: {
      business_name: 'Canchas FC',
      resource_name: 'Cancha 1',
      url: '/admin/reservas?reservation=r1'
    },
    created_at: new Date().toISOString(),
    read_at: null,
    reservation_id: 'r1',
    reservation_status: 'confirmed',
    reservation_number: 12,
    ...partial
  }
}

function setup(list: AppNotification[]) {
  const markRead = vi.fn().mockResolvedValue(undefined)
  const markAllRead = vi.fn().mockResolvedValue(undefined)
  const archive = vi.fn().mockResolvedValue(undefined)
  const archiveRead = vi.fn().mockResolvedValue(undefined)
  mockUseNotifications.mockReturnValue({
    notifications: list,
    unreadCount: list.filter((n) => n.read_at === null).length,
    loading: false,
    error: null,
    refresh: vi.fn(),
    markRead,
    markAllRead,
    archive,
    archiveRead
  })
  render(
    <NotificationCenter userId='u1' settingsHref='/notificaciones?next=x' />
  )
  fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))
  const dialog = screen.getByRole('dialog', { name: 'Notificaciones' })
  return { dialog, markRead, markAllRead, archive, archiveRead }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('NotificationCenter', () => {
  it('muestra el badge con el conteo de no leídas', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 3,
      loading: false,
      error: null,
      refresh: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      archive: vi.fn(),
      archiveRead: vi.fn()
    })
    render(
      <NotificationCenter userId='u1' settingsHref='/notificaciones' />
    )
    const trigger = screen.getByRole('button', {
      name: 'Notificaciones, 3 sin leer'
    })
    expect(trigger.textContent).toContain('3')
  })

  it('filtra por pestañas', () => {
    const { dialog } = setup([
      notification({ id: 'a' }),
      notification({
        id: 'b',
        read_at: '2026-01-01T00:00:00Z',
        type: 'reservation_expired'
      }),
      notification({
        id: 'c',
        read_at: '2026-01-01T00:00:00Z',
        reservation_status: 'pending',
        type: 'reservation_created_client'
      })
    ])

    fireEvent.click(within(dialog).getByRole('button', { name: /sin leer/i }))
    expect(within(dialog).getByText('Reserva confirmada')).toBeInTheDocument()
    expect(
      within(dialog).queryByText('Reserva expirada')
    ).not.toBeInTheDocument()

    fireEvent.click(
      within(dialog).getByRole('button', { name: /pendientes/i })
    )
    expect(within(dialog).getByText('Reserva creada')).toBeInTheDocument()
    expect(
      within(dialog).queryByText('Reserva confirmada')
    ).not.toBeInTheDocument()
  })

  it('al hacer clic marca como leída y navega al deep link', () => {
    const { dialog, markRead } = setup([notification({ id: 'a' })])
    fireEvent.click(within(dialog).getByText('Reserva confirmada'))
    expect(markRead).toHaveBeenCalledWith('a')
    expect(mockNavigate).toHaveBeenCalledWith(
      '/admin/reservas?reservation=r1'
    )
    expect(
      screen.queryByRole('dialog', { name: 'Notificaciones' })
    ).not.toBeInTheDocument()
  })

  it('el botón eliminar archiva sin abrir el item', () => {
    const { dialog, markRead, archive } = setup([notification({ id: 'a' })])
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Eliminar notificación'
      })
    )
    expect(archive).toHaveBeenCalledWith('a')
    expect(markRead).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('marcar todas leídas invoca markAllRead', () => {
    const { dialog, markAllRead } = setup([notification({ id: 'a' })])
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Marcar todas leídas' })
    )
    expect(markAllRead).toHaveBeenCalledOnce()
  })

  it('muestra estado vacío sin notificaciones', () => {
    const { dialog } = setup([])
    expect(
      within(dialog).getByText('No tienes notificaciones')
    ).toBeInTheDocument()
  })
})
