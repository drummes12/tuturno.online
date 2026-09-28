import type {
  AvailabilityException,
  Business,
  BusinessHours,
  BusinessMember,
  Client,
  ClientSearchResult,
  DashboardClientListRow,
  DashboardData,
  Reservation,
  ReservationFilter,
  ReservationStatus,
  Resource
} from '@/types'
import {
  filterReservations,
  uniqueReservations
} from '@/lib/reservation-status'
import { BUSINESS_TIMEZONE } from '@/lib/time'
import { DEMO_BUSINESS_ID } from '@/lib/demo'

/**
 * Dataset ficticio del panel de demostración (/demo/*).
 *
 * Vive en memoria: las mutaciones (confirmar, rechazar, cancelar,
 * crear recursos, guardar horarios…) modifican este estado para que
 * la demo se sienta real; al recargar la página todo vuelve al estado
 * inicial. Nada de esto toca Supabase.
 *
 * Las métricas se computan desde las mismas reservas, así una acción
 * en Operación también se refleja en Métricas.
 */

type DemoOrigin = 'client' | 'business'
type DemoReservation = Reservation & { _origin: DemoOrigin }
type DemoMember = BusinessMember & { email: string; full_name: string | null }

// ---------------------------------------------------------------------------
// Generación del dataset — determinista (PRNG con semilla fija) para que cada
// visita a la demo muestre los mismos datos.
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function dayAt(dayOffset: number, hour: number): Date {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() + dayOffset)
  return d
}

