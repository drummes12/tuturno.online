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
 * Lista los miembros del negocio activo, incluyendo email y nombre.
 * Usa una RPC SECURITY DEFINER (resolve_member_details) que lee
 * business_members + auth.users + profiles sin que RLS de profiles
 * filtre filas (la policy de profiles solo permite leer perfiles
 * propios o de usuarios que reservaron, no de otros miembros).
 */
export async function fetchBusinessMembers(
  businessId: string
): Promise<BusinessMember[]> {
  const { data, error } = await supabase.rpc('resolve_member_details', {
    p_business_id: businessId
  })

  if (error) throw error

  const rows = (data ?? []) as Array<{
    uid: string
    role: BusinessRole
    joined_at: string
    mail: string
    full_name: string | null
  }>

  return rows.map((r) => ({
    business_id: businessId,
    user_id: r.uid,
    role: r.role,
    joined_at: r.joined_at,
    email: r.mail,
    full_name: r.full_name
  }))
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
    uid: string
    mail: string
    full_name: string | null
  }>
  if (!rows[0]) return null
  return {
    user_id: rows[0].uid,
    email: rows[0].mail,
    full_name: rows[0].full_name || null
  }
}
