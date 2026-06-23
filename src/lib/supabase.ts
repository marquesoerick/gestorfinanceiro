import { createClient } from '@supabase/supabase-js'

// Valores fixos — anon key é pública por design (segurança via RLS).
// Não usa import.meta.env para evitar que Dokploy sobrescreva com valor errado em build.
export const supabase = createClient(
  'https://iehuwakiloottbyrnsqd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllaHV3YWtpbG9vdHRieXJuc3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODc3ODUsImV4cCI6MjA5NzQ2Mzc4NX0.' +
  'zLF_pXIDE7ESmAtloCD-KMpdqI9Q3hGL2peINs3WTNM'
)
