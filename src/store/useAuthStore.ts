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
  users: AuthUser[]
  loading: boolean

  initializeAuth: () => void
  _fetchProfile: (userId: string) => Promise<void>
  fetchUsers: () => Promise<void>
  addUser: (email: string, password: string, nome: string, username?: string) => Promise<{ success: boolean; error?: string; userId?: string }>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  updateUser: (userId: string, updates: Partial<Pick<AuthUser, 'nome' | 'email' | 'assinatura'>>) => Promise<void>
  deleteUser: (userId: string) => void
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
}

const friendlyError = (msg: string): string => {
  if (msg === 'Failed to fetch') return 'Não foi possível conectar ao servidor. Verifique sua conexão ou se o projeto Supabase está ativo.'
  if (msg === 'Invalid login credentials') return 'E-mail ou senha incorretos.'
  if (msg.includes('already registered')) return 'Este e-mail já está cadastrado.'
  if (msg.includes('Password should be')) return 'A senha deve ter ao menos 6 caracteres.'
  return msg
}

// Flag de módulo — suprime onAuthStateChange durante criação de usuário pelo admin
// para evitar flash de "Acesso Negado" e logout/login acidental
let suppressAuthChange = false

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      currentUserId: null,
      users: [],
      loading: true,

      initializeAuth: () => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            get()._fetchProfile(session.user.id)
          } else {
            set({ currentUser: null, currentUserId: null, loading: false })
          }
        })

        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (suppressAuthChange) return
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
              criadaEm: data.assinatura_criada_em ?? new Date().toISOString()
            }
          }
          set({ currentUser: user, currentUserId: user.id, loading: false })
        } else {
          set({ currentUser: null, currentUserId: null, loading: false })
        }
      },

      fetchUsers: async () => {
        try {
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
        } catch {
          // Falha silenciosa — sem sessão admin ou sem conexão
        }
      },

      addUser: async (email, password, nome, username) => {
        if (!email.trim() || !password || !nome.trim())
          return { success: false, error: 'Preencha todos os campos' }

        const usernameToUse = username?.trim() || email.split('@')[0]

        const { data: { session: adminSession } } = await supabase.auth.getSession()

        // Suprime listener durante todo o fluxo para evitar flash de tela
        suppressAuthChange = true
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { nome: nome.trim(), username: usernameToUse } }
          })

          if (signUpError) {
            suppressAuthChange = false
            return { success: false, error: friendlyError(signUpError.message) }
          }

          const newUserId = signUpData.user?.id ?? null

          await supabase.auth.signOut()

          if (adminSession?.access_token && adminSession?.refresh_token) {
            await supabase.auth.setSession({
              access_token: adminSession.access_token,
              refresh_token: adminSession.refresh_token
            })
          }

          // Garante username e nome corretos no novo perfil (dentro do bloco, antes de liberar flag)
          if (newUserId) {
            await supabase.from('user_profiles')
              .update({ username: usernameToUse, nome: nome.trim() })
              .eq('id', newUserId)
          }

          suppressAuthChange = false

          // Restaura perfil do admin no store
          if (adminSession?.user?.id) {
            await get()._fetchProfile(adminSession.user.id)
          }

          await get().fetchUsers()
          return { success: true, userId: newUserId ?? undefined }
        } finally {
          suppressAuthChange = false
        }
      },

      login: async (email, password) => {
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })
        if (signInError) return { success: false, error: friendlyError(signInError.message) }

        const userId = authData.user?.id
        if (!userId) return { success: false, error: 'Sessão inválida após login.' }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (profileError) {
          await supabase.auth.signOut()
          return { success: false, error: `Erro de perfil (${profileError.code}): ${profileError.message}` }
        }
        if (!profile) {
          await supabase.auth.signOut()
          return { success: false, error: 'Perfil não encontrado. Execute o SQL de correção no Supabase Dashboard.' }
        }

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

        if (updates.nome !== undefined || updates.email !== undefined) {
          await supabase.from('user_profiles').update({
            nome: updates.nome,
            email: updates.email
          }).eq('id', userId)
        }

        await get().fetchUsers()
      },

      deleteUser: (_userId) => {
        console.warn('deleteUser requer Admin API — use o painel do Supabase para excluir usuários')
      },

      changePassword: async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) return { success: false, error: friendlyError(error.message) }
        return { success: true }
      },
    }),
    { name: 'gestor-auth-v2' }
  )
)

export const getAuthState = () => {
  return useAuthStore.getState()
}
