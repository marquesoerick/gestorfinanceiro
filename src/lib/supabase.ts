import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iehuwakiloottbyrnsqd.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllaHV3YWtpbG9vdHRieXJuc3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODc3ODUsImV4cCI6MjA5NzQ2Mzc4NX0.' +
  'zLF_pXIDE7ESmAtloCD-KMpdqI9Q3hGL2peINs3WTNM'

// Cliente principal — gerencia sessão do usuário autenticado
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Cliente auxiliar — usado pelo admin para criar novos usuários via signUp
// sem interferir na sessão ativa do admin (persistSession: false)
export const supabaseAux = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'gestor-aux-auth',
  },
})
