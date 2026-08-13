import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { query, isDbAvailable, closePool, withTransaction } from '@/test/db'

const DB_AVAILABLE = await isDbAvailable()

beforeAll(async () => {
  if (!DB_AVAILABLE) {
    console.warn('Supabase local no está corriendo — tests de BD saltados')
  }
})

afterAll(async () => {
  await closePool()
})

const ACTIVE_COURT_ID = '13078c93-41fd-46f6-83d1-993d7fe269f9'
const INACTIVE_COURT_ID = '28f5bc8b-4c25-422b-a1c3-833301304269'

// Usuario real de la BD local
const REAL_USER_ID = 'c85a7ca3-28c3-4823-811b-b782bd20fe82'

/**
 * Setea el JWT claim para que auth.uid() funcione dentro de los RPCs.
 * Esto simula el contexto de auth que Supabase JS inyecta automáticamente.
 *
 * No cambiamos el rol (se queda como postgres/superuser) para que
 * los RPCs security definer tengan los permisos necesarios.
 */
async function setAuthContext(client: import('pg').PoolClient, userId: string) {
  await client.query(`set local request.jwt.claim.sub to '${userId}'`)
  await client.query(`set local request.jwt.claims to '{"sub":"${userId}"}'`)
}

describe.skipIf(!DB_AVAILABLE)('create_reservation RPC', () => {
  it('crea una reserva pendiente para un cliente', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const startsAt = tomorrow.toISOString()

      const result = await client.query(
        `select * from public.create_reservation(
          p_court_id := $1,
          p_starts_at := $2,
          p_notes := 'Test reserva'
        )`,
        [ACTIVE_COURT_ID, startsAt]
      )

      expect(result.rows).toHaveLength(1)
      const row = result.rows[0] as Record<string, unknown>
      expect(row).toHaveProperty('id')
      expect(row).toHaveProperty('status')
      expect(row.status).toBe('pending')
      expect(row.error).toBeNull()
    })
  })

  it('rechaza reserva con fecha en el pasado', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(10, 0, 0, 0)
      const startsAt = yesterday.toISOString()

      const result = await client.query(
        `select * from public.create_reservation(
          p_court_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_COURT_ID, startsAt]
      )

      const row = result.rows[0] as Record<string, unknown>
      expect(row.error).toBeTruthy()
    })
  })

  it('rechaza reserva para una cancha inactiva', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const startsAt = tomorrow.toISOString()

      const result = await client.query(
        `select * from public.create_reservation(
          p_court_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [INACTIVE_COURT_ID, startsAt]
      )

      const row = result.rows[0] as Record<string, unknown>
      expect(row.error).toBeTruthy()
    })
  })

  it('rechaza si no hay usuario autenticado (auth.uid null)', async () => {
    await withTransaction(async (client) => {
      // No seteamos auth context — auth.uid() será null

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const startsAt = tomorrow.toISOString()

      const result = await client.query(
        `select * from public.create_reservation(
          p_court_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_COURT_ID, startsAt]
      )

      const row = result.rows[0] as Record<string, unknown>
      expect(row.error).toBe('No autenticado')
    })
  })
})

describe.skipIf(!DB_AVAILABLE)('confirm_reservation RPC', () => {
  it('confirma una reserva pendiente', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(14, 0, 0, 0)
      const startsAt = tomorrow.toISOString()

      const createResult = await client.query(
        `select * from public.create_reservation(
          p_court_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_COURT_ID, startsAt]
      )
      const reservationId = (createResult.rows[0] as Record<string, unknown>).id

      // confirm_reservation usa auth.uid() para decided_by
      await client.query(
        `select public.confirm_reservation(p_reservation_id := $1)`,
        [reservationId]
      )

      const statusResult = await client.query(
        'SELECT status FROM public.reservations WHERE id = $1',
        [reservationId]
      )
      expect(statusResult.rows[0].status).toBe('confirmed')
    })
  })
})

