import { supabase } from '@/lib/supabase'
import type { Court } from '@/types'

export async function fetchActiveCourts(): Promise<Court[]> {
  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data as Court[]
}

export async function fetchAllCourts(): Promise<Court[]> {
  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data as Court[]
}

export async function fetchCourtName(courtId: string): Promise<string | null> {
  const { data } = await supabase
    .from('courts')
    .select('name')
    .eq('id', courtId)
    .single()
  return data?.name ?? null
}

export async function createCourt(name: string, description: string | null, sortOrder: number): Promise<void> {
  const { error } = await supabase.from('courts').insert({
    name: name.trim(),
    description: description?.trim() || null,
    sort_order: sortOrder,
  })
  if (error) throw error
}

export async function updateCourt(id: string, name: string, description: string | null): Promise<void> {
  const { error } = await supabase
    .from('courts')
    .update({ name: name.trim(), description: description?.trim() || null })
    .eq('id', id)
  if (error) throw error
}

export async function toggleCourtActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('courts')
    .update({ is_active: !isActive })
    .eq('id', id)
  if (error) throw error
}
