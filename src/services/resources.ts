import { supabase } from '@/lib/supabase'
import type { Resource } from '@/types'

export async function fetchActiveResources(
  businessId: string
): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('is_active', true)
    .eq('business_id', businessId)
    .order('sort_order')
  if (error) throw error
  return data as Resource[]
}

export async function fetchAllResources(
  businessId: string
): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order')
  if (error) throw error
  return data as Resource[]
}

export async function fetchResourceName(
  resourceId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('resources')
    .select('name')
    .eq('id', resourceId)
    .single()
  return data?.name ?? null
}

export async function createResource(
  businessId: string,
  name: string,
  description: string | null,
  sortOrder: number
): Promise<void> {
  const { error } = await supabase.from('resources').insert({
    business_id: businessId,
    name: name.trim(),
    description: description?.trim() || null,
    sort_order: sortOrder
  })
  if (error) throw error
}

export async function updateResource(
  id: string,
  name: string,
  description: string | null
): Promise<void> {
  const { error } = await supabase
    .from('resources')
    .update({ name: name.trim(), description: description?.trim() || null })
    .eq('id', id)
  if (error) throw error
}

export async function toggleResourceActive(
  id: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from('resources')
    .update({ is_active: !isActive })
    .eq('id', id)
  if (error) throw error
}
