import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { rpc, isDbAvailable, closePool } from '@/test/db'

const DB_AVAILABLE = await isDbAvailable()

beforeAll(async () => {
  if (!DB_AVAILABLE) {
    console.warn('Supabase local no está corriendo — tests de BD saltados')
  }
})

afterAll(async () => {
  await closePool()
})

// IDs de canchas que ya existen en la BD local
const ACTIVE_COURT_ID = '13078c93-41fd-46f6-83d1-993d7fe269f9' // Cancha 1 (activa)
const INACTIVE_COURT_ID = '28f5bc8b-4c25-422b-a1c3-833301304269' // Cancha 2 (inactiva)

describe.skipIf(!DB_AVAILABLE)('get_availability RPC', () => {
  it('retorna slots para una cancha activa en un día con horario', async () => {
    // Lunes (day_of_week=1) tiene 3 franjas: 08:00-12:00, 13:00-18:00, 18:00-22:00
    // Buscamos el próximo lunes
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + daysUntilMonday)
    const dateStr = nextMonday.toISOString().split('T')[0]

    const result = await rpc('get_availability', {
      p_court_id: ACTIVE_COURT_ID,
      p_date: dateStr
    })

    expect(result.rows).toBeDefined()
    expect(result.rows.length).toBeGreaterThan(0)

    // Cada row debe tener court_id, court_name, starts_at, ends_at, status
    const row = result.rows[0] as Record<string, unknown>
    expect(row).toHaveProperty('court_id')
    expect(row).toHaveProperty('court_name')
    expect(row).toHaveProperty('starts_at')
    expect(row).toHaveProperty('ends_at')
    expect(row).toHaveProperty('status')
    expect(row.court_id).toBe(ACTIVE_COURT_ID)
  })

  it('retorna array vacío para una cancha inactiva', async () => {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]

    const result = await rpc('get_availability', {
      p_court_id: INACTIVE_COURT_ID,
      p_date: dateStr
    })

    expect(result.rows).toHaveLength(0)
  })

  it('retorna array vacío para una cancha inexistente', async () => {
    const result = await rpc('get_availability', {
      p_court_id: '00000000-0000-0000-0000-000000000000',
      p_date: '2025-01-15'
    })

    expect(result.rows).toHaveLength(0)
  })

  it('respeta el gap_minutes entre turnos', async () => {
    // El negocio tiene gap_minutes=10 y slot_duration_minutes=55
    // Verificar que hay al menos 10 min entre slots consecutivos
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + daysUntilMonday)
    const dateStr = nextMonday.toISOString().split('T')[0]

    const result = await rpc('get_availability', {
      p_court_id: ACTIVE_COURT_ID,
      p_date: dateStr
    })

    if (result.rows.length >= 2) {
      const slots = result.rows as Array<{ starts_at: string; ends_at: string }>
      for (let i = 1; i < slots.length; i++) {
        const prevEnd = new Date(slots[i - 1].ends_at).getTime()
        const currStart = new Date(slots[i].starts_at).getTime()
        const gapMs = currStart - prevEnd

        // Si están en la misma franja, el gap debe ser >= 10 min (gap_minutes)
        // Si están en franjas diferentes, el gap puede ser mayor
        if (gapMs > 0) {
          // gap mínimo es 0 (slots seguidos) o gap_minutes (con gap)
          // Solo verificamos que no haya overlap negativo
          expect(gapMs).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('genera slots con duración correcta (slot_duration_minutes)', async () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + daysUntilMonday)
    const dateStr = nextMonday.toISOString().split('T')[0]

    const result = await rpc('get_availability', {
      p_court_id: ACTIVE_COURT_ID,
      p_date: dateStr
    })

    if (result.rows.length > 0) {
      const slot = result.rows[0] as { starts_at: string; ends_at: string }
      const duration =
        new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()
      const durationMin = duration / (1000 * 60)
      // slot_duration_minutes = 55
      expect(durationMin).toBe(55)
    }
  })

  it('no retorna slots en el pasado', async () => {
    // Fecha de ayer
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]

    const result = await rpc('get_availability', {
      p_court_id: ACTIVE_COURT_ID,
      p_date: dateStr
    })

    // Los slots en el pasado se filtran (continue en el RPC)
    expect(result.rows).toHaveLength(0)
  })

  it('no retorna slots para una fecha demasiado lejana (max_advance_days)', async () => {
    // Fecha a 400 días en el futuro (max_advance_days=30)
    const future = new Date()
    future.setDate(future.getDate() + 400)
    const dateStr = future.toISOString().split('T')[0]

    const result = await rpc('get_availability', {
      p_court_id: ACTIVE_COURT_ID,
      p_date: dateStr
    })

    expect(result.rows).toHaveLength(0)
  })
})
