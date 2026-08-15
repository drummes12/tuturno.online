import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  query,
  isResourcesSchemaAvailable,
  closePool,
  withTransaction
} from '@/test/db'

const DB_AVAILABLE = await isResourcesSchemaAvailable()

// IDs dinámicos — se buscan antes de los tests para que funcionen
// sin importar si la BD local fue reseteada
let ACTIVE_RESOURCE_ID = ''
let REAL_USER_ID = ''

beforeAll(async () => {
  if (!DB_AVAILABLE) {
    console.warn('Supabase local no está corriendo — tests de BD saltados')
    return
  }

  // Buscar la primera cancha activa
  const courtResult = await query(
    'select id from public.resources where is_active = true order by sort_order limit 1'
  )
  if (courtResult.rows.length > 0) {
    ACTIVE_RESOURCE_ID = courtResult.rows[0].id as string
  }

  // Buscar el primer business member (owner)
  const userResult = await query(
    `select bm.user_id from public.business_members bm
     join auth.users au on au.id = bm.user_id
     where bm.role = 'owner' limit 1`
  )
  if (userResult.rows.length > 0) {
    REAL_USER_ID = userResult.rows[0].user_id as string
  }
})

afterAll(async () => {
  await closePool()
})

// UUID inexistente para simular cancha no disponible
const INACTIVE_RESOURCE_ID = '00000000-0000-0000-0000-000000000000'

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
          p_resource_id := $1,
          p_starts_at := $2,
          p_notes := 'Test reserva'
        )`,
        [ACTIVE_RESOURCE_ID, startsAt]
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
          p_resource_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_RESOURCE_ID, startsAt]
      )

      const row = result.rows[0] as Record<string, unknown>
      expect(row.error).toBeTruthy()
    })
  })

  it('rechaza reservas dentro de la anticipación mínima configurada', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      const startsAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      const result = await client.query(
        `select * from public.create_reservation(
          p_resource_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_RESOURCE_ID, startsAt]
      )

      const row = result.rows[0] as Record<string, unknown>
      expect(row.error).toContain('anticipación')
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
          p_resource_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [INACTIVE_RESOURCE_ID, startsAt]
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
          p_resource_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_RESOURCE_ID, startsAt]
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
          p_resource_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_RESOURCE_ID, startsAt]
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
          p_resource_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_RESOURCE_ID, startsAt]
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
          p_resource_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_RESOURCE_ID, startsAt]
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
          p_resource_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_RESOURCE_ID, startsAt]
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
          p_resource_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_RESOURCE_ID, startsAt]
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
          p_resource_id := $1,
          p_starts_at := $2,
          p_notes := null
        )`,
        [ACTIVE_RESOURCE_ID, startsAt]
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