describe.skipIf(!DB_AVAILABLE)('reject_reservation RPC', () => {
  it('rechaza una reserva pendiente con motivo', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(16, 0, 0, 0)
      const startsAt = tomorrow.toISOString()

      const createResult = await client.query(
        `select * from public.create_reservation(
          p_court_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_COURT_ID, startsAt]
      )
      const reservationId = (createResult.rows[0] as Record<string, unknown>).id

      await client.query(
        `select public.reject_reservation(p_reservation_id := $1, p_reason := $2)`,
        [reservationId, 'Cancha en mantenimiento']
      )

      const statusResult = await client.query(
        'SELECT status, decision_reason FROM public.reservations WHERE id = $1',
        [reservationId]
      )
      expect(statusResult.rows[0].status).toBe('rejected')
      expect(statusResult.rows[0].decision_reason).toBe(
        'Cancha en mantenimiento'
      )
    })
  })
})

describe.skipIf(!DB_AVAILABLE)('cancel_reservation_by_client RPC', () => {
  it('cancela una reserva del propio cliente', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(18, 0, 0, 0)
      const startsAt = tomorrow.toISOString()

      const createResult = await client.query(
        `select * from public.create_reservation(
          p_court_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_COURT_ID, startsAt]
      )
      const reservationId = (createResult.rows[0] as Record<string, unknown>).id

      await client.query(
        `select public.cancel_reservation_by_client(p_reservation_id := $1)`,
        [reservationId]
      )

      const statusResult = await client.query(
        'SELECT status FROM public.reservations WHERE id = $1',
        [reservationId]
      )
      expect(statusResult.rows[0].status).toBe('cancelled_by_client')
    })
  })
})

describe.skipIf(!DB_AVAILABLE)('cancel_reservation_by_business RPC', () => {
  it('cancela una reserva confirmada con motivo', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(20, 0, 0, 0)
      const startsAt = tomorrow.toISOString()

      // Crear y confirmar
      const createResult = await client.query(
        `select * from public.create_reservation(
          p_court_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_COURT_ID, startsAt]
      )
      const reservationId = (createResult.rows[0] as Record<string, unknown>).id

      await client.query(
        `select public.confirm_reservation(p_reservation_id := $1)`,
        [reservationId]
      )

      // Cancelar como negocio
      await client.query(
        `select public.cancel_reservation_by_business(p_reservation_id := $1, p_reason := $2)`,
        [reservationId, 'Cliente no se presentó']
      )

      const statusResult = await client.query(
        'SELECT status, decision_reason FROM public.reservations WHERE id = $1',
        [reservationId]
      )
      expect(statusResult.rows[0].status).toBe('cancelled_by_business')
      expect(statusResult.rows[0].decision_reason).toBe(
        'Cliente no se presentó'
      )
    })
  })
})

describe.skipIf(!DB_AVAILABLE)('expire_pending_reservations RPC', () => {
  it('expira reservas pendientes cuyo hold venció', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(11, 0, 0, 0)
      const startsAt = tomorrow.toISOString()

      const createResult = await client.query(
        `select * from public.create_reservation(
          p_court_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_COURT_ID, startsAt]
      )
      const reservationId = (createResult.rows[0] as Record<string, unknown>).id

      // Forzar hold_expires_at al pasado
      await client.query(
        "UPDATE public.reservations SET hold_expires_at = now() - interval '1 hour' WHERE id = $1",
        [reservationId]
      )

      // Ejecutar expiración
      await client.query('select public.expire_pending_reservations()')

      // Verificar que la reserva fue expirada
      const statusResult = await client.query(
        'SELECT status FROM public.reservations WHERE id = $1',
        [reservationId]
      )
      expect(statusResult.rows[0].status).toBe('expired')
    })
  })

  it('no expira reservas confirmadas', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)
      const startsAt = tomorrow.toISOString()

      const createResult = await client.query(
        `select * from public.create_reservation(
          p_court_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_COURT_ID, startsAt]
      )
      const reservationId = (createResult.rows[0] as Record<string, unknown>).id

      // Confirmar la reserva
      await client.query(
        `select public.confirm_reservation(p_reservation_id := $1)`,
        [reservationId]
      )

      // Forzar hold_expires_at al pasado
      await client.query(
        "UPDATE public.reservations SET hold_expires_at = now() - interval '1 hour' WHERE id = $1",
        [reservationId]
      )

      await client.query('select public.expire_pending_reservations()')

      const statusResult = await client.query(
        'SELECT status FROM public.reservations WHERE id = $1',
        [reservationId]
      )
      expect(statusResult.rows[0].status).toBe('confirmed')
    })
  })
})

describe.skipIf(!DB_AVAILABLE)('is_business_member function', () => {
  it('retorna false para un business_id inexistente', async () => {
    const result = await query(
      'SELECT public.is_business_member($1) as is_member',
      ['00000000-0000-0000-0000-000000000000']
    )
    expect((result.rows[0] as Record<string, unknown>).is_member).toBe(false)
  })
})
