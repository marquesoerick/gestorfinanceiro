import { useState, useMemo } from 'react'
import {
  Users, Shield, Plus, Key, Trash2, Pencil, LogOut, Lock,
  Eye, EyeOff, Settings, Copy, CheckCircle, AlertTriangle, Database
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAdminStore } from '../store/useAdminStore'
import type { AuthUser, Assinatura, StatusAssinatura, PlanoAssinatura } from '../store/useAuthStore'
import { formatDate } from '../utils/formatters'

// ─── Color maps ─────────────────────────────────────────────────────────────
const assinaturaStatusColor: Record<StatusAssinatura, string> = {
  ativa: 'bg-emerald-100 text-emerald-700',
  teste: 'bg-blue-100 text-blue-700',
  expirada: 'bg-red-100 text-red-700',
  cancelada: 'bg-slate-100 text-slate-600',
}
const planoLabel: Record<PlanoAssinatura, string> = {
  basico: 'Básico',
  profissional: 'Profissional',
  enterprise: 'Enterprise',
}
const statusLabel: Record<StatusAssinatura, string> = {
  ativa: 'Ativa',
  teste: 'Teste',
  expirada: 'Expirada',
  cancelada: 'Cancelada',
}

// ─── Data size helper ────────────────────────────────────────────────────────
const dataSize = (userId: string) => {
  const raw = localStorage.getItem(`gestor-data-${userId}`)
  if (!raw) return '—'
  return `${(raw.length / 1024).toFixed(1)} KB`
}

// ─── Shared input class ──────────────────────────────────────────────────────
const INP = 'fi'
const SELECT_CLS = `${INP} cursor-pointer`

// ─── Types for modal state ────────────────────────────────────────────────────
type ModalType =
  | { kind: 'none' }
  | { kind: 'novo' }
  | { kind: 'editar'; user: AuthUser }
  | { kind: 'reset'; user: AuthUser }
  | { kind: 'senha'; user: AuthUser }
  | { kind: 'excluir'; user: AuthUser }
  | { kind: 'config' }

