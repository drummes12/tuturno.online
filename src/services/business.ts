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

export async function fetchBusinessContact(): Promise<{
  phone: string
  name: string
  street: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  country: string | null
  resource_label_singular: string
  resource_label_plural: string
  reservation_instructions_md: string | null
} | null> {
  const { data } = await supabase
    .from('businesses')
    .select(
      'phone, name, street, neighborhood, city, state, country, resource_label_singular, resource_label_plural, reservation_instructions_md'
    )
    .limit(1)
    .single()
  return data as {
    phone: string
    name: string
    street: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
    country: string | null
    resource_label_singular: string
    resource_label_plural: string
    reservation_instructions_md: string | null
  } | null
}

export async function updateBusiness(
  id: string,
  updates: Partial<
    Pick<
      Business,
      | 'name'
      | 'street'
      | 'neighborhood'
      | 'city'
      | 'state'
      | 'country'
      | 'resource_label_singular'
      | 'resource_label_plural'
      | 'phone'
      | 'slot_duration_minutes'
      | 'gap_minutes'
      | 'hold_duration_minutes'
      | 'cancellation_limit_hours'
      | 'max_advance_days'
      | 'reservation_instructions_md'
    >
  >
): Promise<void> {
  const { error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}
