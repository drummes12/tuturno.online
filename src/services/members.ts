import { supabase } from '@/lib/supabase'
import type { BusinessRole } from '@/types'

export type BusinessMember = {
  business_id: string
  user_id: string
  role: BusinessRole
  joined_at: string
  email: string
  full_name: string | null
}

/**
 * Lista los miembros del negocio activo, incluyendo email y nombre
 * desde auth.users y profiles. Solo owners pueden ver todos los
 * miembros (RLS lo impone); los managers ven solo su propia fila.
 */
export async function fetchBusinessMembers(
  businessId: string
): Promise<BusinessMember[]> {
  const { data, error } = await supabase
    .from('business_members')
    .select('business_id, user_id, role, joined_at, profiles!inner(full_name)')
    .eq('business_id', businessId)
    .order('joined_at', { ascending: true })

  if (error) throw error

  // auth.users no es accesible vía RLS desde el cliente para usuarios
  // arbitrarios, pero los business members pueden leer perfiles de
  // usuarios que reservan en su negocio (policy en 00500). Para el email,
  // usamos una RPC que lo resuelve server-side.
  const rows = (data ?? []) as unknown as Array<{
    business_id: string
    user_id: string
    role: BusinessRole
    joined_at: string
    profiles:
      | { full_name: string | null }
      | { full_name: string | null }[]
      | null
  }>

  // Resolver emails en lote vía la función helper
  const userIds = rows.map((r) => r.user_id)
  let emailMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: emailRows, error: emailError } = await supabase.rpc(
      'resolve_member_emails',
      { p_user_ids: userIds }
    )
    if (!emailError && emailRows) {
      emailMap = Object.fromEntries(
        (emailRows as Array<{ user_id: string; email: string }>).map((r) => [
          r.user_id,
          r.email
        ])
      )
    }
  }

  return rows.map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    return {
      business_id: r.business_id,
      user_id: r.user_id,
      role: r.role,
      joined_at: r.joined_at,
      email: emailMap[r.user_id] ?? '(email no disponible)',
      full_name: profile?.full_name ?? null
    }
  })
}

/**
 * Un owner añade un manager a su negocio. El usuario debe estar
 * registrado previamente. RLS valida que el llamante sea owner.
 */
export async function addBusinessMember(
  businessId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('business_members').insert({
    business_id: businessId,
    user_id: userId,
    role: 'manager'
  })
  if (error) throw error
}

/**
 * Un owner elimina un miembro de su negocio. RLS valida que el
 * llamante sea owner. El trigger prevent_last_owner_removal impide
 * dejar el negocio sin owners.
 */
export async function removeBusinessMember(
  businessId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('business_members')
    .delete()
    .eq('business_id', businessId)
    .eq('user_id', userId)
  if (error) throw error
}

/**
 * Busca un usuario por email para invitarlo como manager.
 * Usa la misma RPC que el panel de plataforma, pero sin requerir
 * MFA — cualquier business member puede buscar para invitar.
 * La RPC solo devuelve user_id + email + full_name, no datos sensibles.
 */
export async function findUserByEmailForInvite(email: string): Promise<{
  user_id: string
  email: string
  full_name: string | null
} | null> {
  const { data, error } = await supabase.rpc('find_user_for_invite', {
    p_email: email
  })
  if (error) throw error
  const rows = data as Array<{
    user_id: string
    email: string
    full_name: string | null
  }>
  return rows[0] ?? null
}
