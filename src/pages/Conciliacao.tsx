import { useState, useMemo } from 'react'
import { Plus, CheckCircle, XCircle, AlertCircle, GitMerge, Filter } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency, formatDate, toDateInput } from '../utils/formatters'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

const emptyForm = () => ({
  data: toDateInput(), descricao: '', valor: 0,
  tipo: 'debito' as 'debito' | 'credito', banco: 'ItaÃº',
  categoria: '', conciliado: false, statusConciliacao: 'pendente' as const
})

export function Conciliacao() {
  const { transacoesBancarias, addTransacao, updateTransacao, deleteTransacao, contasBancarias } = useFinanceStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [filtroBanco, setFiltroBanco] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')

  const bancos = useMemo(() => [...new Set(contasBancarias.map(c => c.banco))], [contasBancarias])

  const filtered = useMemo(() =>
    transacoesBancarias.filter(t =>
      (filtroBanco === 'todos' || t.banco === filtroBanco) &&
      (filtroStatus === 'todos' || t.statusConciliacao === filtroStatus) &&
      (filtroTipo === 'todos' || t.tipo === filtroTipo)
    ).sort((a, b) => b.data.localeCompare(a.data))
  , [transacoesBancarias, filtroBanco, filtroStatus, filtroTipo])

  const stats = useMemo(() => ({
    conciliadas: transacoesBancarias.filter(t => t.conciliado).length,
    pendentes: transacoesBancarias.filter(t => !t.conciliado).length,
    totalCredito: transacoesBancarias.filter(t => t.tipo === 'credito').reduce((s, t) => s + t.valor, 0),
    totalDebito: transacoesBancarias.filter(t => t.tipo === 'debito').reduce((s, t) => s + t.valor, 0),
  }), [transacoesBancarias])

  const conciliar = (id: string) => {
    updateTransacao(id, { conciliado: true, statusConciliacao: 'conciliado' })
  }

  const desconciliar = (id: string) => {
    updateTransacao(id, { conciliado: false, statusConciliacao: 'pendente' })
  }

  const save = () => {
    if (!form.descricao || !form.valor) return
    addTransacao(form)
    setModalOpen(false)
    setForm(emptyForm())
  }

  const f = (k: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle size={18} className="text-emerald-600" /></div>
            <div>
              <div className="text-xl font-bold text-emerald-600">{stats.conciliadas}</div>
              <div className="text-xs text-slate-400">Conciliadas</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg"><AlertCircle size={18} className="text-amber-600" /></div>
            <div>
              <div className="text-xl font-bold text-amber-600">{stats.pendentes}</div>
              <div className="text-xs text-slate-400">Pendentes</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xl font-bold text-emerald-600">{formatCurrency(stats.totalCredito)}</div>
          <div className="text-xs text-slate-400 mt-0.5">Total CrÃ©ditos</div>
        </Card>
        <Card className="p-4">
          <div className="text-xl font-bold text-red-600">{formatCurrency(stats.totalDebito)}</div>
          <div className="text-xs text-slate-400 mt-0.5">Total DÃ©bitos</div>
        </Card>
      </div>

      {/* Progresso de ConciliaÃ§Ã£o */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <GitMerge size={18} className="text-indigo-500" />
          <h3 className="font-semibold text-slate-700">Progresso da ConciliaÃ§Ã£o</h3>
          <span className="ml-auto text-sm font-bold text-indigo-600">
            {transacoesBancarias.length > 0
              ? `${((stats.conciliadas / transacoesBancarias.length) * 100).toFixed(0)}%`
              : '0%'}
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: transacoesBancarias.length > 0 ? `${(stats.conciliadas / transacoesBancarias.length) * 100}%` : '0%' }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>{stats.conciliadas} conciliadas</span>
          <span>{stats.pendentes} pendentes</span>
        </div>
      </Card>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={16} className="text-slate-400" />
          <select value={filtroBanco} onChange={e => setFiltroBanco(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 outline-none">
            <option value="todos">Todos os bancos</option>
            {bancos.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 outline-none">
            <option value="todos">Todos os status</option>
            <option value="conciliado">Conciliado</option>
            <option value="pendente">Pendente</option>
            <option value="divergente">Divergente</option>
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 outline-none">
            <option value="todos">CrÃ©dito + DÃ©bito</option>
            <option value="credito">CrÃ©dito</option>
            <option value="debito">DÃ©bito</option>
          </select>
          <Button onClick={() => setModalOpen(true)} className="ml-auto"><Plus size={16} /> Nova TransaÃ§Ã£o</Button>
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">DescriÃ§Ã£o</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Banco</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Tipo</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhuma transaÃ§Ã£o encontrada</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className={`hover:bg-slate-50 ${t.conciliado ? '' : 'bg-amber-50/20'}`}>
                  <td className="px-5 py-3 text-sm text-slate-600">{formatDate(t.data)}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-700">{t.descricao}</div>
                    {t.categoria && <div className="text-xs text-slate-400">{t.categoria}</div>}
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell text-sm text-slate-500">{t.banco}</td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <Badge className={t.tipo === 'credito' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {t.tipo === 'credito' ? 'CrÃ©dito' : 'DÃ©bito'}
                    </Badge>
                  </td>
                  <td className={`px-3 py-3 text-right font-semibold ${t.tipo === 'credito' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.tipo === 'credito' ? '+' : '-'}{formatCurrency(t.valor)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {t.conciliado
                      ? <Badge className="bg-emerald-100 text-emerald-700">Conciliado</Badge>
                      : t.statusConciliacao === 'divergente'
                        ? <Badge className="bg-red-100 text-red-700">Divergente</Badge>
                        : <Badge className="bg-amber-100 text-amber-700">Pendente</Badge>
                    }
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {!t.conciliado ? (
                        <button onClick={() => conciliar(t.id)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Conciliar">
                          <CheckCircle size={15} />
                        </button>
                      ) : (
                        <button onClick={() => desconciliar(t.id)} className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="Desfazer conciliaÃ§Ã£o">
                          <XCircle size={15} />
                        </button>
                      )}
                      <button onClick={() => deleteTransacao(t.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                        <XCircle size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Nova TransaÃ§Ã£o */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova TransaÃ§Ã£o BancÃ¡ria" size="md">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">DescriÃ§Ã£o *</label>
            <input value={form.descricao} onChange={e => f('descricao', e.target.value)} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
            <input type="date" value={form.data} onChange={e => f('data', e.target.value)} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Valor</label>
            <input type="number" value={form.valor || ''} onChange={e => f('valor', parseFloat(e.target.value))} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
            <select value={form.tipo} onChange={e => f('tipo', e.target.value)} className="fi">
              <option value="debito">DÃ©bito</option>
              <option value="credito">CrÃ©dito</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Banco</label>
            <input value={form.banco} onChange={e => f('banco', e.target.value)} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
            <input value={form.categoria} onChange={e => f('categoria', e.target.value)} className="fi" />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
          <Button onClick={save} className="flex-1">Adicionar</Button>
        </div>
      </Modal>
    </div>
  )
}

