import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAdminStore } from '../store/useAdminStore'
import { useAuthStore } from '../store/useAuthStore'
import { Shield, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'

export function ResetSenha() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { consumeResetToken } = useAdminStore()
  const { changePassword, users } = useAuthStore()

  const token = params.get('token') ?? ''
  const [userId, setUserId] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const { resetTokens } = useAdminStore.getState()
    const entry = resetTokens[token]
    if (!token || !entry || entry.usado || new Date(entry.expiraEm) < new Date()) {
      setInvalid(true)
    } else {
      setUserId(entry.userId)
    }
  }, [token])

  const user = users.find(u => u.id === userId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!pw || pw.length < 6) { setError('Senha deve ter ao menos 6 caracteres'); return }
    if (pw !== pw2) { setError('As senhas não coincidem'); return }
    const uid = consumeResetToken(token)
    if (!uid) { setInvalid(true); return }
    changePassword(uid, pw)
    setSuccess(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-500/30 mb-5">
            <Shield size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Redefinir Senha</h1>
          <p className="text-slate-400 text-sm mt-1">Gestor Financeiro</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Invalid token */}
          {invalid && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
                <XCircle size={28} className="text-red-500" />
              </div>
              <h2 className="font-bold text-slate-800 text-lg mb-2">Link inválido ou expirado</h2>
              <p className="text-slate-500 text-sm mb-6">
                Este link de redefinição de senha não é válido, já foi utilizado ou expirou.
                Entre em contato com o administrador para obter um novo link.
              </p>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Voltar para o Login
              </button>
            </div>
          )}

          {/* Success */}
          {!invalid && success && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-full mb-4">
                <CheckCircle size={28} className="text-emerald-500" />
              </div>
              <h2 className="font-bold text-slate-800 text-lg mb-2">Senha alterada!</h2>
              <p className="text-slate-500 text-sm mb-6">
                Sua senha foi redefinida com sucesso. Você já pode fazer login com a nova senha.
              </p>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Ir para o Login
              </button>
            </div>
          )}

          {/* Form */}
          {!invalid && !success && (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {user && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm">
                  <p className="text-indigo-600 font-medium">Olá, <strong>{user.nome}</strong></p>
                  <p className="text-indigo-500 text-xs mt-0.5">@{user.username}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pw}
                    onChange={e => { setPw(e.target.value); setError('') }}
                    placeholder="Mínimo 6 caracteres"
                    autoFocus
                    className="fi pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Confirmar Senha
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw2}
                  onChange={e => { setPw2(e.target.value); setError('') }}
                  placeholder="Confirme a nova senha"
                  className="fi"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-indigo-200 mt-2"
              >
                Redefinir Senha
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-5">
          Gestor Financeiro — Dados salvos com segurança neste dispositivo
        </p>
      </div>
    </div>
  )
}
