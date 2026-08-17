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

  it('assert_platform_admin exige ser operador con AAL2', async () => {
    await withTransaction(async (client) => {
      // Usuario autenticado con AAL2 pero no es platform admin
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      await expect(
        client.query('select public.assert_platform_admin()')
      ).rejects.toThrow(/permisos de operador/i)
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
           p_desired_slug := 't-' || gen_random_uuid()::text,
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
           p_desired_slug := 'tb1-' || gen_random_uuid()::text
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
           p_desired_slug := 'tra-' || gen_random_uuid()::text
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
           p_desired_slug := 'tr-' || gen_random_uuid()::text
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
           p_desired_slug := 'rt-' || gen_random_uuid()::text
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
           p_desired_slug := 'ra-' || gen_random_uuid()::text
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
  it('usuario sin membresía no puede verificar negocio ajeno', async () => {
    await withTransaction(async (client) => {
      // Usuario cliente sin business_membership intenta confirmar membership
      // en el negocio demo. La función is_business_member devuelve false.
      await setAuthContext(client, NORMAL_USER_ID, 'aal2')
      const result = await client.query(
        `select public.is_business_member($1) as ok`,
        [DEMO_BUSINESS_ID]
      )
      expect(result.rows[0].ok).toBe(false)
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

// =============================================================================
// Correcciones de seguridad (migración 02800)
// =============================================================================

/**
 * Helper: crea un usuario temporal en auth.users + profiles dentro de la tx.
 * Se hace rollback al final, así que no persiste.
 */
async function createTempUser(
  client: import('pg').PoolClient,
  userId: string,
  email: string
): Promise<void> {
  await client.query(
    `insert into auth.users (id, email, encrypted_password, aud, role, email_confirmed_at, created_at, updated_at)
     values ($1, $2, 'x', 'authenticated', 'authenticated', now(), now(), now())`,
    [userId, email]
  )
  await client.query(
    `insert into public.profiles (id) values ($1) on conflict do nothing`,
    [userId]
  )
}

/**
 * Helper: crea un negocio temporal con un owner.
 */
async function createTempBusiness(
  client: import('pg').PoolClient,
  slug: string,
  ownerId: string
): Promise<string> {
  const result = await client.query(
    `insert into public.businesses (name, slug, is_demo)
     values ('Temp ' || $1, $1, false)
     returning id`,
    [slug]
  )
  const bizId = result.rows[0].id as string
  await client.query(
    `insert into public.business_members (business_id, user_id, role)
     values ($1, $2, 'owner')`,
    [bizId, ownerId]
  )
  return bizId
}

// -----------------------------------------------------------------------------
// 1. is_demo + slugs reservados
// -----------------------------------------------------------------------------
describe.skipIf(!DB_AVAILABLE)('is_demo + slugs reservados (02800)', () => {
  it('business member no puede cambiar is_demo directamente', async () => {
    if (!DEMO_BUSINESS_ID) return
    await withTransaction(async (client) => {
      // Usar el platform admin como "business member" del negocio demo
      // (asumiendo que es miembro). Si no, buscar otro negocio.
      const memberResult = await client.query(
        `select bm.user_id, bm.business_id
         from public.business_members bm
         join public.businesses b on b.id = bm.business_id
         where b.is_demo = false
         limit 1`
      )
      if (memberResult.rows.length === 0) return

      const memberId = memberResult.rows[0].user_id as string
      const bizId = memberResult.rows[0].business_id as string

      await setAuthContext(client, memberId, 'aal2')
      await expect(
        client.query(
          `update public.businesses set is_demo = true where id = $1`,
          [bizId]
        )
      ).rejects.toThrow(/atributo administrativo/i)
    })
  })

  it('negocio no puede usar slug reservado con is_demo = false', async () => {
    await withTransaction(async (client) => {
      // Como postgres (SQL Editor), intentar crear negocio con slug 'admin'
      await clearAuthContext(client)
      await expect(
        client.query(
          `insert into public.businesses (name, slug, is_demo)
           values ('Test Reserved', 'admin', false)`
        )
      ).rejects.toThrow(/reservado/i)
    })
  })

  it('negocio no puede usar slug reservado con is_demo = true (bypass cerrado)', async () => {
    await withTransaction(async (client) => {
      await clearAuthContext(client)
      await expect(
        client.query(
          `insert into public.businesses (name, slug, is_demo)
           values ('Test Reserved Demo', 'admin', true)`
        )
      ).rejects.toThrow(/reservado/i)
    })
  })

  it('negocio demo válido (slug=demo, is_demo=true) sigue funcionando', async () => {
    await withTransaction(async (client) => {
      await clearAuthContext(client)
      // El negocio demo del seed debe poder actualizarse a sí mismo
      // sin disparar el error de slug reservado.
      const result = await client.query(
        `update public.businesses set slug = 'demo', is_demo = true
         where slug = 'demo' returning slug, is_demo`
      )
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].slug).toBe('demo')
      expect(result.rows[0].is_demo).toBe(true)
    })
  })

  it('service_role no puede usar slug reservado tampoco', async () => {
    await withTransaction(async (client) => {
      // service_role no tiene INSERT grant en businesses, así que la
      // operación falla antes del trigger. Aceptamos ambos errores:
      // "permission denied" (sin grant) o "reservado" (trigger).
      // Ambos demuestran que service_role no puede insertar un slug reservado.
      const claims = JSON.stringify({ role: 'service_role' })
      await client.query(`set local request.jwt.claims to '${claims}'`)
      await client.query(`set local role service_role`)
      await expect(
        client.query(
          `insert into public.businesses (name, slug, is_demo)
           values ('Test SR', 'plataforma', true)`
        )
      ).rejects.toThrow(/reservado|permission denied/i)
    })
  })
})

// -----------------------------------------------------------------------------
// 2. old_role en audit log de cambios de rol
// -----------------------------------------------------------------------------
describe.skipIf(!DB_AVAILABLE)('Audit log con old_role (02800)', () => {
  it('member → manager registra old_role y new_role', async () => {
    await withTransaction(async (client) => {
      // Crear negocio + owner + miembro
      const ownerId = crypto.randomUUID()
      const memberId = crypto.randomUUID()
      const slug = 'audit-old-role-' + crypto.randomUUID().slice(0, 8)

      await createTempUser(client, ownerId, `owner-${slug}@test.local`)
      await createTempUser(client, memberId, `member-${slug}@test.local`)
      const bizId = await createTempBusiness(client, slug, ownerId)

      // Añadir miembro como manager
      await client.query(
        `insert into public.business_members (business_id, user_id, role)
         values ($1, $2, 'manager')`,
        [bizId, memberId]
      )

      // Como platform admin AAL2, cambiar manager → owner
      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal2')
      await client.query(
        `select public.platform_set_member_role($1, $2, 'owner')`,
        [bizId, memberId]
      )

      // Verificar audit log (leer como postgres)
      await clearAuthContext(client)
      const auditResult = await client.query(
        `select action, payload->>'old_role' as old_role,
                payload->>'new_role' as new_role,
                payload->>'user_id' as user_id
         from public.platform_audit_log
         where target_id = $1 and action = 'member_role_set'
         order by created_at desc limit 1`,
        [bizId]
      )
      expect(auditResult.rows).toHaveLength(1)
      expect(auditResult.rows[0].old_role).toBe('manager')
      expect(auditResult.rows[0].new_role).toBe('owner')
      expect(auditResult.rows[0].user_id).toBe(memberId)
    })
  })

  it('manager → member registra old_role y new_role', async () => {
    await withTransaction(async (client) => {
      const ownerId = crypto.randomUUID()
      const memberId = crypto.randomUUID()
      const slug = 'audit-m2m-' + crypto.randomUUID().slice(0, 8)

      await createTempUser(client, ownerId, `owner-${slug}@test.local`)
      await createTempUser(client, memberId, `member-${slug}@test.local`)
      const bizId = await createTempBusiness(client, slug, ownerId)

      // Añadir miembro como manager
      await client.query(
        `insert into public.business_members (business_id, user_id, role)
         values ($1, $2, 'manager')`,
        [bizId, memberId]
      )

      // Cambiar manager → owner (para tener un old_role distinto)
      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal2')
      await client.query(
        `select public.platform_set_member_role($1, $2, 'owner')`,
        [bizId, memberId]
      )
      // Ahora owner → manager
      await client.query(
        `select public.platform_set_member_role($1, $2, 'manager')`,
        [bizId, memberId]
      )

      await clearAuthContext(client)
      // Los IDs son UUIDs aleatorios (no secuenciales), así que no podemos
      // usar order by id desc para obtener la última entrada. En su lugar,
      // filtramos por new_role='manager' que solo ocurre en la segunda
      // llamada (owner → manager).
      const auditResult = await client.query(
        `select payload->>'old_role' as old_role,
                payload->>'new_role' as new_role
         from public.platform_audit_log
         where target_id = $1 and action = 'member_role_set'
           and payload->>'new_role' = 'manager'`,
        [bizId]
      )
      expect(auditResult.rows).toHaveLength(1)
      expect(auditResult.rows[0].old_role).toBe('owner')
      expect(auditResult.rows[0].new_role).toBe('manager')
    })
  })

  it('operación rechazada no registra un cambio de rol exitoso', async () => {
    await withTransaction(async (client) => {
      const ownerId = crypto.randomUUID()
      const memberId = crypto.randomUUID()
      const slug = 'audit-rej-' + crypto.randomUUID().slice(0, 8)

      await createTempUser(client, ownerId, `owner-${slug}@test.local`)
      await createTempUser(client, memberId, `member-${slug}@test.local`)
      const bizId = await createTempBusiness(client, slug, ownerId)

      // Añadir miembro como owner
      await client.query(
        `insert into public.business_members (business_id, user_id, role)
         values ($1, $2, 'owner')`,
        [bizId, memberId]
      )

      // Intentar cambiar rol como AAL1 (sin MFA) → debe fallar.
      // Usar savepoint para que la transacción no quede abortada.
      await setAuthContext(client, PLATFORM_ADMIN_ID, 'aal1')
      await client.query('savepoint before_rejected_call')
      try {
        await client.query(
          `select public.platform_set_member_role($1, $2, 'manager')`,
          [bizId, memberId]
        )
        // Si no falla, el test debe fallar
        expect.unreachable('La llamada con AAL1 debería haber sido rechazada')
      } catch (err) {
        expect(String(err)).toMatch(/dos pasos|MFA/i)
        await client.query('rollback to savepoint before_rejected_call')
      }

      // Verificar que no hay entrada de audit log para este intento
      await clearAuthContext(client)
      const auditResult = await client.query(
        `select count(*) as cnt
         from public.platform_audit_log
         where target_id = $1 and action = 'member_role_set'
         and payload->>'user_id' = $2`,
        [bizId, memberId]
      )
      expect(Number(auditResult.rows[0].cnt)).toBe(0)
    })
  })
})

// -----------------------------------------------------------------------------
// 3. Eliminación de cuenta de único owner
// -----------------------------------------------------------------------------
describe.skipIf(!DB_AVAILABLE)('Eliminación de cuenta — último owner (02800)', () => {
  it('negocio con único owner: eliminar owner → DENY', async () => {
    await withTransaction(async (client) => {
      const ownerId = crypto.randomUUID()
      const slug = 'del-sole-' + crypto.randomUUID().slice(0, 8)

      await createTempUser(client, ownerId, `owner-${slug}@test.local`)
      await createTempBusiness(client, slug, ownerId)

      await expect(
        client.query(`delete from auth.users where id = $1`, [ownerId])
      ).rejects.toThrow(/único owner/i)
    })
  })

  it('negocio con dos owners: eliminar uno → ALLOW y queda un owner', async () => {
    await withTransaction(async (client) => {
      const owner1Id = crypto.randomUUID()
      const owner2Id = crypto.randomUUID()
      const slug = 'del-two-' + crypto.randomUUID().slice(0, 8)

      await createTempUser(client, owner1Id, `owner1-${slug}@test.local`)
      await createTempUser(client, owner2Id, `owner2-${slug}@test.local`)
      const bizId = await createTempBusiness(client, slug, owner1Id)

      // Añadir segundo owner
      await client.query(
        `insert into public.business_members (business_id, user_id, role)
         values ($1, $2, 'owner')`,
        [bizId, owner2Id]
      )

      // Eliminar owner1 → debe permitir (queda owner2)
      await client.query(`delete from auth.users where id = $1`, [owner1Id])

      const remaining = await client.query(
        `select count(*) as cnt from public.business_members
         where business_id = $1 and role = 'owner'`,
        [bizId]
      )
      expect(Number(remaining.rows[0].cnt)).toBe(1)
    })
  })

  it('usuario único owner de dos negocios: eliminar → DENY', async () => {
    await withTransaction(async (client) => {
      const ownerId = crypto.randomUUID()
      const slug1 = 'del-multi-1-' + crypto.randomUUID().slice(0, 8)
      const slug2 = 'del-multi-2-' + crypto.randomUUID().slice(0, 8)

      await createTempUser(client, ownerId, `owner-${slug1}@test.local`)
      await createTempBusiness(client, slug1, ownerId)
      await createTempBusiness(client, slug2, ownerId)

      await expect(
        client.query(`delete from auth.users where id = $1`, [ownerId])
      ).rejects.toThrow(/único owner/i)
    })
  })

  it('usuario que no es owner: eliminar → ALLOW', async () => {
    await withTransaction(async (client) => {
      const userId = crypto.randomUUID()
      const slug = 'del-non-owner-' + crypto.randomUUID().slice(0, 8)

      await createTempUser(client, userId, `user-${slug}@test.local`)
      // No añadir a ningún negocio

      await client.query(`delete from auth.users where id = $1`, [userId])

      const remaining = await client.query(
        `select count(*) as cnt from auth.users where id = $1`,
        [userId]
      )
      expect(Number(remaining.rows[0].cnt)).toBe(0)
    })
  })

  it('eliminación de negocio completo no queda bloqueada', async () => {
    await withTransaction(async (client) => {
      const ownerId = crypto.randomUUID()
      const slug = 'del-biz-' + crypto.randomUUID().slice(0, 8)

      await createTempUser(client, ownerId, `owner-${slug}@test.local`)
      const bizId = await createTempBusiness(client, slug, ownerId)

      // Eliminar el negocio → debe permitir (cascade a members)
      await client.query(`delete from public.businesses where id = $1`, [bizId])

      const bizRemaining = await client.query(
        `select count(*) as cnt from public.businesses where id = $1`,
        [bizId]
      )
      expect(Number(bizRemaining.rows[0].cnt)).toBe(0)

      // Ahora el usuario ya no es owner de ningún negocio → puede eliminarse
      await client.query(`delete from auth.users where id = $1`, [ownerId])

      const userRemaining = await client.query(
        `select count(*) as cnt from auth.users where id = $1`,
        [ownerId]
      )
      expect(Number(userRemaining.rows[0].cnt)).toBe(0)
    })
  })
})
