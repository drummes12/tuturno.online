import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { rpc, query, isResourcesSchemaAvailable, closePool } from '@/test/db'

const DB_AVAILABLE = await isResourcesSchemaAvailable()

let BUSINESS_ID = ''
let ACTIVE_RESOURCE_ID = ''
let SECOND_RESOURCE_ID = ''

beforeAll(async () => {
  if (!DB_AVAILABLE) {
    console.warn('Supabase local no está corriendo — tests de BD saltados')
    return
  }

  // Buscar el primer negocio y sus canchas activas
  const bizResult = await query('select id from public.businesses limit 1')
  BUSINESS_ID = bizResult.rows[0]?.id as string

  const courtResult = await query(
    'select id from public.resources where is_active = true order by sort_order limit 2'
  )
  ACTIVE_RESOURCE_ID = courtResult.rows[0]?.id as string
  SECOND_RESOURCE_ID = courtResult.rows[1]?.id as string
})

afterAll(async () => {
  await closePool()
})

/**
 * Encuentra el próximo lunes dentro del rango de max_advance_days (30).
 * El seed tiene horario de lunes a viernes 08:00-22:00.
 */
function nextMondayWithinAdvanceLimit(): {
  dateStr: string
  startUtc: string
  endUtc: string
} {
  const now = new Date()
  const dayOfWeek = now.getDay()
  // Próximo lunes (1), mínimo 3 días desde hoy para estar seguro dentro de 30 días
  let daysUntilMonday = (1 - dayOfWeek + 7) % 7
  if (daysUntilMonday < 3) daysUntilMonday += 7

  const monday = new Date(now)
  monday.setDate(now.getDate() + daysUntilMonday)
  const dateStr = monday.toISOString().split('T')[0]

  // 00:00 Bogotá = 05:00 UTC
  const startUtc = `${dateStr}T05:00:00Z`
  const tuesday = new Date(monday)
  tuesday.setDate(monday.getDate() + 1)
  const tuesdayStr = tuesday.toISOString().split('T')[0]
  const endUtc = `${tuesdayStr}T05:00:00Z`

  return { dateStr, startUtc, endUtc }
}

describe.skipIf(!DB_AVAILABLE)(
  'availability_exceptions — get_resource_availability',
  () => {
    it('excepción global marca slots como blocked', async () => {
      if (!ACTIVE_RESOURCE_ID) return

      const { dateStr, startUtc, endUtc } = nextMondayWithinAdvanceLimit()

      await query(
        `insert into public.availability_exceptions (business_id, resource_id, starts_at, ends_at, type, reason)
         values ($1, null, $2, $3, 'closed', 'Test global')`,
        [BUSINESS_ID, startUtc, endUtc]
      )

      try {
        const result = await rpc('get_resource_availability', {
          p_resource_id: ACTIVE_RESOURCE_ID,
          p_date: dateStr
        })

        const blockedSlots = result.rows.filter(
          (r) => (r as Record<string, unknown>).status === 'blocked'
        )
        expect(blockedSlots.length).toBeGreaterThan(0)
      } finally {
        await query(
          `delete from public.availability_exceptions where business_id = $1 and reason = 'Test global'`,
          [BUSINESS_ID]
        )
      }
    })

    it('excepción de una cancha no bloquea otra', async () => {
      if (!ACTIVE_RESOURCE_ID || !SECOND_RESOURCE_ID) return

      const { dateStr, startUtc, endUtc } = nextMondayWithinAdvanceLimit()

      // Excepción solo para la primera cancha
      await query(
        `insert into public.availability_exceptions (business_id, resource_id, starts_at, ends_at, type, reason)
         values ($1, $2, $3, $4, 'closed', 'Test court-specific')`,
        [BUSINESS_ID, ACTIVE_RESOURCE_ID, startUtc, endUtc]
      )

      try {
        // La cancha bloqueada debe tener slots blocked
        const blockedResult = await rpc('get_resource_availability', {
          p_resource_id: ACTIVE_RESOURCE_ID,
          p_date: dateStr
        })
        const blockedSlots = blockedResult.rows.filter(
          (r) => (r as Record<string, unknown>).status === 'blocked'
        )
        expect(blockedSlots.length).toBeGreaterThan(0)

        // La segunda cancha NO debe tener slots blocked por esta excepción
        const otherResult = await rpc('get_resource_availability', {
          p_resource_id: SECOND_RESOURCE_ID,
          p_date: dateStr
        })
        const availableSlots = otherResult.rows.filter(
          (r) => (r as Record<string, unknown>).status === 'available'
        )
        expect(availableSlots.length).toBeGreaterThan(0)
      } finally {
        await query(
          `delete from public.availability_exceptions where business_id = $1 and reason = 'Test court-specific'`,
          [BUSINESS_ID]
        )
      }
    })
  }
)

describe.skipIf(!DB_AVAILABLE)(
  'availability_exceptions — create_reservation',
  () => {
    it('slots bloqueados por excepción no son disponibles', async () => {
      if (!ACTIVE_RESOURCE_ID) return

      const { dateStr, startUtc, endUtc } = nextMondayWithinAdvanceLimit()

      await query(
        `insert into public.availability_exceptions (business_id, resource_id, starts_at, ends_at, type, reason)
         values ($1, null, $2, $3, 'closed', 'Test reject')`,
        [BUSINESS_ID, startUtc, endUtc]
      )

      try {
        const result = await rpc('get_resource_availability', {
          p_resource_id: ACTIVE_RESOURCE_ID,
          p_date: dateStr
        })

        const blockedSlots = result.rows.filter(
          (r) => (r as Record<string, unknown>).status === 'blocked'
        )
        expect(blockedSlots.length).toBeGreaterThan(0)

        // Ningún slot debe estar disponible en ese día
        const availableSlots = result.rows.filter(
          (r) => (r as Record<string, unknown>).status === 'available'
        )
        expect(availableSlots.length).toBe(0)
      } finally {
        await query(
          `delete from public.availability_exceptions where business_id = $1 and reason = 'Test reject'`,
          [BUSINESS_ID]
        )
      }
    })
  }
)
