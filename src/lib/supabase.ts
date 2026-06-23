import { createClient } from '@supabase/supabase-js'

// Anon key é pública por design — segurança é garantida pelo RLS, não pela chave.
// Hardcoded para garantir funcionamento mesmo quando o build não embute as vars VITE_.
const SUPABASE_URL = 'https://iehuwakiloottbyrnsqd.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllaHV3YWtpbG9vdHRieXJuc3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODc3ODUsImV4cCI6MjA5NzQ2Mzc4NX0.' +
  'zLF_pXIDE7ESmAtloCD-KMpdqI9Q3hGL2peINs3WTNM'

// Acesso direto ao Supabase — CORS do Supabase permite qualquer origem por padrão.
// O erro "Failed to fetch" anterior era porque a URL era "placeholder.supabase.co" (sem env vars).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
