import { useState, useRef, useEffect } from 'react'
import { UserPlus, X, Search } from 'lucide-react'
import type { Pessoa, TipoPessoa } from '../../types'

interface Props {
  pessoas: Pessoa[]
  value: string
  onChange: (id: string) => void
  label?: string
  placeholder?: string
  tipoFiltro?: TipoPessoa[]
  onQuickAdd?: (nomePreenchido?: string) => void
  quickAddLabel?: string
  error?: string
}

export function PessoaCombobox({
  pessoas,
  value,
  onChange,
  label,
  placeholder = 'Buscar ou selecionar...',
  tipoFiltro,
  onQuickAdd,
  quickAddLabel = 'Nova pessoa',
  error,
}: Props) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const lista = tipoFiltro
    ? pessoas.filter(p => p.ativa && tipoFiltro.includes(p.tipo))
    : pessoas.filter(p => p.ativa)

  const selecionada = lista.find(p => p.id === value) ?? null

  const filtradas = busca.trim()
    ? lista.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase().trim()))
    : lista

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
        setBusca('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selecionar = (p: Pessoa) => {
    onChange(p.id)
    setBusca('')
    setAberto(false)
  }

  const limpar = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setBusca('')
    setAberto(false)
  }

  const abrir = () => {
    setAberto(true)
    setBusca('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</label>
          {onQuickAdd && (
            <button type="button" onClick={() => onQuickAdd()}
              className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:bg-blue-50 px-2 py-0.5 rounded-full transition-colors">
              <UserPlus size={11} />
              {quickAddLabel}
            </button>
          )}
        </div>
      )}

      {/* Trigger: mostra pessoa selecionada ou campo de busca */}
      {!aberto ? (
        <div onClick={abrir}
          className={`fi flex items-center justify-between cursor-pointer min-h-[38px] ${error ? 'border-red-400 bg-red-50' : ''} ${!selecionada ? 'text-slate-400' : 'text-slate-700'}`}>
          <span className="truncate">{selecionada ? selecionada.nome : placeholder}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {selecionada && (
              <button type="button" onClick={limpar}
                className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={12} />
              </button>
            )}
            <Search size={13} className="text-slate-300" />
          </div>
        </div>
      ) : (
        <input
          ref={inputRef}
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder={`Buscar em ${lista.length} ${lista.length === 1 ? 'pessoa' : 'pessoas'}...`}
          className="fi w-full"
          onKeyDown={e => {
            if (e.key === 'Escape') { setAberto(false); setBusca('') }
            if (e.key === 'Enter' && filtradas.length === 1) selecionar(filtradas[0])
          }}
        />
      )}

      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠ {error}</p>}

      {/* Dropdown */}
      {aberto && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtradas.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">
                Nenhuma pessoa encontrada
                {onQuickAdd && (
                  <button type="button" onClick={() => { const nome = busca.trim(); setAberto(false); setBusca(''); onQuickAdd(nome) }}
                    className="block mx-auto mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                    + Cadastrar "{busca.trim()}"
                  </button>
                )}
              </div>
            ) : (
              <>
                <button type="button"
                  onClick={() => { onChange(''); setBusca(''); setAberto(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 border-b border-slate-100 transition-colors">
                  — Nenhum —
                </button>
                {filtradas.map(p => (
                  <button key={p.id} type="button" onClick={() => selecionar(p)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                      ${p.id === value ? 'bg-emerald-50 text-emerald-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}>
                    <span>{p.nome}</span>
                    {p.telefone && <span className="text-xs text-slate-400">{p.telefone}</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
