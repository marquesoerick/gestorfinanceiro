import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  username: string
  passwordHash: string
  nome: string
  createdAt: string
}

interface AuthStore {
  users: AuthUser[]
  currentUserId: string | null
  addUser: (username: string, password: string, nome: string) => { success: boolean; error?: string }
  login: (username: string, password: string) => { success: boolean; error?: string }
  logout: () => void
}

const hashPw = (pw: string) => btoa(encodeURIComponent(pw + 'gsf2026'))

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,

      addUser: (username, password, nome) => {
        const { users } = get()
        if (!username.trim() || !password || !nome.trim())
          return { success: false, error: 'Preencha todos os campos' }
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
          return { success: false, error: 'Nome de usuário já existe' }
        const user: AuthUser = {
          id: Math.random().toString(36).slice(2) + Date.now().toString(36),
          username: username.trim().toLowerCase(),
          passwordHash: hashPw(password),
          nome: nome.trim(),
          createdAt: new Date().toISOString(),
        }
        set(s => ({ users: [...s.users, user], currentUserId: user.id }))
        return { success: true }
      },

      login: (username, password) => {
        const { users } = get()
        const user = users.find(u => u.username === username.trim().toLowerCase())
        if (!user) return { success: false, error: 'Usuário não encontrado' }
        if (user.passwordHash !== hashPw(password)) return { success: false, error: 'Senha incorreta' }
        set({ currentUserId: user.id })
        return { success: true }
      },

      logout: () => set({ currentUserId: null }),
    }),
    { name: 'gestor-auth-v1' }
  )
)

export const getAuthState = () => {
  try {
    const raw = localStorage.getItem('gestor-auth-v1')
    if (!raw) return { users: [], currentUserId: null }
    return (JSON.parse(raw) as { state: { users: AuthUser[]; currentUserId: string | null } }).state
  } catch { return { users: [], currentUserId: null } }
}
