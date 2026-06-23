import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CreditCard, TrendingUp, Building2,
  Wallet, Target, PiggyBank, BarChart3, GitMerge, Settings, X,
  FileUp, Users, Bell, LogOut, ChevronRight
} from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { useAuthStore } from '../../store/useAuthStore'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  badgeFn?: () => number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

interface Props {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: Props) {
  const { contasReceber, contasPagar } = useFinanceStore()
  const { users, currentUserId, logout } = useAuthStore()
  const currentUser = users.find(u => u.id === currentUserId)

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)

  const parcelasAtrasadasCount = contasReceber.filter(c =>
    c.status !== 'pago' && new Date(c.vencimento + 'T00:00:00') < hoje
  ).length

  const contasPagarAtrasadasCount = contasPagar.filter(c =>
    (c.status === 'pendente' || c.status === 'vencido') &&
    new Date(c.vencimento + 'T00:00:00') < hoje
  ).length

  const totalAlertas = parcelasAtrasadasCount + contasPagarAtrasadasCount

  const groups: NavGroup[] = [
    {
      label: 'Principal',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/contas-pagar', icon: CreditCard, label: 'Contas a Pagar', badgeFn: () => contasPagarAtrasadasCount },
        { to: '/contas-receber', icon: TrendingUp, label: 'Contas a Receber', badgeFn: () => parcelasAtrasadasCount },
        { to: '/pessoas', icon: Users, label: 'Pessoas' },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { to: '/contas-bancarias', icon: Building2, label: 'Contas Bancárias' },
        { to: '/conciliacao', icon: GitMerge, label: 'Conciliação' },
        { to: '/importar-extrato', icon: FileUp, label: 'Importar Extrato' },
        { to: '/dividas', icon: Wallet, label: 'Dívidas' },
      ],
    },
    {
      label: 'Planejamento',
      items: [
        { to: '/planejamentos', icon: Target, label: 'Planejamentos' },
        { to: '/rendas', icon: PiggyBank, label: 'Fontes de Renda' },
        { to: '/provisionamento', icon: BarChart3, label: 'Provisionamento' },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { to: '/configuracoes', icon: Settings, label: 'Configurações' },
      ],
    },
  ]

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 h-full w-60 z-30 flex flex-col
        bg-slate-950 border-r border-slate-800/60
        transition-transform duration-300 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
              <TrendingUp size={16} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">Gestor</div>
              <div className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase">Financeiro</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {totalAlertas > 0 && (
              <div className="relative">
                <Bell size={16} className="text-slate-500" />
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                  {totalAlertas > 9 ? '9+' : totalAlertas}
                </span>
              </div>
            )}
            <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-white p-1 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {groups.map(group => (
            <div key={group.label}>
              <div className="px-2 mb-1.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{group.label}</span>
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, badgeFn }) => {
                  const count = badgeFn ? badgeFn() : 0
                  return (
                    <NavLink
                      key={to} to={to} end={to === '/'}
                      onClick={() => window.innerWidth < 1024 && onClose()}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all
                        ${isActive
                          ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 font-medium'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={16} className={`flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                          <span className="flex-1 truncate">{label}</span>
                          {count > 0 && (
                            <span className="bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-bold flex-shrink-0">
                              {count > 99 ? '99+' : count}
                            </span>
                          )}
                          {isActive && <ChevronRight size={12} className="text-emerald-500 flex-shrink-0" />}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-slate-800/60 p-3">
          {currentUser && (
            <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                {currentUser.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-semibold truncate">{currentUser.nome}</div>
                <div className="text-slate-500 text-[10px] truncate">@{currentUser.username}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 text-xs font-medium transition-colors">
            <LogOut size={14} />
            Sair da conta
          </button>
        </div>
      </aside>
    </>
  )
}
