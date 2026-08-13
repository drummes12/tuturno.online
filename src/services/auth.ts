import { supabase } from '@/lib/supabase'

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  })
  if (error) throw error
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  phone: string
): Promise<{ user: any | null; session: any | null }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: fullName.trim(), phone: phone.trim() }
    }
  })
  if (error) throw error
  return { user: data.user, session: data.session }
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: `${window.location.origin}/recuperar-password`
    }
  )
  if (error) throw error
}

export async function signOut() {
  await supabase.auth.signOut()
}
