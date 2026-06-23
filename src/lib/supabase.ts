import { createClient } from '@supabase/supabase-js'

// Em desenvolvimento (localhost) acessa o Supabase diretamente.
// Em produção usa o proxy Nginx /sb/ (mesmo domínio = sem CORS).
const isLocalDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const supabaseUrl = isLocalDev
  ? (import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co')
  : `${window.location.origin}/sb`

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

if (isLocalDev && !import.meta.env.VITE_SUPABASE_URL) {
  console.warn('Atenção: VITE_SUPABASE_URL não configurado no .env — usando placeholder')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
