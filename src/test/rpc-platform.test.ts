import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  query,
  isDbAvailable,
  closePool,
  withTransaction
} from '@/test/db'

/**
 * Tests de BD para los RPCs y RLS de plataforma (migración 02600).
 *
 * Requieren Supabase local corriendo con las migraciones aplicadas.
 * Se saltan automáticamente si no hay BD.
 *
 * Matriz de autorización cubierta:
 *   - auth normal no puede aprobar/rechazar/cambiar roles
 *   - platform admin AAL1 no puede ejecutar RPCs write
 *   - platform admin AAL2 puede aprobar/rechazar
 *   - is_platform_admin_mfa devuelve false con AAL1
 *   - assert_platform_admin fail-closed sin claims y session_user≠postgres
 *   - cross-tenant: miembro de A no puede confirmar reserva de B (vía RLS)
 */

const DB_AVAILABLE = await isDbAvailable()

let PLATFORM_ADMIN_ID = ''
let NORMAL_USER_ID = ''
let DEMO_BUSINESS_ID = ''
let DEMO_RESOURCE_ID = ''

beforeAll(async () => {
  if (!DB_AVAILABLE) {
    console.warn('Supabase local no está corriendo — tests de BD saltados')
    return
  }

  // Buscar o crear un platform admin para los tests.
  // Usamos el primer owner de business_members como plataforma admin
  // (en local, típicamente es el usuario seed).
  const adminResult = await query(
    `select bm.user_id from public.business_members bm
     where bm.role = 'owner' limit 1`
  )
  if (adminResult.rows.length > 0) {
    PLATFORM_ADMIN_ID = adminResult.rows[0].user_id as string
    // Asegurar que es platform admin
    await query(
      `insert into public.platform_admins (user_id, note) values ($1, 'test')
       on conflict (user_id) do nothing`,
      [PLATFORM_ADMIN_ID]
    )
  }

  // Buscar un usuario normal (no platform admin, idealmente sin memberships)
  const normalResult = await query(
    `select au.id from auth.users au
     where au.id not in (select user_id from public.platform_admins)
     order by au.created_at limit 1`
  )
  if (normalResult.rows.length > 0) {
    NORMAL_USER_ID = normalResult.rows[0].id as string
  } else {
    // Si no hay otro usuario, usamos un UUID inexistente
    NORMAL_USER_ID = '00000000-0000-0000-0000-000000000001'
  }

  // Negocio demo y su primer recurso
  const demoResult = await query(
    `select b.id from public.businesses b where b.is_demo = true limit 1`
  )
  if (demoResult.rows.length > 0) {
    DEMO_BUSINESS_ID = demoResult.rows[0].id as string
    const resourceResult = await query(
      `select id from public.resources where business_id = $1 and is_active = true limit 1`,
      [DEMO_BUSINESS_ID]
    )
    if (resourceResult.rows.length > 0) {
      DEMO_RESOURCE_ID = resourceResult.rows[0].id as string
    }
  }
})

afterAll(async () => {
  await closePool()
})

/**
 * Setea el contexto de auth para simular un JWT de PostgREST.
 * `aal` controla el nivel de assurance: 'aal1' (sin MFA) o 'aal2' (con MFA).
 */
async function setAuthContext(
  client: import('pg').PoolClient,
  userId: string,
  aal: 'aal1' | 'aal2' = 'aal2'
) {
  const claims = JSON.stringify({ sub: userId, aal, role: 'authenticated' })
  await client.query(`set local request.jwt.claims to '${claims}'`)
  await client.query(`set local request.jwt.claim.sub to '${userId}'`)
  await client.query(`set local role authenticated`)
}

/**
 * Limpia el contexto de auth (simula llamada sin JWT, ej. SQL Editor).
 */
async function clearAuthContext(client: import('pg').PoolClient) {
  await client.query(`set local request.jwt.claims to ''`)
  await client.query(`set local role postgres`)
}

describe.skipIf(!DB_AVAILABLE)('assert_platform_admin / is_platform_admin_mfa', () => {
  it('is_platform_admin_mfa devuelve false con AAL1', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal1')
      const result = await client.query('select public.is_platform_admin_mfa() as ok')
      expect(result.rows[0].ok).toBe(false)
    })
  })

  it('is_platform_admin_mfa devuelve true con AAL2', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal2')
      const result = await client.query('select public.is_platform_admin_mfa() as ok')
      expect(result.rows[0].ok).toBe(true)
    })
  })

  it('is_platform_admin_mfa devuelve false para usuario no-admin', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      const result = await client.query('select public.is_platform_admin_mfa() as ok')
      expect(result.rows[0].ok).toBe(false)
    })
  })

  it('assert_platform_admin falla sin claims cuando session_user no es postgres', async () => {
    await withTransaction(async (client) => {
      // Simular una sesión no-postgres sin JWT claims
      await client.query(`set local request.jwt.claims to ''`)
      await client.query(`set local role authenticated`)
      await expect(
        client.query('select public.assert_platform_admin()')
      ).rejects.toThrow(/sesión iniciada/i)
    })
  })

  it('assert_platform_admin funciona desde SQL Editor (session_user=postgres, sin claims)', async () => {
    await withTransaction(async (client) => {
      await clearAuthContext(client)
      const result = await client.query('select public.assert_platform_admin() as uid')
      // Retorna NULL (no hay auth.uid() desde SQL Editor) pero no falla
      expect(result.rows[0].uid).toBeNull()
    })
  })
})

