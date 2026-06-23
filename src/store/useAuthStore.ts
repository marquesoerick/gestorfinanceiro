import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, supabaseAux } from '../lib/supabase'

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
  updateUser: (userId: string, updates: Partial<Pick<AuthUser, 'nome' | 'email' | 'assinatura'>>) => Promise<{ success: boolean; error?: string }>
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
}

const friendlyError = (msg: string): string => {
  if (msg === 'Failed to fetch') return 'Não foi possível conectar ao servidor. Verifique sua conexão ou se o projeto Supabase está ativo.'
  if (msg === 'Invalid login credentials') return 'E-mail ou senha incorretos.'
  if (msg.includes('already registered')) return 'Este e-mail já está cadastrado.'
  if (msg.includes('Password should be')) return 'A senha deve ter ao menos 6 caracteres.'
  return msg
}

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
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) {
          console.error('fetchUsers error:', error.message)
          return
        }
        const mappedUsers: AuthUser[] = (data ?? []).map(u => ({
          id: u.id,
          nome: u.nome || u.email?.split('@')[0] || 'Sem Nome',
          username: u.username || u.email?.split('@')[0] || 'usuario',
          email: u.email,
          is_admin: u.is_admin,
          createdAt: u.created_at,
          assinatura: {
            status: (u.assinatura_status as StatusAssinatura) || 'teste',
            plano: (u.assinatura_plano as PlanoAssinatura) || 'basico',
            expiraEm: u.assinatura_expira_em,
            observacoes: u.assinatura_observacoes,
            criadaEm: u.assinatura_criada_em ?? u.created_at
          }
        }))
        set({ users: mappedUsers })
      },

      addUser: async (email, password, nome, username) => {
        if (!password || !nome.trim() || !username?.trim())
          return { success: false, error: 'Preencha todos os campos obrigatórios' }

        const usernameToUse = username.trim()
        // Auth email sempre baseado no username — garante login por username funcionar
        const authEmail = `${usernameToUse}@gestorfinanceiro.com`
        // Email real vai apenas para o perfil como contato
        const contactEmail = email.trim() || authEmail

        // Cliente auxiliar não persiste sessão — admin nunca é deslogado
        const { data: signUpData, error: signUpError } = await supabaseAux.auth.signUp({
          email: authEmail,
          password,
          options: { data: { nome: nome.trim(), username: usernameToUse } }
        })

        if (signUpError) return { success: false, error: friendlyError(signUpError.message) }

        const newUserId = signUpData.user?.id
        if (!newUserId) return { success: false, error: 'Usuário criado mas ID não retornado.' }

        // supabaseAux tem sessão do novo usuário em memória — pode escrever o próprio perfil
        const { error: upsertError } = await supabaseAux.from('user_profiles').upsert({
          id: newUserId,
          nome: nome.trim(),
          username: usernameToUse,
          email: contactEmail,
        }, { onConflict: 'id' })

        if (upsertError) return { success: false, error: `Erro ao salvar perfil: ${upsertError.message}` }

        return { success: true, userId: newUserId }
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
        const profileUpdate: Record<string, unknown> = {}
        if (updates.nome !== undefined) profileUpdate.nome = updates.nome
        if (updates.email !== undefined) profileUpdate.email = updates.email
        if (updates.assinatura) {
          profileUpdate.assinatura_status = updates.assinatura.status
          profileUpdate.assinatura_plano = updates.assinatura.plano
          profileUpdate.assinatura_expira_em = updates.assinatura.expiraEm || null
          profileUpdate.assinatura_observacoes = updates.assinatura.observacoes || null
        }
        const { error } = await supabase
          .from('user_profiles')
          .update(profileUpdate)
          .eq('id', userId)
        if (error) {
          console.error('updateUser error:', error.message)
          return { success: false, error: error.message }
        }
        await get().fetchUsers()
        return { success: true }
      },

      deleteUser: async (userId) => {
        const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId })
        if (error) {
          console.error('deleteUser error:', error.message)
          return { success: false, error: error.message }
        }
        await get().fetchUsers()
        return { success: true }
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