/** Clave 'YYYY-MM-DD' en la hora local del navegador. */
function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** dow isodow: 1 = lunes … 7 = domingo. */
function isodow(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay()
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

// Teléfonos ficticios: el prefijo +57 555 no existe en Colombia (los
// móviles empiezan en 3), así ningún número puede corresponder a una
// persona real — igual que la convención 555-01xx del cine.
const CLIENTS_SEED: Array<{
  name: string
  phone: string
  hasAccount: boolean
}> = [
  { name: 'Juan Pablo Restrepo', phone: '+57 555 010 0142', hasAccount: true },
  { name: 'Mariana Cardona', phone: '+57 555 010 0178', hasAccount: true },
  { name: 'Felipe Gutiérrez', phone: '+57 555 010 0293', hasAccount: true },
  { name: 'Laura Sofía Mejía', phone: '+57 555 010 0365', hasAccount: true },
  { name: 'Santiago Osorio', phone: '+57 555 010 0417', hasAccount: false },
  { name: 'Valeria Montoya', phone: '+57 555 010 0521', hasAccount: true },
  { name: 'Daniel Hincapié', phone: '+57 555 010 0688', hasAccount: false },
  { name: 'Isabela Cárdenas', phone: '+57 555 010 0734', hasAccount: true },
  { name: 'Tomás Álvarez', phone: '+57 555 010 0856', hasAccount: true },
  { name: 'Camila Rengifo', phone: '+57 555 010 0912', hasAccount: false },
  { name: 'Sebastián Loaiza', phone: '+57 555 010 1037', hasAccount: true },
  { name: 'Antonia Salazar', phone: '+57 555 010 1183', hasAccount: true }
]

interface DemoState {
  business: Business
  resources: Resource[]
  hours: BusinessHours[]
  exceptions: AvailabilityException[]
  members: DemoMember[]
  clients: Client[]
  reservations: DemoReservation[]
  seq: {
    reservation: number
    resource: number
    hour: number
    exception: number
    member: number
    client: number
  }
}

let state: DemoState | null = null

function seed(): DemoState {
  const rand = mulberry32(20260414)
  const now = new Date()
  const created = new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString()

  const business: Business = {
    id: DEMO_BUSINESS_ID,
    name: 'Canchas El Gol',
    slug: 'demo',
    timezone: BUSINESS_TIMEZONE,
    street: 'Cra 45 #12-30',
    neighborhood: 'San Joaquín',
    city: 'Medellín',
    state: 'Antioquia',
    country: 'Colombia',
    phone: '+575550100001',
    whatsapp_link: null,
    slot_duration_minutes: 60,
    gap_minutes: 0,
    hold_duration_minutes: 30,
    min_advance_minutes: 60,
    cancellation_limit_hours: 2,
    max_advance_days: 30,
    resource_label_singular: 'Cancha',
    resource_label_plural: 'Canchas',
    reservation_instructions_md:
      'Para confirmar tu reserva envía el comprobante del abono por WhatsApp. Sin abono, la solicitud puede ser rechazada.',
    is_demo: true,
    created_at: created,
    updated_at: created
  }

  const resources: Resource[] = [
    {
      id: 'demo-res-1',
      business_id: DEMO_BUSINESS_ID,
      name: 'Cancha 1 — Fútbol 8',
      description: 'Césped sintético, iluminación LED',
      is_active: true,
      sort_order: 1,
      created_at: created,
      updated_at: created
    },
    {
      id: 'demo-res-2',
      business_id: DEMO_BUSINESS_ID,
      name: 'Cancha 2 — Fútbol 5',
      description: 'Ideal para partidos rápidos',
      is_active: true,
      sort_order: 2,
      created_at: created,
      updated_at: created
    },
    {
      id: 'demo-res-3',
      business_id: DEMO_BUSINESS_ID,
      name: 'Cancha de pádel',
      description: null,
      is_active: true,
      sort_order: 3,
      created_at: created,
      updated_at: created
    },
    {
      id: 'demo-res-4',
      business_id: DEMO_BUSINESS_ID,
      name: 'Cancha 3 — Fútbol 11',
      description: 'En remodelación',
      is_active: false,
      sort_order: 4,
      created_at: created,
      updated_at: created
    }
  ]

  // Franjas: lun–sáb 08–12 y 14–21; domingo 09–13.
  const hours: BusinessHours[] = []
  let hourSeq = 1
  for (let dow = 1; dow <= 7; dow++) {
    const franjas: Array<[string, string]> =
      dow === 7
        ? [['09:00', '13:00']]
        : [
            ['08:00', '12:00'],
            ['14:00', '21:00']
          ]
    for (const [open, close] of franjas) {
      hours.push({
        id: `demo-hour-${hourSeq++}`,
        business_id: DEMO_BUSINESS_ID,
        day_of_week: dow % 7, // 0 = domingo en el modelo interno
        open_time: open,
        close_time: close,
        is_active: true
      })
    }
  }

  const members: DemoMember[] = [
    {
      business_id: DEMO_BUSINESS_ID,
      user_id: 'demo-user-owner',
      role: 'owner',
      joined_at: created,
      email: 'valentina@elgol.demo',
      full_name: 'Valentina Ríos'
    },
    {
      business_id: DEMO_BUSINESS_ID,
      user_id: 'demo-user-mgr-1',
      role: 'manager',
      joined_at: new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString(),
      email: 'andres@elgol.demo',
      full_name: 'Andrés Peña'
    },
    {
      business_id: DEMO_BUSINESS_ID,
      user_id: 'demo-user-mgr-2',
      role: 'manager',
      joined_at: new Date(now.getTime() - 12 * 24 * 3600 * 1000).toISOString(),
      email: 'camila@elgol.demo',
      full_name: 'Camila Torres'
    }
  ]

  const clients: Client[] = CLIENTS_SEED.map((c, i) => ({
    id: `demo-client-${i + 1}`,
    business_id: DEMO_BUSINESS_ID,
    name: c.name,
    phone: c.phone,
    email: c.hasAccount
      ? `${c.name.split(' ')[0].toLowerCase()}@correo.demo`
      : null,
    user_id: c.hasAccount ? `demo-client-user-${i + 1}` : null,
    created_at: new Date(
      now.getTime() - (40 - i * 3) * 24 * 3600 * 1000
    ).toISOString(),
    updated_at: created
  }))

  const exceptions: AvailabilityException[] = [
    {
      id: 'demo-exc-1',
      business_id: DEMO_BUSINESS_ID,
      resource_id: 'demo-res-2',
      starts_at: dayAt(6, 8).toISOString(),
      ends_at: dayAt(6, 14).toISOString(),
      type: 'closed',
      reason: 'Mantenimiento de césped',
      created_by: 'demo-user-owner',
      created_at: created
    },
    {
      id: 'demo-exc-2',
      business_id: DEMO_BUSINESS_ID,
      resource_id: null,
      starts_at: dayAt(12, 0).toISOString(),
      ends_at: dayAt(13, 0).toISOString(),
      type: 'closed',
      reason: 'Festivo',
      created_by: 'demo-user-owner',
      created_at: created
    }
  ]

  // -------------------------------------------------------------------
  // Reservas: ~30 días de historia + hoy + próxima semana.
  // -------------------------------------------------------------------
  const reservations: DemoReservation[] = []
  let seq = 1

  const activeResources = resources.filter((r) => r.is_active)
  const openFranjas = (dow: number): Array<[number, number]> => {
    const day = dow === 7 ? 0 : dow // modelo interno: domingo = 0
    return hours
      .filter((h) => h.is_active && h.day_of_week === day)
      .map((h) => [parseInt(h.open_time), parseInt(h.close_time)])
  }

  function mkReservation(opts: {
    dayOffset: number
    hour: number
    resource: Resource
    clientIdx: number
    status: ReservationStatus
    origin: DemoOrigin
    createdHoursBefore: number
    responseMinutes?: number
    notes?: string
    reason?: string
  }): DemoReservation {
    const client = clients[opts.clientIdx % clients.length]
    const startsAt = dayAt(opts.dayOffset, opts.hour)
    const endsAt = new Date(
      startsAt.getTime() + business.slot_duration_minutes * 60000
    )
    const createdAt = new Date(
      startsAt.getTime() - opts.createdHoursBefore * 3600 * 1000
    )
    const decided =
      opts.status === 'confirmed' ||
      opts.status === 'rejected' ||
      opts.status === 'completed' ||
      opts.status === 'cancelled_by_business'
    const decidedAt = new Date(
      createdAt.getTime() + (opts.responseMinutes ?? 20) * 60000
    )
    return {
      id: `demo-rsv-${seq}`,
      business_id: DEMO_BUSINESS_ID,
      resource_id: opts.resource.id,
      user_id: client.user_id,
      client_id: client.id,
      reservation_number: seq++,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: opts.status,
      hold_expires_at:
        opts.status === 'pending'
          ? new Date(
              createdAt.getTime() + business.hold_duration_minutes * 60000
            ).toISOString()
          : null,
      notes: opts.notes ?? null,
      decision_reason: opts.reason ?? null,
      decided_by: decided ? 'demo-user-owner' : null,
      created_at: createdAt.toISOString(),
      updated_at: decided ? decidedAt.toISOString() : createdAt.toISOString(),
      resource: opts.resource,
      client,
      _origin: opts.origin
    }
  }

  const PAST_STATUSES: ReservationStatus[] = [
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'cancelled_by_client',
    'rejected',
    'expired',
    'cancelled_by_business'
  ]

  for (let dayOffset = -30; dayOffset <= 7; dayOffset++) {
    const dow = isodow(dayAt(dayOffset, 12))
    for (const [open, close] of openFranjas(dow)) {
      for (let hour = open; hour < close; hour++) {
        for (const resource of activeResources) {
          // Ocupación ~28%: más de noche, menos en la mañana.
          const density = hour >= 18 ? 0.45 : hour >= 14 ? 0.3 : 0.18
          if (rand() >= density) continue
          const status: ReservationStatus =
            dayOffset < 0
              ? PAST_STATUSES[Math.floor(rand() * PAST_STATUSES.length)]
              : dayOffset === 0 && hour <= now.getHours()
                ? 'completed'
                : rand() < 0.12
                  ? 'pending'
                  : 'confirmed'
          if (status === 'pending' && dayOffset < 0) continue
          reservations.push(
            mkReservation({
              dayOffset,
              hour,
              resource,
              clientIdx: Math.floor(rand() * clients.length),
              status,
              origin: rand() < 0.3 ? 'business' : 'client',
              createdHoursBefore: 8 + rand() * 72,
              responseMinutes: 4 + rand() * 50,
              reason:
                status === 'rejected'
                  ? 'Cancha en mantenimiento'
                  : status === 'cancelled_by_business'
                    ? 'Evento privado'
                    : undefined,
              notes: rand() < 0.15 ? 'Llegamos 10 min antes' : undefined
            })
          )
        }
      }
    }
  }

  // Reservas garantizadas para hoy — la agenda de "Reservas de hoy" nunca
  // debe salir vacía en la demo y conviene mostrar variedad de estados:
  // los slots ya pasados reparten completed/canceladas/expired; los slots
  // futuros dejan una pendiente accionable + confirmadas. Respeta las
  // franjas del día y no pisa las reservas generadas aleatoriamente.
  const takenToday = new Set(
    reservations
      .filter((r) => r.starts_at.slice(0, 10) === dayKey(dayAt(0, 12)))
      .map((r) => `${r.resource_id}@${r.starts_at}`)
  )
  const pastPool: ReservationStatus[] = [
    'completed',
    'completed',
    'cancelled_by_client',
    'completed',
    'cancelled_by_business',
    'expired'
  ]
  let todayAdded = 0
  let todayPastIdx = 0
  let todayPendingAdded = false
  for (const [open, close] of openFranjas(isodow(dayAt(0, 12)))) {
    for (let hour = open; hour < close && todayAdded < 6; hour++) {
      const resource =
        activeResources[(hour + todayAdded) % activeResources.length]
      const key = `${resource.id}@${dayAt(0, hour).toISOString()}`
      if (takenToday.has(key)) continue
      takenToday.add(key)
      const isPast = dayAt(0, hour).getTime() < now.getTime()
      let status: ReservationStatus
      if (isPast) {
        status = pastPool[todayPastIdx++ % pastPool.length]
      } else if (!todayPendingAdded) {
        status = 'pending'
        todayPendingAdded = true
      } else {
        status = 'confirmed'
      }
      reservations.push(
        mkReservation({
          dayOffset: 0,
          hour,
          resource,
          clientIdx: (hour + todayAdded) % clients.length,
          status,
          origin: 'client',
          // La pendiente de hoy se crea hace ~12min para que el
          // hold siga vigente y se pueda confirmar en la demo.
          createdHoursBefore: status === 'pending' ? 0.2 : 10 + rand() * 48,
          responseMinutes: 5 + rand() * 40,
          reason:
            status === 'cancelled_by_client'
              ? 'No voy a poder llegar'
              : status === 'cancelled_by_business'
                ? 'Evento privado'
                : undefined
        })
      )
      todayAdded++
    }
  }

  // Solicitudes pendientes destacadas — recientes para mostrar urgencia.
  const pendingSeeds = [
    { mins: 14, dayOffset: 1, hour: 19, res: 0, client: 0 },
    { mins: 47, dayOffset: 1, hour: 20, res: 2, client: 1 },
    { mins: 130, dayOffset: 2, hour: 18, res: 1, client: 4 },
    { mins: 60 * 7, dayOffset: 3, hour: 17, res: 0, client: 6 }
  ]
  for (const p of pendingSeeds) {
    const r = mkReservation({
      dayOffset: p.dayOffset,
      hour: p.hour,
      resource: activeResources[p.res],
      clientIdx: p.client,
      status: 'pending',
      origin: 'client',
      createdHoursBefore: 0
    })
    r.created_at = new Date(now.getTime() - p.mins * 60000).toISOString()
    r.hold_expires_at = new Date(
      new Date(r.created_at).getTime() + business.hold_duration_minutes * 60000
    ).toISOString()
    reservations.push(r)
  }

  return {
    business,
    resources,
    hours,
    exceptions,
    members,
    clients,
    reservations,
    seq: {
      reservation: seq,
      resource: 5,
      hour: hourSeq,
      exception: 3,
      member: 4,
      client: CLIENTS_SEED.length + 1
    }
  }
}

function store(): DemoState {
  if (!state) state = seed()
  return state
}

function findReservation(id: string): DemoReservation | undefined {
  return store().reservations.find((r) => r.id === id)
}

// ---------------------------------------------------------------------------
// Consultas — mismas firmas/retornos que los servicios reales.
// ---------------------------------------------------------------------------

export function demoFetchPendingReservations(): Reservation[] {
  const list = store().reservations.filter((r) => r.status === 'pending')
  list.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  return uniqueReservations(list)
}

export function demoFetchTodayReservations(
  start: string,
  end: string
): Reservation[] {
  const list = store().reservations.filter(
    (r) => r.starts_at >= start && r.starts_at <= end && r.status !== 'pending'
  )
  list.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  return uniqueReservations(list)
}

export function demoFetchReservationsByDate(
  start: string,
  end: string,
  filter: ReservationFilter
): Reservation[] {
  const list = store().reservations.filter(
    (r) => r.starts_at >= start && r.starts_at <= end
  )
  list.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  return filterReservations(list, filter)
}

export function demoFetchReservationById(id: string): Reservation | null {
  const r = findReservation(id)
  return r ? uniqueReservations([r])[0] : null
}

export function demoConfirmReservation(id: string): void {
  const r = findReservation(id)
  if (!r || r.status !== 'pending') return
  r.status = 'confirmed'
  r.hold_expires_at = null
  r.decided_by = 'demo-user-owner'
  r.updated_at = new Date().toISOString()
}

export function demoRejectReservation(id: string, reason: string): void {
  const r = findReservation(id)
  if (!r || r.status !== 'pending') return
  r.status = 'rejected'
  r.hold_expires_at = null
  r.decision_reason = reason
  r.decided_by = 'demo-user-owner'
  r.updated_at = new Date().toISOString()
}

export function demoCancelReservationByBusiness(
  id: string,
  reason: string
): void {
  const r = findReservation(id)
  if (!r) return
  r.status = 'cancelled_by_business'
  r.decision_reason = reason
  r.decided_by = 'demo-user-owner'
  r.updated_at = new Date().toISOString()
}

// --- Recursos ---------------------------------------------------------------

export function demoFetchActiveResources(): Resource[] {
  return store()
    .resources.filter((r) => r.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function demoFetchAllResources(): Resource[] {
  return [...store().resources].sort((a, b) => a.sort_order - b.sort_order)
}

export function demoFetchResourceName(id: string): string | null {
  return store().resources.find((r) => r.id === id)?.name ?? null
}

export function demoCreateResource(
  name: string,
  description: string | null
): void {
  const s = store()
  const nowIso = new Date().toISOString()
  s.resources.push({
    id: `demo-res-${s.seq.resource++}`,
    business_id: DEMO_BUSINESS_ID,
    name: name.trim(),
    description: description?.trim() || null,
    is_active: true,
    sort_order: s.resources.length + 1,
    created_at: nowIso,
    updated_at: nowIso
  })
}

export function demoUpdateResource(
  id: string,
  name: string,
  description: string | null
): void {
  const r = store().resources.find((x) => x.id === id)
  if (!r) return
  r.name = name.trim()
  r.description = description?.trim() || null
  r.updated_at = new Date().toISOString()
}

export function demoToggleResourceActive(id: string): void {
  const r = store().resources.find((x) => x.id === id)
  if (!r) return
  r.is_active = !r.is_active
  r.updated_at = new Date().toISOString()
}

// --- Horarios ---------------------------------------------------------------

export function demoFetchBusinessHours(): BusinessHours[] {
  return [...store().hours].sort(
    (a, b) =>
      a.day_of_week - b.day_of_week || a.open_time.localeCompare(b.open_time)
  )
}

export function demoInsertBusinessHour(
  dayOfWeek: number,
  openTime: string,
  closeTime: string,
  isActive: boolean
): void {
  const s = store()
  s.hours.push({
    id: `demo-hour-${s.seq.hour++}`,
    business_id: DEMO_BUSINESS_ID,
    day_of_week: dayOfWeek,
    open_time: openTime,
    close_time: closeTime,
    is_active: isActive
  })
}

export function demoUpdateBusinessHour(
  id: string,
  openTime: string,
  closeTime: string,
  isActive: boolean
): void {
  const h = store().hours.find((x) => x.id === id)
  if (!h) return
  h.open_time = openTime
  h.close_time = closeTime
  h.is_active = isActive
}

export function demoDeleteBusinessHour(id: string): void {
  const s = store()
  s.hours = s.hours.filter((h) => h.id !== id)
}

// --- Cierres ----------------------------------------------------------------

export function demoFetchAvailabilityExceptions(): AvailabilityException[] {
  return [...store().exceptions].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at)
  )
}

export function demoCreateAvailabilityException(opts: {
  resourceId: string | null
  startsAt: string
  endsAt: string
  reason?: string | null
}): void {
  if (new Date(opts.endsAt) <= new Date(opts.startsAt)) {
    throw new Error('La fecha de fin debe ser posterior a la de inicio')
  }
  const s = store()
  s.exceptions.push({
    id: `demo-exc-${s.seq.exception++}`,
    business_id: DEMO_BUSINESS_ID,
    resource_id: opts.resourceId,
    starts_at: opts.startsAt,
    ends_at: opts.endsAt,
    type: 'closed',
    reason: opts.reason?.trim() || null,
    created_by: 'demo-user-owner',
    created_at: new Date().toISOString()
  })
}

export function demoDeleteAvailabilityException(id: string): void {
  const s = store()
  s.exceptions = s.exceptions.filter((e) => e.id !== id)
}

export function demoCountOverlappingReservations(opts: {
  resourceId: string | null
  startsAt: string
  endsAt: string
}): number {
  return store().reservations.filter(
    (r) =>
      (r.status === 'pending' || r.status === 'confirmed') &&
      r.starts_at < opts.endsAt &&
      r.ends_at > opts.startsAt &&
      (!opts.resourceId || r.resource_id === opts.resourceId)
  ).length
}

// --- Equipo -----------------------------------------------------------------

export function demoFetchBusinessMembers(): DemoMember[] {
  return store().members
}

export function demoAddBusinessMember(userId: string): void {
  const s = store()
  if (s.members.some((m) => m.user_id === userId)) {
    throw new Error('Esta persona ya hace parte del equipo.')
  }
  const client = s.clients.find((c) => c.user_id === userId)
  s.members.push({
    business_id: DEMO_BUSINESS_ID,
    user_id: userId,
    role: 'manager',
    joined_at: new Date().toISOString(),
    email: client?.email ?? `${userId.replace('demo-member-', '')}@correo.demo`,
    full_name: client?.name ?? 'Nuevo manager'
  })
}

export function demoRemoveBusinessMember(userId: string): void {
  const s = store()
  s.members = s.members.filter((m) => m.user_id !== userId)
}

export function demoFindUserByEmailForInvite(email: string): {
  user_id: string
  email: string
  full_name: string | null
} | null {
  const normalized = email.trim().toLowerCase()
  const existing = store().clients.find(
    (c) => c.email?.toLowerCase() === normalized && c.user_id
  )
  if (existing) {
    return {
      user_id: existing.user_id!,
      email: existing.email!,
      full_name: existing.name
    }
  }
  // En la demo cualquier correo "existe" para poder mostrar el flujo.
  const s = store()
  const name = normalized
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
  return {
    user_id: `demo-member-${s.seq.member++}`,
    email: normalized,
    full_name: name
  }
}

// --- Negocio ----------------------------------------------------------------

export function demoFetchBusiness(): Business {
  return store().business
}

export function demoUpdateBusiness(updates: Partial<Business>): void {
  Object.assign(store().business, updates, {
    updated_at: new Date().toISOString()
  })
}

// --- Clientes ---------------------------------------------------------------

export function demoSearchClients(query: string): ClientSearchResult[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return store()
    .clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      user_id: c.user_id,
      has_account: Boolean(c.user_id)
    }))
}

