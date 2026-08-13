import { supabase } from '@/lib/supabase'
import type { BusinessHours } from '@/types'

export async function fetchBusinessHours(): Promise<BusinessHours[]> {
  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .order('day_of_week, open_time')
  if (error) throw error
  return data as BusinessHours[]
}

export async function insertBusinessHour(
  businessId: string,
  dayOfWeek: number,
  openTime: string,
  closeTime: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase.from('business_hours').insert({
    business_id: businessId,
    day_of_week: dayOfWeek,
    open_time: openTime,
    close_time: closeTime,
    is_active: isActive,
  })
  if (error) throw error
}

export async function updateBusinessHour(
  id: string,
  openTime: string,
  closeTime: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from('business_hours')
    .update({ open_time: openTime, close_time: closeTime, is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

export async function deleteBusinessHour(id: string): Promise<void> {
  const { error } = await supabase.from('business_hours').delete().eq('id', id)
  if (error) throw error
}
