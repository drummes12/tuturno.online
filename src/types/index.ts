/**
 * Tipos compartidos para la aplicación de reservas.
 * Reflejan el modelo de datos de Supabase.
 */

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled_by_client'
  | 'cancelled_by_business'
  | 'expired'
  | 'completed'

export type ReservationFilter =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed'

export type BusinessRole = 'owner' | 'manager'

export type ExceptionType = 'closed' | 'blocked'

export type NotificationStatus = 'pending' | 'sent' | 'failed'

export type NotificationType =
  | 'reservation_created_client'
  | 'reservation_created_business'
  | 'reservation_created_by_business'
  | 'reservation_confirmed'
  | 'reservation_rejected'
  | 'reservation_cancelled_client'
  | 'reservation_cancelled_business'
  | 'reservation_cancelled_by_business'
  | 'reservation_expired'
  | 'business_signup_requested'
  | 'business_approved'
  | 'business_rejected'

export type SignupRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  phone_verified: boolean
  created_at: string
  updated_at: string
}

export interface Business {
  id: string
  name: string
  slug: string
  timezone: string
  street: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  country: string | null
  phone: string | null
  whatsapp_link: string | null
  slot_duration_minutes: number
  gap_minutes: number
  hold_duration_minutes: number
  min_advance_minutes: number
  cancellation_limit_hours: number
  max_advance_days: number
  resource_label_singular: string
  resource_label_plural: string
  reservation_instructions_md: string | null
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface BusinessMember {
  business_id: string
  user_id: string
  role: BusinessRole
  joined_at: string
}

export interface Client {
  id: string
  business_id: string
  name: string
  phone: string | null
  email: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export interface ClientSearchResult {
  id: string | null
  name: string
  phone: string | null
  email: string | null
  user_id: string | null
  has_account: boolean
}

export interface Resource {
  id: string
  business_id: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BusinessHours {
  id: string
  business_id: string
  day_of_week: number // 0 = domingo, 6 = sábado
  open_time: string // HH:MM
  close_time: string // HH:MM
  is_active: boolean
}

export interface AvailabilityException {
  id: string
  business_id: string
  resource_id: string | null
  starts_at: string
  ends_at: string
  type: ExceptionType
  reason: string | null
  created_by: string | null
  created_at: string
}

export interface Reservation {
  id: string
  business_id: string
  resource_id: string
  user_id: string | null
  client_id: string | null
  reservation_number: number
  starts_at: string
  ends_at: string
  status: ReservationStatus
  hold_expires_at: string | null
  notes: string | null
  decision_reason: string | null
  decided_by: string | null
  created_at: string
  updated_at: string
  // Relaciones opcionales
  resource?: Resource
  business?: Pick<
    Business,
    | 'id'
    | 'name'
    | 'slug'
    | 'phone'
    | 'whatsapp_link'
    | 'resource_label_singular'
    | 'cancellation_limit_hours'
  >
  profile?: Profile | null
  client?: Client | null
}

export interface ReservationEvent {
  id: string
  reservation_id: string
  from_status: ReservationStatus | null
  to_status: ReservationStatus
  actor_id: string | null
  reason: string | null
  created_at: string
}

export interface NotificationOutbox {
  id: string
  type: NotificationType
  recipient_email: string
  recipient_name: string | null
  payload: Record<string, unknown>
  status: NotificationStatus
  attempts: number
  last_error: string | null
  idempotency_key: string
  created_at: string
  sent_at: string | null
}

export interface AppNotification {
  id: string
  type: NotificationType | string
  payload: Record<string, unknown>
  created_at: string
  read_at: string | null
  reservation_id: string | null
  reservation_status: ReservationStatus | null
  reservation_number: number | null
}

export interface SignupRequest {
  id: string
  user_id: string
  business_name: string
  desired_slug: string
  business_type: string | null
  contact_phone: string | null
  city: string | null
  notes: string | null
  status: SignupRequestStatus
  rejection_reason: string | null
  business_id: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface SlugAvailability {
  available: boolean
  reason: 'invalid_format' | 'reserved' | 'taken' | null
}

export interface PlatformBusinessOverview {
  business_id: string
  name: string
  slug: string
  is_demo: boolean
  member_count: number
  resource_count: number
  reservation_count: number
  last_reservation_at: string | null
  created_at: string
}

export interface PlatformUser {
  user_id: string
  email: string
  full_name: string | null
  created_at: string
}

export interface PlatformAuditEntry {
  id: string
  actor_id: string | null
  action: string
  target_type: string
  target_id: string | null
  payload: Record<string, unknown>
  created_at: string
}

/** Slot de disponibilidad calculado para un recurso */
export interface AvailabilitySlot {
  resource_id: string
  resource_name: string
  starts_at: string
  ends_at: string
  status: 'available' | 'held' | 'reserved' | 'blocked'
}

// =============================================================================
// Dashboard de métricas — respuesta de get_business_dashboard /
// get_business_dashboard_clients (migración 04500).
// Los nombres de campo son camelCase porque el RPC devuelve jsonb ya
// armado para el front, no columnas snake_case.
// =============================================================================

export type DashboardPeriodKey = 'week' | '7d' | '30d' | 'month' | '90d'

export interface DashboardTrendPoint {
  /** Fecha local del negocio, 'YYYY-MM-DD' */
  d: string
  /** Reservas de ese día (periodo actual) */
  n: number
  /** Reservas del día espejo en el periodo anterior (mismo índice) */
  prev: number
}

export interface DashboardSla {
  requests: number
  confirmed: number
  rejected: number
  expired: number
  cancelledByClient: number
  pending: number
  onTime: number
  avgResponseMinutes: number | null
  medianResponseMinutes: number | null
  avgResponsePctOfHold: number | null
  prev: {
    requests: number
    avgResponseMinutes: number | null
    medianResponseMinutes: number | null
    onTime: number
  }
}

export interface DashboardStatusBreakdown {
  total: number
  confirmed: number
  completed: number
  pending: number
  expired: number
  rejected: number
  cancelledByClient: number
  cancelledByBusiness: number
}

export interface DashboardBusinessHours {
  /** 1 = lunes … 7 = domingo (isodow) */
  dow: number
  /** 'HH:MM' */
  open: string
  /** 'HH:MM' */
  close: string
}

export interface DashboardData {
  period: {
    from: string
    to: string
    prevFrom: string
    prevTo: string
    timezone: string
    holdMinutes: number
  }
  resources: Array<{ id: string; name: string }>
  businessHours: DashboardBusinessHours[]
  totals: { current: number; previous: number }
  statusTotals: Partial<Record<ReservationStatus, number>>
  statusTotalsPrev: Partial<Record<ReservationStatus, number>>
  trend: DashboardTrendPoint[]
  sla: DashboardSla
  heatmap: {
    /** Promedio por hora sobre todas las jornadas abiertas del periodo */
    day: Array<{ hour: number; total: number; avg: number }>
    /** dow (isodow) × hora */
    week: Array<{ dow: number; hour: number; total: number; avg: number }>
    /** Solo fechas del periodo con al menos una reserva */
    month: Array<{ date: string; total: number }>
  }
  origin: {
    client: DashboardStatusBreakdown
    business: DashboardStatusBreakdown
  }
  topClients: DashboardClientRow[]
}

export interface DashboardClientRow {
  id: string
  name: string
  client_since: string
  reservations: number
  confirmed: number
  completed: number
}

/** Fila de get_business_dashboard_clients (snake_case: viene de returns table) */
export interface DashboardClientListRow {
  client_id: string
  name: string
  phone: string | null
  client_since: string
  reservations: number
  confirmed: number
  completed: number
  cancelled: number
  /** Total de clientes con reservas en el periodo (para paginar) */
  total_count: number
}



export type ConsentPurpose = 'terms_and_privacy' | 'marketing_email'

export type ConsentStatus = 'accepted' | 'withdrawn'

export interface MarketingConsent {
  business_id: string
  business_name: string
  status: ConsentStatus
  accepted_at: string | null
  withdrawn_at: string | null
  policy_version: string
}

/**
 * Versión vigente de los documentos legales.
 * Se usa como evidencia del texto que aceptó cada usuario.
 * Incrementar al cambiar el contenido de /privacidad o /terminos.
 */
export const CURRENT_POLICY_VERSION = '2026-09-25-v2'