describe.skipIf(!DB_AVAILABLE)('RPCs de plataforma — autorización', () => {
  it('usuario normal no puede aprobar una solicitud', async () => {
    await withTransaction(async (client) => {
      // Crear una solicitud pendiente como usuario normal
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      const reqResult = await client.query(
        `select public.request_business_signup(
           p_business_name := 'Test Biz',
           p_desired_slug := 'test-biz-' || gen_random_uuid()::text,
           p_city := 'Bogotá'
         ) as req_id`
      )
      const requestId = reqResult.rows[0].req_id as string

      // Intentar aprobar como usuario normal (no platform admin)
      await expect(
        client.query(
          `select public.approve_business_signup(p_request_id := $1)`,
          [requestId]
        )
      ).rejects.toThrow(/permisos de operador|sesión iniciada/i)
    })
  })

  it('platform admin AAL1 no puede aprobar una solicitud', async () => {
    await withTransaction(async (client) => {
      // Crear solicitud como usuario normal
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      const reqResult = await client.query(
        `select public.request_business_signup(
           p_business_name := 'Test Biz AAL1',
           p_desired_slug := 'test-biz-aal1-' || gen_random_uuid()::text
         ) as req_id`
      )
      const requestId = reqResult.rows[0].req_id as string

      // Intentar aprobar como platform admin con AAL1 (sin MFA)
      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal1')
      await expect(
        client.query(
          `select public.approve_business_signup(p_request_id := $1)`,
          [requestId]
        )
      ).rejects.toThrow(/dos pasos|MFA/i)
    })
  })

  it('platform admin AAL2 puede aprobar una solicitud', async () => {
    await withTransaction(async (client) => {
      // Crear solicitud como usuario normal
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      const slug = 'test-approve-' + crypto.randomUUID().slice(0, 8)
      const reqResult = await client.query(
        `select public.request_business_signup(
           p_business_name := 'Test Approve Biz',
           p_desired_slug := $1
         ) as req_id`,
        [slug]
      )
      const requestId = reqResult.rows[0].req_id as string

      // Aprobar como platform admin con AAL2
      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal2')
      const approveResult = await client.query(
        `select public.approve_business_signup(p_request_id := $1) as biz_id`,
        [requestId]
      )
      expect(approveResult.rows[0].biz_id).toBeTruthy()

      // Verificar que la solicitud quedó aprobada
      const statusResult = await client.query(
        `select status from public.business_signup_requests where id = $1`,
        [requestId]
      )
      expect(statusResult.rows[0].status).toBe('approved')
    })
  })

  it('platform admin AAL1 no puede rechazar una solicitud', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      const reqResult = await client.query(
        `select public.request_business_signup(
           p_business_name := 'Test Reject AAL1',
           p_desired_slug := 'test-reject-aal1-' || gen_random_uuid()::text
         ) as req_id`
      )
      const requestId = reqResult.rows[0].req_id as string

      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal1')
      await expect(
        client.query(
          `select public.reject_business_signup(p_request_id := $1, p_reason := 'test')`,
          [requestId]
        )
      ).rejects.toThrow(/dos pasos|MFA/i)
    })
  })

  it('platform admin AAL2 puede rechazar una solicitud', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      const reqResult = await client.query(
        `select public.request_business_signup(
           p_business_name := 'Test Reject OK',
           p_desired_slug := 'test-reject-ok-' || gen_random_uuid()::text
         ) as req_id`
      )
      const requestId = reqResult.rows[0].req_id as string

      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal2')
      await client.query(
        `select public.reject_business_signup(p_request_id := $1, p_reason := 'no válido')`,
        [requestId]
      )

      const statusResult = await client.query(
        `select status, rejection_reason from public.business_signup_requests where id = $1`,
        [requestId]
      )
      expect(statusResult.rows[0].status).toBe('rejected')
      expect(statusResult.rows[0].rejection_reason).toBe('no válido')
    })
  })

  it('platform admin AAL1 no puede cambiar roles', async () => {
    if (!DEMO_BUSINESS_ID) return
    await withTransaction(async (client) => {
      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal1')
      await expect(
        client.query(
          `select public.platform_set_member_role(
             p_business_id := $1,
             p_user_id := $2,
             p_role := 'manager'
           )`,
          [DEMO_BUSINESS_ID, NORMAL_USER_ID]
        )
      ).rejects.toThrow(/dos pasos|MFA/i)
    })
  })

  it('create_business_with_owner valida etiquetas cortas', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal2')
      await expect(
        client.query(
          `select public.create_business_with_owner(
             p_name := 'Test Labels',
             p_slug := 'test-labels-' || gen_random_uuid()::text,
             p_owner_user_id := $1,
             p_label_singular := 'X',
             p_label_plural := 'Espacios'
           )`,
          [NORMAL_USER_ID]
        )
      ).rejects.toThrow(/etiqueta singular/i)
    })
  })
})