// --- Métricas ---------------------------------------------------------------

function blankBreakdown() {
  return {
    total: 0,
    confirmed: 0,
    completed: 0,
    pending: 0,
    expired: 0,
    rejected: 0,
    cancelledByClient: 0,
    cancelledByBusiness: 0
  }
}

function addToBreakdown(
  b: ReturnType<typeof blankBreakdown>,
  status: ReservationStatus
) {
  b.total++
  if (status === 'confirmed') b.confirmed++
  else if (status === 'completed') b.completed++
  else if (status === 'pending') b.pending++
  else if (status === 'expired') b.expired++
  else if (status === 'rejected') b.rejected++
  else if (status === 'cancelled_by_client') b.cancelledByClient++
  else if (status === 'cancelled_by_business') b.cancelledByBusiness++
}

function inRange(iso: string, from: string, to: string): boolean {
  const d = dayKey(new Date(iso))
  return d >= from && d <= to
}

export function demoFetchDashboardMetrics(
  from: string,
  to: string,
  resourceIds?: string[]
): DashboardData {
  const s = store()
  const fromD = new Date(`${from}T00:00:00`)
  const toD = new Date(`${to}T00:00:00`)
  const days = Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1
  const prevToD = addDays(fromD, -1)
  const prevFromD = addDays(prevToD, -(days - 1))
  const prevFrom = dayKey(prevFromD)
  const prevTo = dayKey(prevToD)

  const resourceFilter = (r: DemoReservation) =>
    !resourceIds ||
    resourceIds.length === 0 ||
    resourceIds.includes(r.resource_id)
  const current = s.reservations.filter(
    (r) => resourceFilter(r) && inRange(r.starts_at, from, to)
  )
  const previous = s.reservations.filter(
    (r) => resourceFilter(r) && inRange(r.starts_at, prevFrom, prevTo)
  )

  // Trend diario
  const trend: DashboardData['trend'] = []
  for (let i = 0; i < days; i++) {
    const d = dayKey(addDays(fromD, i))
    const pd = dayKey(addDays(prevFromD, i))
    trend.push({
      d,
      n: current.filter((r) => dayKey(new Date(r.starts_at)) === d).length,
      prev: previous.filter((r) => dayKey(new Date(r.starts_at)) === pd).length
    })
  }

  const statusTotals: Partial<Record<ReservationStatus, number>> = {}
  const statusTotalsPrev: Partial<Record<ReservationStatus, number>> = {}
  for (const r of current)
    statusTotals[r.status] = (statusTotals[r.status] ?? 0) + 1
  for (const r of previous)
    statusTotalsPrev[r.status] = (statusTotalsPrev[r.status] ?? 0) + 1

  // SLA: decisiones sobre solicitudes del período
  const responseMinutes = (list: DemoReservation[]) =>
    list
      .filter((r) => r.decided_by)
      .map(
        (r) =>
          (new Date(r.updated_at).getTime() -
            new Date(r.created_at).getTime()) /
          60000
      )
      .sort((a, b) => a - b)
  const slaOf = (list: DemoReservation[]) => {
    const times = responseMinutes(list)
    const median = times.length ? times[Math.floor(times.length / 2)] : null
    const avg = times.length
      ? times.reduce((a, b) => a + b, 0) / times.length
      : null
    return {
      requests: list.length,
      confirmed: list.filter(
        (r) => r.status === 'confirmed' || r.status === 'completed'
      ).length,
      rejected: list.filter((r) => r.status === 'rejected').length,
      expired: list.filter((r) => r.status === 'expired').length,
      cancelledByClient: list.filter((r) => r.status === 'cancelled_by_client')
        .length,
      pending: list.filter((r) => r.status === 'pending').length,
      onTime: list.filter(
        (r) =>
          r.decided_by &&
          (new Date(r.updated_at).getTime() -
            new Date(r.created_at).getTime()) /
            60000 <=
            s.business.hold_duration_minutes
      ).length,
      avgResponseMinutes: avg,
      medianResponseMinutes: median,
      avgResponsePctOfHold:
        avg !== null
          ? Math.round((avg / s.business.hold_duration_minutes) * 100)
          : null
    }
  }
  const slaCurr = slaOf(current)
  const slaPrev = slaOf(previous)

  // Heatmap
  const openDows = new Set(
    s.hours
      .filter((h) => h.is_active)
      .map((h) => (h.day_of_week === 0 ? 7 : h.day_of_week))
  )
  const weekMap = new Map<string, number>()
  const hourMap = new Map<number, number>()
  const monthMap = new Map<string, number>()
  const dowCount = new Map<number, number>()
  for (let i = 0; i < days; i++) {
    const d = addDays(fromD, i)
    const dow = isodow(d)
    if (openDows.has(dow)) dowCount.set(dow, (dowCount.get(dow) ?? 0) + 1)
  }
  const openDayTotal = [...dowCount.values()].reduce((a, b) => a + b, 0) || 1
  for (const r of current) {
    const d = new Date(r.starts_at)
    const dow = isodow(d)
    const hour = d.getHours()
    const key = `${dow}-${hour}`
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1)
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1)
    const dk = dayKey(d)
    monthMap.set(dk, (monthMap.get(dk) ?? 0) + 1)
  }

  const origin = { client: blankBreakdown(), business: blankBreakdown() }
  for (const r of current) addToBreakdown(origin[r._origin], r.status)

  // Clientes top
  const byClient = new Map<
    string,
    {
      name: string
      phone: string | null
      since: string
      counts: ReturnType<typeof blankBreakdown>
    }
  >()
  for (const r of current) {
    const name = r.client?.name ?? r.profile?.full_name ?? 'Cliente'
    const entry =
      byClient.get(name) ??
      (() => {
        const e = {
          name,
          phone: r.client?.phone ?? null,
          // 'YYYY-MM-DD' — la UI concatena 'T12:00:00' para mostrarla.
          since: (r.client?.created_at ?? r.created_at).slice(0, 10),
          counts: blankBreakdown()
        }
        byClient.set(name, e)
        return e
      })()
    addToBreakdown(entry.counts, r.status)
  }
  const top = [...byClient.values()].sort(
    (a, b) => b.counts.total - a.counts.total
  )

  return {
    period: {
      from,
      to,
      prevFrom,
      prevTo,
      timezone: BUSINESS_TIMEZONE,
      holdMinutes: s.business.hold_duration_minutes
    },
    resources: s.resources
      .filter((r) => r.is_active)
      .map((r) => ({ id: r.id, name: r.name })),
    businessHours: s.hours
      .filter((h) => h.is_active)
      .map((h) => ({
        dow: h.day_of_week === 0 ? 7 : h.day_of_week,
        open: h.open_time,
        close: h.close_time
      })),
    totals: { current: current.length, previous: previous.length },
    statusTotals,
    statusTotalsPrev,
    trend,
    sla: {
      ...slaCurr,
      prev: {
        requests: slaPrev.requests,
        avgResponseMinutes: slaPrev.avgResponseMinutes,
        medianResponseMinutes: slaPrev.medianResponseMinutes,
        onTime: slaPrev.onTime
      }
    },
    heatmap: {
      day: [...hourMap.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([hour, total]) => ({
          hour,
          total,
          avg: Math.round((total / openDayTotal) * 10) / 10
        })),
      week: [...weekMap.entries()].map(([key, total]) => {
        const [dow, hour] = key.split('-').map(Number)
        const n = dowCount.get(dow) || 1
        return { dow, hour, total, avg: Math.round((total / n) * 10) / 10 }
      }),
      month: [...monthMap.entries()].map(([date, total]) => ({ date, total }))
    },
    origin,
    topClients: top.slice(0, 5).map((c, i) => ({
      id: `demo-client-top-${i}`,
      name: c.name,
      client_since: c.since,
      reservations: c.counts.total,
      confirmed: c.counts.confirmed,
      completed: c.counts.completed
    }))
  }
}

