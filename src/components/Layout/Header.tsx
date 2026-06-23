import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

const titles: Record<string, string> = {
  '/':                  'Dashboard',
  '/contas-pagar':      'Contas a Pagar',
  '/contas-receber':    'Contas a Receber',
  '/conciliacao':       'Conciliação Bancária',
  '/dividas':           'Gestão de Dívidas',
  '/planejamentos':     'Planejamentos',
  '/rendas':            'Fontes de Renda',
  '/provisionamento':   'Provisionamento',
  '/contas-bancarias':  'Contas Bancárias',
  '/configuracoes':     'Configurações',
  '/pessoas':           'Pessoas',
  '/importar-extrato':  'Importar Extrato',
}

interface Props { onMenuClick: () => void }

export function Header({ onMenuClick }: Props) {
  const { pathname } = useLocation()
  const { currentUser } = useAuthStore()
  const title = titles[pathname] ?? 'Gestor Financeiro'

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-500 hover:text-slate-700 p-2 -ml-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors">
        <Menu size={20} />
      </button>

      <h1 className="flex-1 text-base font-bold text-slate-800 truncate lg:text-lg">{title}</h1>

      {currentUser && (
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-semibold text-slate-700 leading-none">{currentUser.nome}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">@{currentUser.username}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
            {currentUser.nome.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </header>
  )
}
