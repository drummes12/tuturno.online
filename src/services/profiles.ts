import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data as Profile | null
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'phone'>>
): Promise<void> {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}

export async function fetchBusinessId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  return data?.business_id ?? null
}

export async function fetchBusinessMembership(
  userId: string
): Promise<{ businessId: string; role: 'owner' | 'manager' } | null> {
  const { data } = await supabase
    .from('business_members')
    .select('business_id, role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return {
    businessId: data.business_id,
    role: data.role as 'owner' | 'manager'
  }
}
