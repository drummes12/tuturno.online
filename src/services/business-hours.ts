import { supabase } from '@/lib/supabase'
import { isDemoBusinessId, isDemoEntityId } from '@/lib/demo'
import {
  demoFetchBusinessHours,
  demoInsertBusinessHour,
  demoUpdateBusinessHour,
  demoDeleteBusinessHour
} from '@/lib/demo-store'
import type { BusinessHours } from '@/types'

export async function fetchBusinessHours(
  businessId: string
): Promise<BusinessHours[]> {
  if (isDemoBusinessId(businessId)) return demoFetchBusinessHours()
  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', businessId)
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
  if (isDemoBusinessId(businessId))
    return demoInsertBusinessHour(dayOfWeek, openTime, closeTime, isActive)
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
  if (isDemoEntityId(id))
    return demoUpdateBusinessHour(id, openTime, closeTime, isActive)
  const { error } = await supabase
    .from('business_hours')
    .update({ open_time: openTime, close_time: closeTime, is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

export async function deleteBusinessHour(id: string): Promise<void> {
  if (isDemoEntityId(id)) return demoDeleteBusinessHour(id)
  const { error } = await supabase.from('business_hours').delete().eq('id', id)
  if (error) throw error
}
