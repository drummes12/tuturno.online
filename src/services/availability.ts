import { supabase } from '@/lib/supabase'

export async function fetchAvailability(resourceId: string, date: string) {
  const { data, error } = await supabase.rpc('get_resource_availability', {
    p_resource_id: resourceId,
    p_date: date
  })
  if (error) throw error
  return data
}
