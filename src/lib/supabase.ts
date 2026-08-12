import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabasePublishableKey = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Falta configuración de Supabase. Crea un archivo .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.'
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
