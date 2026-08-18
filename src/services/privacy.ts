import { supabase } from '@/lib/supabase'
import { CURRENT_POLICY_VERSION } from '@/types'

/**
 * Registra la aceptación obligatoria de Términos y Política de Tratamiento
 * de Datos Personales durante el registro de cuenta.
 *
 * Usa la sesión actual (auth.uid) para identificar al usuario. Se invoca:
 *   * tras signUp cuando devuelve sesión (email confirmation desactivada)
 *   * tras signIn como fallback idempotente (cuando el signUp no dejó
 *     sesión porque requería confirmación por email)
 *
 * El error aquí no debe bloquear el flujo principal: el llamante decide
 * si propagar.
 */
export async function recordRegistrationConsent(
  policyVersion: string = CURRENT_POLICY_VERSION,
  source = 'registration'
): Promise<void> {
  const { error } = await supabase.rpc('record_registration_consent', {
    p_policy_version: policyVersion,
    p_source: source
  })
  if (error) throw error
}

/**
 * Registra el opt-in (o baja) de marketing por email para un negocio.
 * Solo lo puede dar el propio usuario autenticado.
 */
export async function setMarketingConsent(
  businessId: string,
  accept: boolean = true,
  policyVersion: string = CURRENT_POLICY_VERSION,
  source = 'reservation'
): Promise<void> {
  const { error } = await supabase.rpc('set_marketing_consent', {
    p_business_id: businessId,
    p_policy_version: policyVersion,
    p_accept: accept,
    p_source: source
  })
  if (error) throw error
}

/**
 * Retira el consentimiento de marketing para un negocio. Idempotente.
 */
export async function withdrawMarketingConsent(
  businessId: string
): Promise<void> {
  const { error } = await supabase.rpc('withdraw_marketing_consent', {
    p_business_id: businessId
  })
  if (error) throw error
}

/**
 * Devuelve el estado vigente de marketing por negocio para el usuario actual.
 */
export async function fetchMyMarketingConsents() {
  const { data, error } = await supabase.rpc('get_my_marketing_consents')
  if (error) throw error
  return data as Array<{
    business_id: string
    business_name: string
    status: 'accepted' | 'withdrawn'
    accepted_at: string | null
    withdrawn_at: string | null
    policy_version: string
  }>
}
