import type {
  Reservation,
  ReservationFilter,
  ReservationStatus
} from '@/types'

export function getEffectiveReservationStatus(
  reservation: Reservation,
  now = new Date()
): ReservationStatus {
  if (
    reservation.status === 'confirmed' &&
    new Date(reservation.ends_at).getTime() <= now.getTime()
  ) {
    return 'completed'
  }

  return reservation.status
}

function reservationKey(reservation: Reservation): string {
  return [
    reservation.business_id,
    reservation.resource_id,
    reservation.starts_at
  ].join(':')
}

function isMoreRecent(candidate: Reservation, current: Reservation): boolean {
  const candidateUpdatedAt = new Date(candidate.updated_at).getTime()
  const currentUpdatedAt = new Date(current.updated_at).getTime()

  if (candidateUpdatedAt !== currentUpdatedAt) {
    return candidateUpdatedAt > currentUpdatedAt
  }

  const candidateCreatedAt = new Date(candidate.created_at).getTime()
  const currentCreatedAt = new Date(current.created_at).getTime()

  if (candidateCreatedAt !== currentCreatedAt) {
    return candidateCreatedAt > currentCreatedAt
  }

  return candidate.id > current.id
}

export function uniqueReservations(
  reservations: Reservation[],
  now = new Date()
): Reservation[] {
  const latestBySlot = new Map<string, Reservation>()

  for (const reservation of reservations) {
    const normalized = {
      ...reservation,
      status: getEffectiveReservationStatus(reservation, now)
    }
    const key = reservationKey(normalized)
    const current = latestBySlot.get(key)

    if (!current || isMoreRecent(normalized, current)) {
      latestBySlot.set(key, normalized)
    }
  }

  return [...latestBySlot.values()]
}

export function filterReservations(
  reservations: Reservation[],
  filter: ReservationFilter = 'all',
  now = new Date()
): Reservation[] {
  const unique = uniqueReservations(reservations, now)

  if (filter === 'all') return unique
  if (filter === 'cancelled') {
    return unique.filter((reservation) =>
      ['cancelled_by_client', 'cancelled_by_business'].includes(
        reservation.status
      )
    )
  }

  return unique.filter((reservation) => reservation.status === filter)
}
