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
  fetchUsers: () => Promise<void>
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
        const { data } = await supabase.from('user_profiles').select('*').eq('id', userId).single()
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

      fetchUsers: async () => {
        const { data, error } = await supabase.rpc('admin_list_users')
        if (!error && data) {
          const mappedUsers: AuthUser[] = data.map((u: any) => ({
            id: u.id,
            nome: u.nome || 'Sem Nome',
            username: u.username || u.email?.split('@')[0] || 'usuario',
            email: u.email,
            assinatura: {
              status: u.assinatura_status || 'teste',
              plano: u.assinatura_plano || 'basico',
              expiraEm: u.assinatura_expira_em,
              observacoes: u.assinatura_observacoes,
              criadaEm: u.created_at
            }
          }))
          set({ users: mappedUsers })
        }
      },

      addUser: async (email, password, nome) => {
        if (!email.trim() || !password || !nome.trim())
          return { success: false, error: 'Preencha todos os campos' }
        
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { nome: nome.trim(), username: email.split('@')[0] }
          }
        })

        if (signUpError) return { success: false, error: signUpError.message }
        
        // Atualiza a lista de usuários após criar
        get().fetchUsers()
        return { success: true }
      },

      login: async (email, password) => {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

        if (signInError) return { success: false, error: signInError.message }
        return { success: true }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ currentUser: null, currentUserId: null })
      },

      updateUser: async (userId, updates) => {
        if (updates.assinatura) {
          await supabase.rpc('admin_update_assinatura', {
            p_user_id: userId,
            p_status: updates.assinatura.status,
            p_plano: updates.assinatura.plano,
            p_expira_em: updates.assinatura.expiraEm,
            p_observacoes: updates.assinatura.observacoes
          })
        }
        
        const { error: _updateError } = await supabase.from('user_profiles').update({
          nome: updates.nome,
          email: updates.email
        }).eq('id', userId)

        get().fetchUsers()
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
