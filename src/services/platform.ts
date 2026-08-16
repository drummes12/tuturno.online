import { supabase } from '@/lib/supabase'
import type {
  BusinessRole,
  PlatformAuditEntry,
  PlatformBusinessOverview,
  PlatformUser,
  SignupRequest,
  SlugAvailability
} from '@/types'

/** Indica si el usuario autenticado es operador de la plataforma. */
export async function fetchIsPlatformAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_platform_admin')
  if (error) return false
  return data === true
}

/** Valida formato, lista de reservados y unicidad del slug en el servidor. */
export async function checkSlugAvailability(
  slug: string
): Promise<SlugAvailability> {
  const { data, error } = await supabase
    .rpc('check_slug_availability', { p_slug: slug })
    .maybeSingle()
  if (error) throw error
  const row = data as { available: boolean; reason: string | null } | null
  return {
    available: row?.available ?? false,
    reason: (row?.reason ?? null) as SlugAvailability['reason']
  }
}

export type SignupRequestInput = {
  businessName: string
  desiredSlug: string
  businessType?: string | null
  contactPhone?: string | null
  city?: string | null
  notes?: string | null
}

export async function requestBusinessSignup(
  input: SignupRequestInput
): Promise<string> {
  const { data, error } = await supabase.rpc('request_business_signup', {
    p_business_name: input.businessName,
    p_desired_slug: input.desiredSlug,
    p_business_type: input.businessType ?? null,
    p_contact_phone: input.contactPhone ?? null,
    p_city: input.city ?? null,
    p_notes: input.notes ?? null
  })
  if (error) throw error
  return data as string
}

/** Última solicitud del usuario autenticado (RLS solo devuelve las suyas). */
export async function fetchMySignupRequest(
  userId: string
): Promise<SignupRequest | null> {
  const { data, error } = await supabase
    .from('business_signup_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as SignupRequest | null
}

export async function cancelMySignupRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_business_signup_request', {
    p_request_id: requestId
  })
  if (error) throw error
}

export async function fetchSignupRequests(): Promise<SignupRequest[]> {
  const { data, error } = await supabase
    .from('business_signup_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SignupRequest[]
}

export async function approveSignupRequest(
  requestId: string,
  options: {
    slugOverride?: string | null
    labelSingular?: string
    labelPlural?: string
  } = {}
): Promise<string> {
  const { data, error } = await supabase.rpc('approve_business_signup', {
    p_request_id: requestId,
    p_slug_override: options.slugOverride ?? null,
    p_label_singular: options.labelSingular ?? 'Espacio',
    p_label_plural: options.labelPlural ?? 'Espacios'
  })
  if (error) throw error
  return data as string
}

export async function rejectSignupRequest(
  requestId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc('reject_business_signup', {
    p_request_id: requestId,
    p_reason: reason
  })
  if (error) throw error
}

export async function fetchBusinessOverview(): Promise<
  PlatformBusinessOverview[]
> {
  const { data, error } = await supabase.rpc('platform_business_overview')
  if (error) throw error
  return (data ?? []) as PlatformBusinessOverview[]
}

export async function findUserByEmail(
  email: string
): Promise<PlatformUser | null> {
  const { data, error } = await supabase.rpc('platform_find_user_by_email', {
    p_email: email
  })
  if (error) throw error
  const rows = (data ?? []) as PlatformUser[]
  return rows[0] ?? null
}

export async function setMemberRole(
  businessId: string,
  userId: string,
  role: BusinessRole
): Promise<void> {
  const { error } = await supabase.rpc('platform_set_member_role', {
    p_business_id: businessId,
    p_user_id: userId,
    p_role: role
  })
  if (error) throw error
}

export async function fetchAuditLog(
  limit = 50
): Promise<PlatformAuditEntry[]> {
  const { data, error } = await supabase
    .from('platform_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as PlatformAuditEntry[]
}
