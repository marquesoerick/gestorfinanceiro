import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ResetToken {
  userId: string
  expiraEm: string
  usado: boolean
}

interface AdminStore {
  resetTokens: Record<string, ResetToken>
  generateResetToken: (userId: string) => string
  consumeResetToken: (token: string) => string | null
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      resetTokens: {},

      generateResetToken: (userId) => {
        const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36)
        const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        set(s => ({ resetTokens: { ...s.resetTokens, [token]: { userId, expiraEm, usado: false } } }))
        return token
      },

      consumeResetToken: (token) => {
        const entry = get().resetTokens[token]
        if (!entry || entry.usado || new Date(entry.expiraEm) < new Date()) return null
        set(s => ({ resetTokens: { ...s.resetTokens, [token]: { ...s.resetTokens[token], usado: true } } }))
        return entry.userId
      },
    }),
    { name: 'gestor-admin-v1' }
  )
)
