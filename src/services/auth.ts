import { supabase } from '@/lib/supabase'
import { recordRegistrationConsent } from '@/services/privacy'
import { CURRENT_POLICY_VERSION } from '@/types'

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  })
  if (error) throw error

  // Fallback idempotente: si el usuario se registró cuando el email
  // confirmation estaba activo, su consentimiento de registro no se
  // pudo persistir. Lo registramos ahora en el primer login.
  try {
    await recordRegistrationConsent(CURRENT_POLICY_VERSION, 'signin_fallback')
  } catch {
    // No bloquear el login por un fallo de consentimiento.
  }
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

  // Registrar la aceptación obligatoria de Términos y Política.
  // Solo funciona si signUp devolvió sesión (email confirmation
  // desactivada). Si no, se registrará en el primer signIn.
  if (data.session) {
    try {
      await recordRegistrationConsent(CURRENT_POLICY_VERSION, 'registration')
    } catch {
      // No propagar: el registro ya ocurrió.
    }
  }

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

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function signOut() {
  await supabase.auth.signOut()
}
