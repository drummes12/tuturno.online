import { supabase } from '@/lib/supabase'

export async function fetchAvailability(courtId: string, date: string) {
  const { data, error } = await supabase.rpc('get_availability', {
    p_court_id: courtId,
    p_date: date,
  })
  if (error) throw error
  return data
}
