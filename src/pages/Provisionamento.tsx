import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, BarChart3, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency, meses, fonteColor } from '../utils/formatters'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import type { Provisionamento, FonteRenda } from '../types'

const hoje = new Date()
const anoAtual = hoje.getFullYear()
const mesAtual = hoje.getMonth() + 1

const emptyForm = (): Omit<Provisionamento, 'id'> => ({
  descricao: '', tipo: 'faturamento', fonte: 'empresa', valor: 0,
  mes: mesAtual, ano: anoAtual, realizado: 0, status: 'previsto', categoria: ''
})

export function Provisionamento() {
  const { provisionamentos, addProvisionamento, updateProvisionamento, deleteProvisionamento } = useFinanceStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [filtroMes, setFiltroMes] = useState(mesAtual)
  const [filtroAno, setFiltroAno] = useState(anoAtual)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroFonte, setFiltroFonte] = useState<string>('todos')

  const filtered = useMemo(() =>
    provisionamentos.filter(p =>
      p.mes === filtroMes && p.ano === filtroAno &&
      (filtroTipo === 'todos' || p.tipo === filtroTipo) &&
      (filtroFonte === 'todos' || p.fonte === filtroFonte)
    )
  , [provisionamentos, filtroMes, filtroAno, filtroTipo, filtroFonte])

  const totais = useMemo(() => ({
    previsto: filtered.reduce((s, p) => s + p.valor, 0),
    realizado: filtered.reduce((s, p) => s + p.realizado, 0),
    faturamentoPrevisto: filtered.filter(p => p.tipo === 'faturamento').reduce((s, p) => s + p.valor, 0),
    faturamentoRealizado: filtered.filter(p => p.tipo === 'faturamento').reduce((s, p) => s + p.realizado, 0),
    despesaPrevista: filtered.filter(p => p.tipo === 'despesa').reduce((s, p) => s + p.valor, 0),
    despesaRealizada: filtered.filter(p => p.tipo === 'despesa').reduce((s, p) => s + p.realizado, 0),
  }), [filtered])

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = ((mesAtual - 4 + i - 1 + 12) % 12) + 1
      const a = anoAtual + Math.floor((mesAtual - 4 + i - 1) / 12)
      const itens = provisionamentos.filter(p => p.mes === m && p.ano === a)
      return {
        mes: meses[m - 1],
        previsto: itens.filter(p => p.tipo === 'faturamento').reduce((s, p) => s + p.valor, 0),
        realizado: itens.filter(p => p.tipo === 'faturamento').reduce((s, p) => s + p.realizado, 0),
        despesa: itens.filter(p => p.tipo === 'despesa').reduce((s, p) => s + p.valor, 0),
      }
    })
  }, [provisionamentos])

  const openNew = () => { setForm(emptyForm()); setEditId(null); setModalOpen(true) }
  const openEdit = (p: Provisionamento) => { setForm({ ...p }); setEditId(p.id); setModalOpen(true) }

  const save = () => {
    if (!form.descricao || !form.valor) return
    if (editId) updateProvisionamento(editId, form)
    else addProvisionamento(form)
    setModalOpen(false)
  }

  const f = (k: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  const variacao = totais.realizado - totais.previsto
  const pctRealizacao = totais.previsto > 0 ? (totais.realizado / totais.previsto) * 100 : 0

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-slate-500" />
            <span className="text-xs text-slate-400">Previsto Total</span>
          </div>
          <div className="text-xl font-bold text-slate-700">{formatCurrency(totais.previsto)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-500" />
            <span className="text-xs text-slate-400">Realizado Total</span>
          </div>
          <div className="text-xl font-bold text-emerald-600">{formatCurrency(totais.realizado)}</div>
          <div className="text-xs text-slate-400 mt-1">{pctRealizacao.toFixed(0)}% do previsto</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {variacao >= 0 ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-red-500" />}
            <span className="text-xs text-slate-400">Variação</span>
          </div>
          <div className={`text-xl font-bold ${variacao >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {variacao >= 0 ? '+' : ''}{formatCurrency(variacao)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-amber-500" />
            <span className="text-xs text-slate-400">Pendentes</span>
          </div>
          <div className="text-xl font-bold text-amber-600">
            {filtered.filter(p => p.status === 'previsto').length}
          </div>
          <div className="text-xs text-slate-400 mt-1">itens não realizados</div>
        </Card>
      </div>

      {/* Gráfico */}
      <Card title="Faturamento Previsto vs Realizado - 6 Meses">
        <div className="p-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Legend />
              <Bar dataKey="previsto" name="Previsto" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="realizado" name="Realizado" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="despesa" name="Despesa" fill="#f43f5e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select value={filtroMes} onChange={e => setFiltroMes(parseInt(e.target.value))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 outline-none">
            {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={filtroAno} onChange={e => setFiltroAno(parseInt(e.target.value))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 outline-none">
            {[anoAtual - 1, anoAtual, anoAtual + 1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 outline-none">
            <option value="todos">Todos</option>
            <option value="faturamento">Faturamento</option>
            <option value="despesa">Despesa</option>
          </select>
          <select value={filtroFonte} onChange={e => setFiltroFonte(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 outline-none">
            <option value="todos">Empresa + Pessoal</option>
            <option value="empresa">Empresa</option>
            <option value="pessoal">Pessoal</option>
          </select>
          <Button size="sm" onClick={openNew} className="ml-auto"><Plus size={14} /> Novo Provisionamento</Button>
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Tipo</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Fonte</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Previsto</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Realizado</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhum provisionamento para este período</td></tr>
              )}
              {filtered.map(p => {
                const pct = p.valor > 0 ? (p.realizado / p.valor) * 100 : 0
                const statusColor = p.status === 'realizado' ? 'bg-emerald-100 text-emerald-700' : p.status === 'parcial' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                const statusLabel = p.status === 'realizado' ? 'Realizado' : p.status === 'parcial' ? 'Parcial' : 'Previsto'
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-700">{p.descricao}</div>
                      <div className="text-xs text-slate-400">{p.categoria}</div>
                      <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full w-32 overflow-hidden">
                        <div className={`h-full rounded-full ${p.tipo === 'faturamento' ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <Badge className={p.tipo === 'faturamento' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'}>
                        {p.tipo === 'faturamento' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <Badge className={fonteColor[p.fonte]}>{p.fonte}</Badge>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-700">{formatCurrency(p.valor)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-600">{formatCurrency(p.realizado)}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge className={statusColor}>{statusLabel}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500"><Pencil size={14} /></button>
                        <button onClick={() => deleteProvisionamento(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Provisionamento' : 'Novo Provisionamento'} size="md">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Descrição *</label>
            <input value={form.descricao} onChange={e => f('descricao', e.target.value)} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tipo</label>
            <select value={form.tipo} onChange={e => f('tipo', e.target.value)} className="fi">
              <option value="faturamento">Faturamento/Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Fonte</label>
            <select value={form.fonte} onChange={e => f('fonte', e.target.value as FonteRenda)} className="fi">
              <option value="empresa">Empresa</option>
              <option value="pessoal">Pessoal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Valor Previsto *</label>
            <input type="number" value={form.valor || ''} onChange={e => f('valor', parseFloat(e.target.value))} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Valor Realizado</label>
            <input type="number" value={form.realizado || ''} onChange={e => f('realizado', parseFloat(e.target.value))} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Mês</label>
            <select value={form.mes} onChange={e => f('mes', parseInt(e.target.value))} className="fi">
              {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Ano</label>
            <input type="number" value={form.ano} onChange={e => f('ano', parseInt(e.target.value))} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Categoria</label>
            <input value={form.categoria} onChange={e => f('categoria', e.target.value)} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Status</label>
            <select value={form.status} onChange={e => f('status', e.target.value)} className="fi">
              <option value="previsto">Previsto</option>
              <option value="parcial">Parcial</option>
              <option value="realizado">Realizado</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
          <Button onClick={save} className="flex-1">{editId ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </Modal>
    </div>
  )
}



