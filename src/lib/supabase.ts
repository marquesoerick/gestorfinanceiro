import { createClient } from '@supabase/supabase-js'

// Anon key é pública por design (segurança via RLS, não pela chave).
// Hardcoded como fallback caso o build não embute as vars de ambiente.
const SUPABASE_URL = 'https://iehuwakiloottbyrnsqd.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllaHV3YWtpbG9vdHRieXJuc3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODc3ODUsImV4cCI6MjA5NzQ2Mzc4NX0.' +
  'zLF_pXIDE7ESmAtloCD-KMpdqI9Q3hGL2peINs3WTNM'

// Em dev acessa o Supabase direto; em produção usa proxy Nginx /sb/ (sem CORS).
const isLocalDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const supabaseUrl = isLocalDev
  ? (import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL)
  : `${window.location.origin}/sb`

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
