import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type PublicEnv = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  VITE_ORDERS_ENABLED?: string
}

const env = import.meta.env as PublicEnv

export const isSupabaseConfigured = Boolean(
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY,
)

export const isOrdersEnabled = env.VITE_ORDERS_ENABLED === 'true'

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  return supabase
}