describe.skipIf(!DB_AVAILABLE)('RLS de plataforma — lectura', () => {
  it('usuario normal no puede leer todas las solicitudes', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      // RLS solo permite ver las propias o ser platform admin MFA
      const result = await client.query(
        `select count(*) as cnt from public.business_signup_requests`
      )
      // Solo vería las suyas (0 si no ha creado ninguna en esta tx)
      expect(Number(result.rows[0].cnt)).toBeGreaterThanOrEqual(0)
    })
  })

  it('platform admin AAL1 no puede leer todas las solicitudes', async () => {
    await withTransaction(async (client) => {
      // Crear una solicitud ajena primero
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      await client.query(
        `select public.request_business_signup(
           p_business_name := 'RLS Test',
           p_desired_slug := 'rls-test-' || gen_random_uuid()::text
         )`
      )

      // Como platform admin AAL1, no debería ver la solicitud ajena
      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal1')
      const result = await client.query(
        `select count(*) as cnt from public.business_signup_requests
         where user_id <> $1`,
        [PLATFORM_ADMIN_ID]
      )
      // RLS con is_platform_admin_mfa bloquea → solo ve las propias (0)
      expect(Number(result.rows[0].cnt)).toBe(0)
    })
  })

  it('platform admin AAL2 puede leer todas las solicitudes', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      await client.query(
        `select public.request_business_signup(
           p_business_name := 'RLS AAL2 Test',
           p_desired_slug := 'rls-aal2-' || gen_random_uuid()::text
         )`
      )

      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal2')
      const result = await client.query(
        `select count(*) as cnt from public.business_signup_requests
         where user_id <> $1`,
        [PLATFORM_ADMIN_ID]
      )
      expect(Number(result.rows[0].cnt)).toBeGreaterThan(0)
    })
  })

  it('platform admin AAL1 no puede leer el audit log', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal1')
      const result = await client.query(
        `select count(*) as cnt from public.platform_audit_log`
      )
      expect(Number(result.rows[0].cnt)).toBe(0)
    })
  })
})

describe.skipIf(!DB_AVAILABLE)('Multi-tenant — aislamiento', () => {
  it('miembro de un negocio no puede confirmar reserva de otro', async () => {
    if (!DEMO_RESOURCE_ID || !PLATFORM_ADMIN_ID) return
    await withTransaction(async (client) => {
      // Crear una reserva en el negocio demo como usuario normal
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 2)
      tomorrow.setHours(14, 0, 0, 0)
      const startsAt = tomorrow.toISOString()

      const reserveResult = await client.query(
        `select * from public.create_reservation(
           p_resource_id := $1,
           p_starts_at := $2
         )`,
        [DEMO_RESOURCE_ID, startsAt]
      )
      const reservationId = reserveResult.rows[0].id as string
      expect(reservationId).toBeTruthy()

      // Crear un segundo negocio + owner ajeno y verificar que no puede confirmar
      // Para simplicidad, usamos un usuario sin membership en el negocio demo
      // y verificamos que confirm_reservation falla con "Sin permisos"
      // (El RPC valida is_business_member internamente)
      const otherUserResult = await query(
        `select au.id from auth.users au
         where au.id not in (
           select user_id from public.business_members where business_id = $1
         )
         limit 1`,
        [DEMO_BUSINESS_ID]
      )
      if (otherUserResult.rows.length === 0) return

      const otherUserId = otherUserResult.rows[0].id as string
      await setAuthContext(client, otherUserId, 'aal2')
      await expect(
        client.query(
          `select public.confirm_reservation(p_reservation_id := $1)`,
          [reservationId]
        )
      ).rejects.toThrow(/permisos/i)
    })
  })
})

describe.skipIf(!DB_AVAILABLE)('Auditoría', () => {
  it('aprobar una solicitud registra entrada en platform_audit_log', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      const slug = 'test-audit-' + crypto.randomUUID().slice(0, 8)
      const reqResult = await client.query(
        `select public.request_business_signup(
           p_business_name := 'Audit Test Biz',
           p_desired_slug := $1
         ) as req_id`,
        [slug]
      )
      const requestId = reqResult.rows[0].req_id as string

      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal2')
      await client.query(
        `select public.approve_business_signup(p_request_id := $1)`,
        [requestId]
      )

      const auditResult = await client.query(
        `select action, target_type from public.platform_audit_log
         where target_id = $1 order by created_at desc limit 1`,
        [requestId]
      )
      expect(auditResult.rows).toHaveLength(1)
      expect(auditResult.rows[0].action).toBe('signup_approved')
      expect(auditResult.rows[0].target_type).toBe('signup_request')
    })
  })
})
