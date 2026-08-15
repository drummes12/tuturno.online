import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sortReservationsByPriority } from '@/lib/sort'
import type { Reservation } from '@/types'

// Mock Date.now para tests deterministas
const FIXED_NOW = '2025-01-15T12:00:00Z'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(FIXED_NOW))
})

function makeReservation(
  id: string,
  startsAt: string,
  status: Reservation['status']
): Reservation {
  return {
    id,
    business_id: 'biz-1',
    resource_id: 'court-1',
    user_id: 'user-1',
    client_id: null,
    starts_at: startsAt,
    ends_at: startsAt,
    status,
    hold_expires_at: null,
    notes: null,
    decision_reason: null,
    decided_by: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
}

describe('sortReservationsByPriority', () => {
  it('retorna array vacío para input vacío', () => {
    expect(sortReservationsByPriority([])).toEqual([])
  })

  it('coloca pendientes primero, ordenadas por starts_at ascendente', () => {
    const r1 = makeReservation('1', '2025-01-15T14:00:00Z', 'pending')
    const r2 = makeReservation('2', '2025-01-15T10:00:00Z', 'pending')
    const result = sortReservationsByPriority([r1, r2])
    expect(result[0].id).toBe('2') // más antigua primero
    expect(result[1].id).toBe('1')
  })

  it('coloca confirmed después de pending, ordenadas ascendente', () => {
    const pending = makeReservation('p', '2025-01-15T14:00:00Z', 'pending')
    const confirmed = makeReservation('c', '2025-01-15T10:00:00Z', 'confirmed')
    const result = sortReservationsByPriority([confirmed, pending])
    expect(result[0].id).toBe('p')
    expect(result[1].id).toBe('c')
  })

  it('coloca próximas (futuras, no pending/confirmed) después de confirmed', () => {
    const pending = makeReservation('p', '2025-01-15T14:00:00Z', 'pending')
    const confirmed = makeReservation('c', '2025-01-15T14:00:00Z', 'confirmed')
    const upcoming = makeReservation('u', '2025-01-16T10:00:00Z', 'completed')
    const result = sortReservationsByPriority([upcoming, confirmed, pending])
    expect(result.map((r) => r.id)).toEqual(['p', 'c', 'u'])
  })

  it('coloca pasadas al final, ordenadas descendente', () => {
    const past1 = makeReservation('p1', '2025-01-14T10:00:00Z', 'completed')
    const past2 = makeReservation('p2', '2025-01-13T10:00:00Z', 'completed')
    const result = sortReservationsByPriority([past1, past2])
    expect(result[0].id).toBe('p1') // más reciente primero
    expect(result[1].id).toBe('p2')
  })

  it('mezcla todos los grupos en orden correcto', () => {
    const pending = makeReservation('pend', '2025-01-15T14:00:00Z', 'pending')
    const confirmed = makeReservation('conf', '2025-01-15T15:00:00Z', 'confirmed')
    const upcoming = makeReservation('up', '2025-01-16T10:00:00Z', 'completed')
    const past = makeReservation('past', '2025-01-14T10:00:00Z', 'rejected')
    const result = sortReservationsByPriority([past, upcoming, confirmed, pending])
    expect(result.map((r) => r.id)).toEqual(['pend', 'conf', 'up', 'past'])
  })

  it('cancelled_by_client va al grupo de pasadas', () => {
    const cancelled = makeReservation('c', '2025-01-16T10:00:00Z', 'cancelled_by_client')
    const result = sortReservationsByPriority([cancelled])
    expect(result[0].id).toBe('c')
  })

  it('cancelled_by_business va al grupo de pasadas', () => {
    const cancelled = makeReservation('c', '2025-01-16T10:00:00Z', 'cancelled_by_business')
    const result = sortReservationsByPriority([cancelled])
    expect(result[0].id).toBe('c')
  })

  it('rejected va al grupo de pasadas incluso si es futura', () => {
    const rejected = makeReservation('r', '2025-01-20T10:00:00Z', 'rejected')
    const result = sortReservationsByPriority([rejected])
    expect(result[0].id).toBe('r')
  })

  it('expired va al grupo de pasadas', () => {
    const expired = makeReservation('e', '2025-01-20T10:00:00Z', 'expired')
    const result = sortReservationsByPriority([expired])
    expect(result[0].id).toBe('e')
  })

  it('no duplica reservas entre grupos', () => {
    const r = makeReservation('r', '2025-01-15T14:00:00Z', 'pending')
    const result = sortReservationsByPriority([r, r])
    // Cada reserva aparece una vez por grupo al que pertenece
    // pending aparece en pending, no en upcoming ni past
    expect(result).toHaveLength(2)
    expect(result.every((x) => x.id === 'r')).toBe(true)
  })
})