export function demoFetchDashboardClients(
  from: string,
  to: string,
  options?: {
    resourceIds?: string[]
    search?: string
    limit?: number
    offset?: number
  }
): { rows: DashboardClientListRow[]; total: number } {
  const s = store()
  const resourceFilter = (r: DemoReservation) =>
    !options?.resourceIds ||
    options.resourceIds.length === 0 ||
    options.resourceIds.includes(r.resource_id)
  const q = options?.search?.trim().toLowerCase()

  const byClient = new Map<
    string,
    {
      id: string
      name: string
      phone: string | null
      since: string
      counts: ReturnType<typeof blankBreakdown>
    }
  >()
  for (const r of s.reservations) {
    if (!resourceFilter(r) || !inRange(r.starts_at, from, to)) continue
    const name = r.client?.name ?? r.profile?.full_name ?? 'Cliente'
    if (q && !name.toLowerCase().includes(q)) continue
    const entry =
      byClient.get(name) ??
      (() => {
        const e = {
          id: r.client?.id ?? `demo-guest-${name}`,
          name,
          phone: r.client?.phone ?? null,
          // 'YYYY-MM-DD' — la UI concatena 'T12:00:00' para mostrarla.
          since: (r.client?.created_at ?? r.created_at).slice(0, 10),
          counts: blankBreakdown()
        }
        byClient.set(name, e)
        return e
      })()
    addToBreakdown(entry.counts, r.status)
  }

  const all = [...byClient.values()].sort(
    (a, b) => b.counts.total - a.counts.total
  )
  const offset = options?.offset ?? 0
  const limit = options?.limit ?? 20
  const rows: DashboardClientListRow[] = all
    .slice(offset, offset + limit)
    .map((c) => ({
      client_id: c.id,
      name: c.name,
      phone: c.phone,
      client_since: c.since,
      reservations: c.counts.total,
      confirmed: c.counts.confirmed,
      completed: c.counts.completed,
      cancelled:
        c.counts.rejected +
        c.counts.cancelledByClient +
        c.counts.cancelledByBusiness +
        c.counts.expired,
      total_count: all.length
    }))
  return { rows, total: all.length }
}
