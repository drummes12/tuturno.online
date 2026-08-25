import { describe, expect, it } from 'vitest'
import type { Reservation } from '@/types'
import {
  filterReservations,
  getEffectiveReservationStatus,
  uniqueReservations
} from '@/lib/reservation-status'

const FIXED_NOW = new Date('2026-02-01T00:00:00Z')

const makeReservation = (
  id: string,
  status: Reservation['status'],
  overrides: Partial<Reservation> = {}
): Reservation => ({
  id,
  business_id: 'business-1',
  resource_id: 'resource-1',
  user_id: 'user-1',
  client_id: 'client-1',
  starts_at: '2026-01-15T10:00:00Z',
  ends_at: '2026-01-15T11:00:00Z',
  status,
  hold_expires_at: null,
  notes: null,
  decision_reason: null,
  decided_by: null,
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-01T10:00:00Z',
  ...overrides
})

describe('getEffectiveReservationStatus', () => {
  it('marca como completada una confirmada cuyo turno ya terminó', () => {
    const reservation = makeReservation('r1', 'confirmed')

    expect(
      getEffectiveReservationStatus(
        reservation,
        new Date('2026-01-15T11:00:00Z')
      )
    ).toBe('completed')
  })

  it('mantiene confirmada una reserva cuyo turno aún no termina', () => {
    const reservation = makeReservation('r1', 'confirmed')

    expect(
      getEffectiveReservationStatus(
        reservation,
        new Date('2026-01-15T10:59:59Z')
      )
    ).toBe('confirmed')
  })
})

describe('uniqueReservations', () => {
  it('conserva una sola reserva por recurso y horario con el último estado', () => {
    const first = makeReservation('r1', 'rejected', {
      updated_at: '2026-01-01T10:01:00Z'
    })
    const latest = makeReservation('r2', 'confirmed', {
      updated_at: '2026-01-01T10:02:00Z'
    })

    const result = uniqueReservations([first, latest], FIXED_NOW)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'r2', status: 'completed' })
  })

  it('no mezcla reservas de recursos u horarios distintos', () => {
    const sameResource = makeReservation('r1', 'confirmed')
    const otherResource = makeReservation('r2', 'confirmed', {
      resource_id: 'resource-2'
    })
    const otherTime = makeReservation('r3', 'confirmed', {
      starts_at: '2026-01-15T12:00:00Z',
      ends_at: '2026-01-15T13:00:00Z'
    })

    expect(
      uniqueReservations([sameResource, otherResource, otherTime], FIXED_NOW)
    ).toHaveLength(3)
  })
})

describe('filterReservations', () => {
  it('aplica el filtro después de consolidar para respetar el último estado', () => {
    const rejected = makeReservation('r1', 'rejected', {
      updated_at: '2026-01-01T10:01:00Z'
    })
    const confirmed = makeReservation('r2', 'confirmed', {
      updated_at: '2026-01-01T10:02:00Z'
    })

    expect(
      filterReservations([rejected, confirmed], 'rejected', FIXED_NOW)
    ).toEqual([])
    expect(
      filterReservations([rejected, confirmed], 'completed', FIXED_NOW)
    ).toHaveLength(1)
  })

  it('incluye cancelaciones del cliente y del negocio', () => {
    const clientCancellation = makeReservation('r1', 'cancelled_by_client', {
      starts_at: '2026-01-15T10:00:00Z'
    })
    const businessCancellation = makeReservation(
      'r2',
      'cancelled_by_business',
      {
        starts_at: '2026-01-15T12:00:00Z'
      }
    )

    expect(
      filterReservations(
        [clientCancellation, businessCancellation],
        'cancelled'
      )
    ).toHaveLength(2)
  })
})
