import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  query,
  isDbAvailable,
  isPrivacySchemaAvailable,
  closePool,
  withTransaction
} from '@/test/db'

/**
 * Tests de BD para los RPCs de privacidad y consentimiento (migración 03000).
 *
 * Requieren Supabase local corriendo con las migraciones aplicadas.
 * Se saltan automáticamente si no hay BD o si el esquema de privacidad
 * no está aplicado todavía.
 */

const DB_AVAILABLE = await isDbAvailable()
const PRIVACY_SCHEMA_AVAILABLE = await isPrivacySchemaAvailable()
const RUN_TESTS = DB_AVAILABLE && PRIVACY_SCHEMA_AVAILABLE

let REAL_USER_ID = ''
let REAL_BUSINESS_ID = ''

beforeAll(async () => {
  if (!RUN_TESTS) {
    if (!PRIVACY_SCHEMA_AVAILABLE) {
      console.warn(
        'Esquema de privacidad no aplicado — tests de BD de privacidad saltados. ' +
          'Aplica las migraciones 03000 y 03100 en Supabase local.'
      )
    }
    return
  }

  // Buscar el primer owner
  const userResult = await query(
    `select bm.user_id, bm.business_id from public.business_members bm
     where bm.role = 'owner' limit 1`
  )
  if (userResult.rows.length > 0) {
    REAL_USER_ID = userResult.rows[0].user_id as string
    REAL_BUSINESS_ID = userResult.rows[0].business_id as string
  }
})

afterAll(async () => {
  await closePool()
})

async function setAuthContext(client: import('pg').PoolClient, userId: string) {
  await client.query(`set local request.jwt.claim.sub to '${userId}'`)
  await client.query(
    `set local request.jwt.claims to '{"sub":"${userId}","role":"authenticated"}'`
  )
}

describe.skipIf(!RUN_TESTS)('privacy_consents RPCs', () => {
  it('record_registration_consent registra la aceptación de términos', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      const result = await client.query(
        `select * from public.record_registration_consent('2026-12-08-v1', 'registration')`
      )
      expect(result.rows[0]).toBeTruthy()

      const consent = await client.query(
        `select * from public.privacy_consents
         where subject_user_id = $1 and purpose = 'terms_and_privacy'
         order by created_at desc limit 1`,
        [REAL_USER_ID]
      )
      expect(consent.rows[0].status).toBe('accepted')
      expect(consent.rows[0].policy_version).toBe('2026-12-08-v1')
      expect(consent.rows[0].business_id).toBeNull()
    })
  })

  it('record_registration_consent es idempotente para la misma versión', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      const r1 = await client.query(
        `select * from public.record_registration_consent('2026-12-08-v1', 'registration')`
      )
      const r2 = await client.query(
        `select * from public.record_registration_consent('2026-12-08-v1', 'registration')`
      )
      expect(r1.rows[0].record_registration_consent).toBe(
        r2.rows[0].record_registration_consent
      )

      const count = await client.query(
        `select count(*)::int as n from public.privacy_consents
         where subject_user_id = $1 and purpose = 'terms_and_privacy'
           and policy_version = '2026-12-08-v1'`,
        [REAL_USER_ID]
      )
      expect(count.rows[0].n).toBe(1)
    })
  })

  it('set_marketing_consent registra el opt-in de marketing por negocio', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      await client.query(
        `select * from public.set_marketing_consent($1, '2026-12-08-v1', true, 'reservation')`,
        [REAL_BUSINESS_ID]
      )

      const consent = await client.query(
        `select * from public.privacy_consents
         where subject_user_id = $1 and purpose = 'marketing_email'
           and business_id = $2
         order by created_at desc limit 1`,
        [REAL_USER_ID, REAL_BUSINESS_ID]
      )
      expect(consent.rows[0].status).toBe('accepted')
      expect(consent.rows[0].business_id).toBe(REAL_BUSINESS_ID)
    })
  })

  it('withdraw_marketing_consent retira el consentimiento vigente', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      // Aceptar primero
      await client.query(
        `select * from public.set_marketing_consent($1, '2026-12-08-v1', true, 'test')`,
        [REAL_BUSINESS_ID]
      )

      // Retirar
      await client.query(
        `select * from public.withdraw_marketing_consent($1)`,
        [REAL_BUSINESS_ID]
      )

      const consent = await client.query(
        `select * from public.privacy_consents
         where subject_user_id = $1 and purpose = 'marketing_email'
           and business_id = $2
           and status = 'accepted'`,
        [REAL_USER_ID, REAL_BUSINESS_ID]
      )
      expect(consent.rows.length).toBe(0)
    })
  })

  it('has_marketing_consent devuelve false sin opt-in previo', async () => {
    await withTransaction(async (client) => {
      // Sin setear auth context, has_marketing_consent no depende de auth.uid
      const result = await client.query(
        `select * from public.has_marketing_consent($1, $2, null)`,
        [REAL_BUSINESS_ID, REAL_USER_ID]
      )
      // En una transacción limpia, no debería haber consentimiento previo
      expect(result.rows[0].has_marketing_consent).toBe(false)
    })
  })

  it('has_marketing_consent devuelve true tras un opt-in', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      await client.query(
        `select * from public.set_marketing_consent($1, '2026-12-08-v1', true, 'test')`,
        [REAL_BUSINESS_ID]
      )

      const result = await client.query(
        `select * from public.has_marketing_consent($1, $2, null)`,
        [REAL_BUSINESS_ID, REAL_USER_ID]
      )
      expect(result.rows[0].has_marketing_consent).toBe(true)
    })
  })

  it('get_my_marketing_consents devuelve el estado vigente por negocio', async () => {
    await withTransaction(async (client) => {
      await setAuthContext(client, REAL_USER_ID)

      await client.query(
        `select * from public.set_marketing_consent($1, '2026-12-08-v1', true, 'test')`,
        [REAL_BUSINESS_ID]
      )

      const result = await client.query(
        `select * from public.get_my_marketing_consents()`
      )
      const row = result.rows.find((r) => r.business_id === REAL_BUSINESS_ID)
      expect(row).toBeTruthy()
      expect(row.status).toBe('accepted')
    })
  })
})

describe.skipIf(!RUN_TESTS)('search_clients tenant isolation', () => {
  it('solo retorna clients del negocio consultado', async () => {
    await withTransaction(async (client) => {
      // Buscar un negocio con al menos un client
      const bizResult = await client.query(
        `select business_id, count(*)::int as n
         from public.clients group by business_id
         having count(*) > 0 limit 1`
      )
      if (bizResult.rows.length === 0) return

      const bizId = bizResult.rows[0].business_id

      const result = await client.query(
        `select * from public.search_clients($1, '')`,
        [bizId]
      )
      // Todos los resultados deben pertenecer al negocio consultado
      for (const row of result.rows) {
        // search_clients no retorna business_id, pero podemos verificar
        // que los ids existen en clients de ese negocio
        if (row.id) {
          const check = await client.query(
            `select 1 from public.clients where id = $1 and business_id = $2`,
            [row.id, bizId]
          )
          expect(check.rows.length).toBe(1)
        }
      }
    })
  })
})
