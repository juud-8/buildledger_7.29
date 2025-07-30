// WARNING: Browser-only anon client. Do not import in server routes (see ESLint rule).
import { createClient } from '@supabase/supabase-js'

export const createSupabaseApiClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey)
}