import { supabase } from '@/lib/supabase'
import type { DashboardClientListRow, DashboardData } from '@/types'

/**
 * Métricas del dashboard del negocio en una sola llamada RPC.
 * `from`/`to` son fechas locales inclusivas ('YYYY-MM-DD') en la zona
 * horaria del negocio — la RPC convierte a UTC internamente.
 * `resourceIds` vacío/undefined = todos los recursos.
 */
export async function fetchDashboardMetrics(
  businessId: string,
  from: string,
  to: string,
  resourceIds?: string[]
): Promise<DashboardData> {
  const { data, error } = await supabase.rpc('get_business_dashboard', {
    p_business_id: businessId,
    p_from: from,
    p_to: to,
    p_resource_ids: resourceIds && resourceIds.length > 0 ? resourceIds : null,
  })
  if (error) throw error
  return data as DashboardData
}

/**
 * Lista paginada de clientes con sus reservas del periodo
 * (sheet "ver todos"). Devuelve filas + total para paginar.
 */
export async function fetchDashboardClients(
  businessId: string,
  from: string,
  to: string,
  options?: {
    resourceIds?: string[]
    search?: string
    limit?: number
    offset?: number
  }
): Promise<{ rows: DashboardClientListRow[]; total: number }> {
  const { data, error } = await supabase.rpc('get_business_dashboard_clients', {
    p_business_id: businessId,
    p_from: from,
    p_to: to,
    p_resource_ids:
      options?.resourceIds && options.resourceIds.length > 0
        ? options.resourceIds
        : null,
    p_search: options?.search?.trim() || null,
    p_limit: options?.limit ?? 20,
    p_offset: options?.offset ?? 0,
  })
  if (error) throw error
  const rows = (data ?? []) as DashboardClientListRow[]
  return { rows, total: rows[0]?.total_count ?? 0 }
}
