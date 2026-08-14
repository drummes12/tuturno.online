import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
// VITE_SUPABASE_ANON_KEY se mantiene como fallback para despliegues anteriores.
// Ambas claves son públicas; nunca uses la service_role key en el frontend.
const supabasePublishableKey = (import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY) as string

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Falta configuración de Supabase. Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en Vercel y vuelve a desplegar.'
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