// ─── Admin Login ─────────────────────────────────────────────────────────────
function AdminLogin() {
  const { loginAdmin } = useAdminStore()
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginAdmin(pw)) {
      setError('Senha incorreta')
      setPw('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-500/30 mb-5">
            <Shield size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Painel Administrativo</h1>
          <p className="text-slate-400 text-sm mt-1">Gestor Financeiro</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Senha do Administrador
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError('') }}
                  placeholder="••••••••"
                  autoFocus
                  className={`${INP} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-indigo-200"
            >
              Acessar Painel
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-4">
            Senha padrão: <span className="font-mono font-semibold text-slate-600">admin@2026</span>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-base">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Modal: Novo Usuário ──────────────────────────────────────────────────────
function ModalNovoUsuario({ onClose }: { onClose: () => void }) {
  const { addUser, updateUser, users } = useAuthStore()
  const [nome, setNome] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [plano, setPlano] = useState<PlanoAssinatura>('basico')
  const [status, setStatus] = useState<StatusAssinatura>('teste')
  const [expiraEm, setExpiraEm] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!nome.trim() || !username.trim() || !senha) {
      setError('Nome, usuário e senha são obrigatórios')
      return
    }
    const result = addUser(username.trim(), senha, nome.trim())
    if (!result.success) { setError(result.error ?? 'Erro ao criar usuário'); return }

    // Find the newly created user
    const newUser = useAuthStore.getState().users.find(u => u.username === username.trim().toLowerCase())
    if (newUser) {
      updateUser(newUser.id, {
        email: email.trim() || undefined,
        assinatura: {
          status,
          plano,
          expiraEm: expiraEm || undefined,
          observacoes: observacoes.trim() || undefined,
          criadaEm: new Date().toISOString(),
        },
      })
      // addUser auto-logs in as the new user — always revert to null since admin panel
      // is completely separate from the finance app; admin never logs into finance here
      useAuthStore.setState({ currentUserId: null })
    }
    onClose()
  }

  return (
    <Modal title="Novo Usuário" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nome *</label>
          <input className={INP} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" autoFocus />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Username *</label>
          <input className={INP} value={username} onChange={e => setUsername(e.target.value)} placeholder="usuario.nome" autoCapitalize="none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
          <input className={INP} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Senha *</label>
          <input className={INP} type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 4 caracteres" />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Assinatura</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Plano</label>
              <select className={SELECT_CLS} value={plano} onChange={e => setPlano(e.target.value as PlanoAssinatura)}>
                <option value="basico">Básico</option>
                <option value="profissional">Profissional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Status</label>
              <select className={SELECT_CLS} value={status} onChange={e => setStatus(e.target.value as StatusAssinatura)}>
                <option value="teste">Teste</option>
                <option value="ativa">Ativa</option>
                <option value="expirada">Expirada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Expira Em</label>
            <input className={INP} type="date" value={expiraEm} onChange={e => setExpiraEm(e.target.value)} />
          </div>
          <div className="mt-3">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Observações</label>
            <textarea className={`${INP} resize-none`} rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações internas..." />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors">
            Criar Usuário
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal: Editar Assinatura ─────────────────────────────────────────────────
function ModalEditarAssinatura({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const { updateUser } = useAuthStore()
  const existing = user.assinatura
  const [status, setStatus] = useState<StatusAssinatura>(existing?.status ?? 'teste')
  const [plano, setPlano] = useState<PlanoAssinatura>(existing?.plano ?? 'basico')
  const [expiraEm, setExpiraEm] = useState(existing?.expiraEm?.split('T')[0] ?? '')
  const [observacoes, setObservacoes] = useState(existing?.observacoes ?? '')

  const handleSave = () => {
    const assinatura: Assinatura = {
      status,
      plano,
      expiraEm: expiraEm || undefined,
      observacoes: observacoes.trim() || undefined,
      criadaEm: existing?.criadaEm ?? new Date().toISOString(),
    }
    updateUser(user.id, { assinatura })
    onClose()
  }

  return (
    <Modal title={`Assinatura — ${user.nome}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Status *</label>
            <select className={SELECT_CLS} value={status} onChange={e => setStatus(e.target.value as StatusAssinatura)}>
              <option value="ativa">Ativa</option>
              <option value="teste">Teste</option>
              <option value="expirada">Expirada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Plano *</label>
            <select className={SELECT_CLS} value={plano} onChange={e => setPlano(e.target.value as PlanoAssinatura)}>
              <option value="basico">Básico</option>
              <option value="profissional">Profissional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Expira Em</label>
          <input className={INP} type="date" value={expiraEm} onChange={e => setExpiraEm(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Observações</label>
          <textarea className={`${INP} resize-none`} rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações internas..." />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors">
            Salvar
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal: Link de Redefinição de Senha ─────────────────────────────────────
function ModalResetLink({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const { generateResetToken } = useAdminStore()
  const [copied, setCopied] = useState(false)
  const token = useMemo(() => generateResetToken(user.id), [user.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const link = `${window.location.origin}/reset-senha?token=${token}`

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Modal title="Link de Redefinição de Senha" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2 text-blue-700 text-sm">
          <Key size={14} />
          <span>Link válido por <strong>24 horas</strong> para {user.nome}</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">URL de Redefinição</label>
          <textarea
            readOnly
            value={link}
            rows={3}
            className={`${INP} resize-none font-mono text-xs text-slate-600 cursor-text`}
            onClick={e => (e.target as HTMLTextAreaElement).select()}
          />
        </div>

        <button
          onClick={handleCopy}
          className={`w-full py-2.5 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
          {copied ? 'Link Copiado!' : 'Copiar Link'}
        </button>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-amber-700 text-sm">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>Compartilhe este link com o usuário via WhatsApp, e-mail ou SMS</span>
        </div>

        <button onClick={onClose} className="w-full py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors">
          Fechar
        </button>
      </div>
    </Modal>
  )
}

// ─── Modal: Alterar Senha (admin reseta senha do usuário) ─────────────────────
function ModalAlterarSenha({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const { changePassword } = useAuthStore()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSave = () => {
    if (!pw || pw.length < 4) { setError('Senha deve ter ao menos 4 caracteres'); return }
    if (pw !== pw2) { setError('As senhas não coincidem'); return }
    changePassword(pw)
    setSuccess(true)
    setTimeout(onClose, 1200)
  }

  return (
    <Modal title={`Alterar Senha — ${user.nome}`} onClose={onClose}>
      <div className="space-y-4">
        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-4 rounded-xl flex items-center gap-2">
            <CheckCircle size={16} />
            <span className="font-semibold">Senha alterada com sucesso!</span>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nova Senha *</label>
              <div className="relative">
                <input
                  className={`${INP} pr-10`}
                  type={show ? 'text' : 'password'}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError('') }}
                  placeholder="Nova senha"
                  autoFocus
                />
                <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Confirmar Senha *</label>
              <input
                className={INP}
                type={show ? 'text' : 'password'}
                value={pw2}
                onChange={e => { setPw2(e.target.value); setError('') }}
                placeholder="Confirmar nova senha"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors">
                Alterar Senha
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Modal: Excluir Usuário ───────────────────────────────────────────────────
function ModalExcluirUsuario({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const { deleteUser } = useAuthStore()

  const handleConfirm = () => {
    deleteUser(user.id)
    localStorage.removeItem(`gestor-data-${user.id}`)
    onClose()
  }

  return (
    <Modal title="Excluir Usuário" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 text-sm mb-1">Ação irreversível</p>
              <p className="text-red-600 text-sm">
                Isso irá deletar todos os dados financeiros do usuário <strong>{user.nome}</strong>. Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600">
          <div className="flex justify-between"><span className="font-medium">Usuário:</span><span>@{user.username}</span></div>
          <div className="flex justify-between mt-1"><span className="font-medium">Dados armazenados:</span><span>{dataSize(user.id)}</span></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-colors">
            Excluir Definitivamente
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal: Configurações Admin ───────────────────────────────────────────────
function ModalConfig({ onClose }: { onClose: () => void }) {
  const { changeAdminPassword } = useAdminStore()
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSave = () => {
    if (!oldPw || !newPw || !confirmPw) { setError('Preencha todos os campos'); return }
    if (newPw.length < 6) { setError('Nova senha deve ter ao menos 6 caracteres'); return }
    if (newPw !== confirmPw) { setError('As senhas não coincidem'); return }
    const ok = changeAdminPassword(oldPw, newPw)
    if (!ok) { setError('Senha atual incorreta'); return }
    setSuccess(true)
    setTimeout(onClose, 1500)
  }

  return (
    <Modal title="Configurações do Administrador" onClose={onClose}>
      <div className="space-y-4">
        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-4 rounded-xl flex items-center gap-2">
            <CheckCircle size={16} />
            <span className="font-semibold">Senha alterada com sucesso!</span>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Senha Atual *</label>
              <div className="relative">
                <input
                  className={`${INP} pr-10`}
                  type={show ? 'text' : 'password'}
                  value={oldPw}
                  onChange={e => { setOldPw(e.target.value); setError('') }}
                  placeholder="Senha atual"
                  autoFocus
                />
                <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nova Senha *</label>
              <input className={INP} type={show ? 'text' : 'password'} value={newPw} onChange={e => { setNewPw(e.target.value); setError('') }} placeholder="Nova senha (min. 6 chars)" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Confirmar Nova Senha *</label>
              <input className={INP} type={show ? 'text' : 'password'} value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError('') }} placeholder="Confirmar nova senha" />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors">
                Alterar Senha
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: StatusAssinatura }) {
  if (!status) return <span className="text-slate-400 text-xs">—</span>
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${assinaturaStatusColor[status]}`}>
      {statusLabel[status]}
    </span>
  )
}

// ─── Action Buttons ────────────────────────────────────────────────────────────
function ActionBtn({ onClick, title, className, children }: { onClick: () => void; title: string; className: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${className}`}
    >
      {children}
    </button>
  )
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
export function Admin() {
  const { isAuthenticated, logoutAdmin } = useAdminStore()
  const { users } = useAuthStore()
  const [modal, setModal] = useState<ModalType>({ kind: 'none' })

  if (!isAuthenticated) return <AdminLogin />

  // KPI stats
  const totalUsers = users.length
  const ativas = users.filter(u => u.assinatura?.status === 'ativa').length
  const teste = users.filter(u => u.assinatura?.status === 'teste').length
  const expiradas = users.filter(u => u.assinatura?.status === 'expirada' || u.assinatura?.status === 'cancelada').length

  const closeModal = () => setModal({ kind: 'none' })

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield size={18} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Painel Administrativo</h1>
              <p className="text-indigo-300 text-xs">Gestor Financeiro</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal({ kind: 'config' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Configurações</span>
            </button>
            <button
              onClick={logoutAdmin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Users size={16} className="text-indigo-600" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{totalUsers}</p>
            <p className="text-xs text-slate-400 mt-0.5">Usuários cadastrados</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle size={16} className="text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ativas</span>
            </div>
            <p className="text-3xl font-bold text-emerald-700">{ativas}</p>
            <p className="text-xs text-slate-400 mt-0.5">Assinaturas ativas</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <Shield size={16} className="text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Teste</span>
            </div>
            <p className="text-3xl font-bold text-blue-700">{teste}</p>
            <p className="text-xs text-slate-400 mt-0.5">Em período de teste</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={16} className="text-red-600" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Inativas</span>
            </div>
            <p className="text-3xl font-bold text-red-700">{expiradas}</p>
            <p className="text-xs text-slate-400 mt-0.5">Expiradas / Canceladas</p>
          </div>
        </div>

        {/* Users Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-slate-500" />
              <h2 className="font-bold text-slate-800">Usuários</h2>
              <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">{totalUsers}</span>
            </div>
            <button
              onClick={() => setModal({ kind: 'novo' })}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={14} />
              Novo Usuário
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            {users.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum usuário cadastrado</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Nome</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Username</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Plano</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Expira Em</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Dados</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.nome.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-700">{u.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">@{u.username}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{u.email ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{u.assinatura ? planoLabel[u.assinatura.plano] : <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3"><StatusBadge status={u.assinatura?.status} /></td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {u.assinatura?.expiraEm ? formatDate(u.assinatura.expiraEm.split('T')[0]) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Database size={11} />
                          {dataSize(u.id)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <ActionBtn onClick={() => setModal({ kind: 'editar', user: u })} title="Editar assinatura" className="text-indigo-500 hover:bg-indigo-50">
                            <Pencil size={13} />
                          </ActionBtn>
                          <ActionBtn onClick={() => setModal({ kind: 'reset', user: u })} title="Gerar link de redefinição de senha" className="text-amber-500 hover:bg-amber-50">
                            <Key size={13} />
                          </ActionBtn>
                          <ActionBtn onClick={() => setModal({ kind: 'senha', user: u })} title="Alterar senha" className="text-slate-500 hover:bg-slate-100">
                            <Lock size={13} />
                          </ActionBtn>
                          <ActionBtn onClick={() => setModal({ kind: 'excluir', user: u })} title="Excluir usuário" className="text-red-500 hover:bg-red-50">
                            <Trash2 size={13} />
                          </ActionBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {users.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Users size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum usuário cadastrado</p>
              </div>
            ) : (
              users.map(u => (
                <div key={u.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {u.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{u.nome}</div>
                        <div className="text-xs text-slate-400 font-mono">@{u.username}</div>
                      </div>
                    </div>
                    <StatusBadge status={u.assinatura?.status} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>
                      <span className="font-semibold text-slate-400">Plano: </span>
                      {u.assinatura ? planoLabel[u.assinatura.plano] : '—'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400">Expira: </span>
                      {u.assinatura?.expiraEm ? formatDate(u.assinatura.expiraEm.split('T')[0]) : '—'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400">Dados: </span>
                      {dataSize(u.id)}
                    </div>
                    {u.email && (
                      <div className="col-span-2 truncate">
                        <span className="font-semibold text-slate-400">Email: </span>
                        {u.email}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setModal({ kind: 'editar', user: u })}
                      className="flex-1 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <Pencil size={12} /> Assinatura
                    </button>
                    <button
                      onClick={() => setModal({ kind: 'reset', user: u })}
                      className="flex-1 py-2 text-xs font-semibold text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <Key size={12} /> Reset Link
                    </button>
                    <button
                      onClick={() => setModal({ kind: 'senha', user: u })}
                      className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <Lock size={12} /> Senha
                    </button>
                    <button
                      onClick={() => setModal({ kind: 'excluir', user: u })}
                      className="py-2 px-3 text-xs font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {modal.kind === 'novo' && <ModalNovoUsuario onClose={closeModal} />}
      {modal.kind === 'editar' && <ModalEditarAssinatura user={modal.user} onClose={closeModal} />}
      {modal.kind === 'reset' && <ModalResetLink user={modal.user} onClose={closeModal} />}
      {modal.kind === 'senha' && <ModalAlterarSenha user={modal.user} onClose={closeModal} />}
      {modal.kind === 'excluir' && <ModalExcluirUsuario user={modal.user} onClose={closeModal} />}
      {modal.kind === 'config' && <ModalConfig onClose={closeModal} />}
    </div>
  )
}
