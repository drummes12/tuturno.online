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

/** Slot de disponibilidad calculado para un recurso */
export interface AvailabilitySlot {
  resource_id: string
  resource_name: string
  starts_at: string
  ends_at: string
  status: 'available' | 'held' | 'reserved' | 'blocked'
}
