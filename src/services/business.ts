import { supabase } from '@/lib/supabase'
import type { Business } from '@/types'

export async function fetchBusiness(): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as Business | null
}

export async function fetchBusinessContact(): Promise<{ phone: string; name: string } | null> {
  const { data } = await supabase
    .from('businesses')
    .select('phone, name')
    .not('phone', 'is', null)
    .limit(1)
    .single()
  return data as { phone: string; name: string } | null
}

export async function updateBusiness(
  id: string,
  updates: Partial<Pick<Business, 'name' | 'address' | 'phone' | 'slot_duration_minutes' | 'gap_minutes' | 'hold_duration_minutes' | 'cancellation_limit_hours' | 'max_advance_days'>>
): Promise<void> {
  const { error } = await supabase.from('businesses').update(updates).eq('id', id)
  if (error) throw error
}
