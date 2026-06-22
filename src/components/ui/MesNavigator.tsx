import { ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { formatMesAno } from '../../utils/formatters'

interface Props {
  showFecharMes?: boolean
  onFecharMes?: () => void
}

export function MesNavigator({ showFecharMes = false, onFecharMes }: Props) {
  const { mesAtivo, anoAtivo, setMesAtivo, mesesFechados } = useFinanceStore()

  const prev = () => {
    if (mesAtivo === 1) setMesAtivo(12, anoAtivo - 1)
    else setMesAtivo(mesAtivo - 1, anoAtivo)
  }

  const next = () => {
    if (mesAtivo === 12) setMesAtivo(1, anoAtivo + 1)
    else setMesAtivo(mesAtivo + 1, anoAtivo)
  }

  const hoje = new Date()
  const estesMes = mesAtivo === hoje.getMonth() + 1 && anoAtivo === hoje.getFullYear()
  const fechado = mesesFechados.some(m => m.mes === mesAtivo && m.ano === anoAtivo)
  const infoFechado = mesesFechados.find(m => m.mes === mesAtivo && m.ano === anoAtivo)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={prev}
          className="px-3 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors border-r border-slate-100 touch-manipulation active:bg-slate-100"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="px-3 sm:px-5 py-2.5 flex items-center gap-1.5 sm:gap-2 min-w-32 sm:min-w-44 justify-center">
          {fechado
            ? <Lock size={13} className="text-slate-400 flex-shrink-0" />
            : estesMes
              ? <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              : <div className="w-2 h-2 rounded-full bg-slate-200 flex-shrink-0" />
          }
          <span className="font-semibold text-slate-700 text-sm whitespace-nowrap">
            {formatMesAno(mesAtivo, anoAtivo)}
          </span>
          {estesMes && !fechado && (
            <span className="hidden sm:inline text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">atual</span>
          )}
        </div>
        <button
          onClick={next}
          className="px-3 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors border-l border-slate-100 touch-manipulation active:bg-slate-100"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {fechado && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-2 rounded-lg">
          <Lock size={11} className="text-slate-400" />
          <span className="hidden sm:inline">Fechado · {infoFechado?.contasCarryover ?? 0} carregadas</span>
          <span className="sm:hidden">Fechado</span>
        </div>
      )}

      {showFecharMes && !fechado && onFecharMes && (
        <button
          onClick={onFecharMes}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors shadow-sm touch-manipulation"
        >
          <Unlock size={14} />
          <span className="hidden sm:inline">Fechar Mês</span>
          <span className="sm:hidden">Fechar</span>
        </button>
      )}
    </div>
  )
}
