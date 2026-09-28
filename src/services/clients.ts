import { supabase } from '@/lib/supabase'
import { isDemoBusinessId } from '@/lib/demo'
import { demoSearchClients } from '@/lib/demo-store'
import type { ClientSearchResult } from '@/types'

/**
 * Busca clientes del negocio por nombre, teléfono o email.
 * Solo accesible por miembros del negocio (RLS + RPC validan).
 */
export async function searchClients(
  businessId: string,
  query: string
): Promise<ClientSearchResult[]> {
  if (query.trim().length < 2) return []
  if (isDemoBusinessId(businessId)) return demoSearchClients(query)

  const { data, error } = await supabase.rpc('search_clients', {
    p_business_id: businessId,
    p_query: query.trim(),
  })
  if (error) throw error
  return data as ClientSearchResult[]
}
