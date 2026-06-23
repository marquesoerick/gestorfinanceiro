import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { TrendingUp, User, Lock, Eye, EyeOff, UserPlus } from 'lucide-react'

type Mode = 'login' | 'register'

export function Login() {
  const { login, addUser } = useAuthStore()
  const [mode, setMode] = useState<Mode>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Forçamos o username a ser um email falso se o usuário não digitar @
    const validEmail = email.includes('@') ? email : `${email.trim()}@gestorfinanceiro.com`

    if (mode === 'register') {
      if (!nome.trim()) { setError('Informe seu nome'); setLoading(false); return }
      if (!email.trim()) { setError('Informe seu usuário/email'); setLoading(false); return }
      if (password !== confirmPw) { setError('As senhas não conferem'); setLoading(false); return }
      if (password.length < 6) { setError('Senha deve ter ao menos 6 caracteres'); setLoading(false); return }
      
      const result = await addUser(validEmail, password, nome.trim())
      if (!result.success) { 
        setError(result.error ?? 'Erro ao criar conta no Supabase')
        setLoading(false)
        return 
      }
      // O Zustand será atualizado via onAuthStateChange, mas aguardamos
    } else {
      if (!email.trim() || !password) { setError('Preencha usuário e senha'); setLoading(false); return }
      
      const result = await login(validEmail, password)
      if (!result.success) { 
        setError(result.error ?? 'Usuário ou senha incorretos')
        setLoading(false)
        return 
      }
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m); setError('')
    setNome(''); setEmail(''); setPassword(''); setConfirmPw('')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl shadow-2xl shadow-emerald-500/30 mb-5">
            <TrendingUp size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Gestor Financeiro</h1>
          <p className="text-slate-500 text-sm mt-1.5">Conectado ao Supabase</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-slate-100">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors relative ${
                  mode === m ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
                }`}>
                {m === 'login' ? 'Entrar' : 'Criar conta'}
                {mode === m && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Seu nome</label>
                <div className="relative">
                  <UserPlus size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={nome} onChange={e => setNome(e.target.value)}
                    placeholder="Ex: João Silva"
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none
                      focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-slate-50"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Email ou Usuário</label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="nome.usuario ou email"
                  autoFocus={mode === 'login'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none
                    focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm outline-none
                    focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-slate-50"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Confirmar senha</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none
                      focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-slate-50"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors
                shadow-lg shadow-emerald-200 mt-2">
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
