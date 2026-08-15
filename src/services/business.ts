import { supabase } from '@/lib/supabase'
import type { Business } from '@/types'

export type BusinessContact = {
  id: string
  phone: string
  whatsapp_link: string | null
  name: string
  slug: string
  street: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  country: string | null
  resource_label_singular: string
  resource_label_plural: string
  reservation_instructions_md: string | null
  is_demo: boolean
}

/**
 * Resolve a public business by its slug.
 * Replaces the old fetchBusiness() that used .limit(1).
 */
export async function fetchBusinessBySlug(
  slug: string
): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data as Business | null
}

/**
 * Fetch public contact/config data for a specific business by ID.
 * Replaces the old fetchBusinessContact() that used .limit(1).
 */
export async function fetchBusinessContactById(
  businessId: string
): Promise<BusinessContact | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select(
      'id, phone, whatsapp_link, name, slug, street, neighborhood, city, state, country, resource_label_singular, resource_label_plural, reservation_instructions_md, is_demo'
    )
    .eq('id', businessId)
    .maybeSingle()
  if (error) throw error
  return data as BusinessContact | null
}

/**
 * Fetch a business by ID (used by admin pages).
 */
export async function fetchBusinessById(id: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as Business | null
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
      | 'whatsapp_link'
      | 'slot_duration_minutes'
      | 'gap_minutes'
      | 'hold_duration_minutes'
      | 'min_advance_minutes'
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
