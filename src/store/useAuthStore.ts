import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export type StatusAssinatura = 'ativa' | 'teste' | 'expirada' | 'cancelada'
export type PlanoAssinatura = 'basico' | 'profissional' | 'enterprise'

export interface Assinatura {
  status: StatusAssinatura
  plano: PlanoAssinatura
  expiraEm?: string
  observacoes?: string
  criadaEm: string
}

export interface AuthUser {
  id: string
  username: string
  nome: string
  email?: string
  createdAt: string
  assinatura?: Assinatura
  is_admin?: boolean
}

interface AuthStore {
  currentUser: AuthUser | null
  currentUserId: string | null
  users: AuthUser[] // Dummy para não quebrar Admin e ResetSenha
  loading: boolean
  
  initializeAuth: () => void
  _fetchProfile: (userId: string) => Promise<void>
  addUser: (email: string, password: string, nome: string) => Promise<{ success: boolean; error?: string }>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  updateUser: (userId: string, updates: Partial<Pick<AuthUser, 'nome' | 'email' | 'assinatura'>>) => Promise<void>
  deleteUser: (userId: string) => void
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      currentUserId: null,
      users: [],
      loading: true,

      initializeAuth: () => {
        // Obter sessão inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            get()._fetchProfile(session.user.id)
          } else {
            set({ currentUser: null, currentUserId: null, loading: false })
          }
        })

        // Escutar mudanças de auth
        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            await get()._fetchProfile(session.user.id)
          } else {
            set({ currentUser: null, currentUserId: null, loading: false })
          }
        })
      },

      _fetchProfile: async (userId: string) => {
        const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single()
        if (data) {
          const user: AuthUser = {
            id: data.id,
            username: data.username,
            nome: data.nome,
            email: data.email,
            createdAt: data.created_at,
            is_admin: data.is_admin,
            assinatura: {
              status: data.assinatura_status as StatusAssinatura,
              plano: data.assinatura_plano as PlanoAssinatura,
              expiraEm: data.assinatura_expira_em,
              observacoes: data.assinatura_observacoes,
              criadaEm: data.assinatura_criada_em
            }
          }
          set({ currentUser: user, currentUserId: user.id, loading: false })
        } else {
          set({ currentUser: null, currentUserId: null, loading: false })
        }
      },

      addUser: async (email, password, nome) => {
        if (!email.trim() || !password || !nome.trim())
          return { success: false, error: 'Preencha todos os campos' }
        
        const { error: _error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { nome: nome.trim(), username: email.split('@')[0] }
          }
        })

        if (error) return { success: false, error: error.message }
        return { success: true }
      },

      login: async (email, password) => {
        const { error: _error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

        if (error) return { success: false, error: 'Credenciais inválidas' }
        return { success: true }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ currentUser: null, currentUserId: null })
      },

      updateUser: async (userId, updates) => {
        const { error } = await supabase.from('user_profiles').update(updates).eq('id', userId)
        if (!error) {
          set(s => ({
            currentUser: s.currentUser?.id === userId ? { ...s.currentUser, ...updates } : s.currentUser
          }))
        }
      },

      deleteUser: (_userId) => {
        console.warn('deleteUser not fully supported in client-side Supabase Auth without Admin API')
      },

      changePassword: async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) return { success: false, error: error.message }
        return { success: true }
      },
    }),
    { name: 'gestor-auth-v2' } // Mudamos a key para não conflitar com a v1 antiga
  )
)

export const getAuthState = () => {
  return useAuthStore.getState()
}
