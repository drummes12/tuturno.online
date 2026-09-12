import { describe, expect, it } from 'vitest'
import {
  countUnread,
  describeNotification,
  getNotificationState,
  getNotificationUrl,
  isNotificationPending,
  isNotificationUnread
} from '@/lib/notifications'
import type { AppNotification } from '@/types'

function build(partial: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    type: 'reservation_confirmed',
    payload: {},
    created_at: '2026-01-01T10:00:00Z',
    read_at: null,
    reservation_id: null,
    reservation_status: null,
    reservation_number: null,
    ...partial
  }
}

describe('describeNotification', () => {
  it('genera título y cuerpo para cada tipo conocido', () => {
    const payload = { business_name: 'Canchas FC', resource_name: 'Cancha 1' }
    const cases: Array<[string, string, RegExp]> = [
      ['reservation_created_client', 'Reserva creada', /Tu solicitud para Cancha 1 en Canchas FC fue creada\./],
      ['reservation_created_business', 'Nueva reserva', /nueva solicitud para Cancha 1 en Canchas FC/],
      ['reservation_created_by_business', 'Reserva creada', /Se creó una reserva para Cancha 1 en Canchas FC/],
      ['reservation_confirmed', 'Reserva confirmada', /fue confirmada\./],
      ['reservation_rejected', 'Reserva rechazada', /fue rechazada\./],
      ['reservation_cancelled_client', 'Reserva cancelada', /Cancelaste tu reserva/],
      ['reservation_cancelled_business', 'Reserva cancelada', /cancelada por el cliente\./],
      ['reservation_cancelled_by_business', 'Reserva cancelada por el negocio', /fue cancelada\./],
      ['reservation_expired', 'Reserva expirada', /expiró\./]
    ]

    for (const [type, title, body] of cases) {
      const result = describeNotification(build({ type, payload }))
      expect(result.title).toBe(title)
      expect(result.body).toMatch(body)
    }
  })

  it('usa fallbacks cuando faltan datos del payload', () => {
    const { body } = describeNotification(
      build({ type: 'reservation_confirmed', payload: {} })
    )
    expect(body).toContain('tu espacio')
    expect(body).toContain('Tu negocio')
  })

  it('devuelve el mensaje genérico para tipos desconocidos', () => {
    const result = describeNotification(build({ type: 'otra_cosa' }))
    expect(result).toEqual({
      title: 'Actualización de TuTurno',
      body: 'Tienes una novedad en una de tus reservas.'
    })
  })
})

describe('getNotificationUrl', () => {
  it('devuelve rutas internas', () => {
    expect(
      getNotificationUrl(
        build({ payload: { url: '/admin/reservas?reservation=abc' } })
      )
    ).toBe('/admin/reservas?reservation=abc')
  })

  it('rechaza URLs externas y valores inválidos', () => {
    expect(
      getNotificationUrl(build({ payload: { url: 'https://evil.com/x' } }))
    ).toBeNull()
    expect(getNotificationUrl(build({ payload: { url: 42 } }))).toBeNull()
    expect(getNotificationUrl(build({ payload: {} }))).toBeNull()
  })
})

describe('estado de notificaciones', () => {
  it('isNotificationUnread detecta read_at nulo', () => {
    expect(isNotificationUnread(build({ read_at: null }))).toBe(true)
    expect(isNotificationUnread(build({ read_at: '2026-01-01' }))).toBe(false)
  })

  it('isNotificationPending detecta reserva pendiente', () => {
    expect(
      isNotificationPending(build({ reservation_status: 'pending' }))
    ).toBe(true)
    expect(
      isNotificationPending(build({ reservation_status: 'confirmed' }))
    ).toBe(false)
  })

  it('getNotificationState prioriza pendiente sobre no leída', () => {
    expect(
      getNotificationState(
        build({ reservation_status: 'pending', read_at: null })
      )
    ).toBe('pending')
    expect(
      getNotificationState(
        build({ reservation_status: 'confirmed', read_at: null })
      )
    ).toBe('unread')
    expect(
      getNotificationState(
        build({ reservation_status: 'pending', read_at: '2026-01-01' })
      )
    ).toBe('pending')
    expect(getNotificationState(build({ read_at: '2026-01-01' }))).toBe('read')
  })

  it('countUnread cuenta solo las no leídas', () => {
    const list = [
      build({ id: 'a', read_at: null }),
      build({ id: 'b', read_at: '2026-01-01' }),
      build({ id: 'c', read_at: null })
    ]
    expect(countUnread(list)).toBe(2)
    expect(countUnread([])).toBe(0)
  })
})
