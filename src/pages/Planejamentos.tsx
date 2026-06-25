import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Target, Calendar, TrendingUp, PiggyBank, CheckCircle, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency, formatDate, toDateInput, mesesLongos } from '../utils/formatters'
import { calcTotalMeses } from '../utils/helpers'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import type { Planejamento, TipoPlano, FonteRenda, GrupoGasto } from '../types'

const tipoPlanoToGrupo: Record<TipoPlano, GrupoGasto> = {
  reserva_emergencia: 'reserva_emergencia',
  compra_carro: 'carro',
  viagem: 'viagens',
  aposentadoria: 'aposentadoria',
  outros: 'outros',
}

const tipoOpcoes: { value: TipoPlano; label: string; icone: string }[] = [
  { value: 'reserva_emergencia', label: 'Reserva de Emergência', icone: '🛡️' },
  { value: 'compra_carro', label: 'Compra de Carro', icone: '🚗' },
  { value: 'viagem', label: 'Viagem', icone: '✈️' },
  { value: 'aposentadoria', label: 'Aposentadoria', icone: '🏖️' },
  { value: 'outros', label: 'Outros', icone: '🎯' },
]

const cores = ['#10b981', '#6366f1', '#f97316', '#ec4899', '#0ea5e9', '#84cc16', '#f59e0b', '#8b5cf6']

const emptyForm = (): Omit<Planejamento, 'id'> => ({
  nome: '', tipo: 'outros', descricao: '', valorMeta: 0, valorAtual: 0,
  dataInicio: toDateInput(), dataAlvo: toDateInput(), aporteMensal: 0,
  fonte: 'pessoal', ativo: true, historico: [], cor: '#10b981', icone: '🎯'
})

export function Planejamentos() {
  const {
    planejamentos, addPlanejamento, updatePlanejamento, deletePlanejamento,
    addAportePlanejamento, addContaPagar, deleteContasPagarByOrigemId, contasPagar
  } = useFinanceStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [numMeses, setNumMeses] = useState(12)
  const [gerarContasPagar, setGerarContasPagar] = useState(true)
  const [aporteModal, setAporteModal] = useState<Planejamento | null>(null)
  const [valorAporte, setValorAporte] = useState('')
  const [obsAporte, setObsAporte] = useState('')
  const [detalhesId, setDetalhesId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Planejamento | null>(null)

  const totalMeta = useMemo(() => planejamentos.reduce((s, p) => s + p.valorMeta, 0), [planejamentos])
  const totalAcumulado = useMemo(() => planejamentos.reduce((s, p) => s + p.valorAtual, 0), [planejamentos])
  const totalMensal = useMemo(() => planejamentos.filter(p => p.ativo).reduce((s, p) => s + p.aporteMensal, 0), [planejamentos])

  // Preview das parcelas geradas automaticamente
  const aportePreview = useMemo(() => {
    if (!form.nome || !form.aporteMensal || form.aporteMensal <= 0 || !form.dataInicio || !form.dataAlvo) return []
    const start = new Date(form.dataInicio + 'T00:00:00')
    const end = new Date(form.dataAlvo + 'T00:00:00')
    const total = calcTotalMeses(start, end)
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate())
      return {
        descricao: `Aporte ${form.nome} ${String(i + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`,
        vencimento: d.toISOString().split('T')[0],
        mes: d.getMonth() + 1,
        ano: d.getFullYear(),
        valor: form.aporteMensal,
      }
    })
  }, [form.nome, form.aporteMensal, form.dataInicio, form.dataAlvo])

  const openNew = () => { setForm(emptyForm()); setEditId(null); setNumMeses(12); setGerarContasPagar(true); setModalOpen(true) }
  const openEdit = (p: Planejamento) => {
    setForm({ ...p })
    setEditId(p.id)
    if (p.dataInicio && p.dataAlvo) {
      const s = new Date(p.dataInicio + 'T00:00:00')
      const e = new Date(p.dataAlvo + 'T00:00:00')
      setNumMeses(calcTotalMeses(s, e))
    }
    setModalOpen(true)
  }

  const save = () => {
    if (!form.nome || !form.valorMeta) return

    if (editId) {
      updatePlanejamento(editId, form)
    } else {
      const newId = addPlanejamento(form)

      if (gerarContasPagar && aportePreview.length > 0) {
        aportePreview.forEach(a => {
          addContaPagar({
            descricao: a.descricao,
            valor: a.valor,
            vencimento: a.vencimento,
            status: 'pendente',
            grupo: tipoPlanoToGrupo[form.tipo] ?? 'outros',
            fonte: form.fonte,
            categoria: 'Planejamento',
            prioridade: 'media',
            origem: 'planejamento',
            origemId: newId,
            mesReferencia: a.mes,
            anoReferencia: a.ano,
          })
        })
      }
    }
    setModalOpen(false)
  }

  const fazerAporte = () => {
    if (!aporteModal) return
    const valor = parseFloat(valorAporte.replace(',', '.'))
    if (!valor) return
    addAportePlanejamento(aporteModal.id, { data: toDateInput(), valor, observacoes: obsAporte })
    setAporteModal(null); setValorAporte(''); setObsAporte('')
  }

  const f = (k: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  // Calcula dataAlvo a partir de dataInicio + N meses
  const calcDataAlvo = (inicio: string, meses: number) => {
    const s = new Date(inicio + 'T00:00:00')
    const alvo = new Date(s.getFullYear(), s.getMonth() + meses - 1, s.getDate())
    return alvo.toISOString().split('T')[0]
  }

  // Usuário muda número de meses → recalcula aporte e dataAlvo
  const onMesesChange = (meses: number, meta?: number, atual?: number) => {
    const m = Math.max(1, Math.min(360, meses))
    setNumMeses(m)
    const falta = Math.max(0, (meta ?? form.valorMeta) - (atual ?? form.valorAtual ?? 0))
    const aporte = m > 0 && falta > 0 ? Math.ceil(falta / m) : form.aporteMensal
    const dataAlvo = form.dataInicio ? calcDataAlvo(form.dataInicio, m) : form.dataAlvo
    setForm(prev => ({ ...prev, aporteMensal: aporte, dataAlvo }))
  }

  // Usuário muda aporte manualmente → recalcula número de meses e dataAlvo
  const onAporteChange = (aporte: number) => {
    const falta = Math.max(0, form.valorMeta - (form.valorAtual ?? 0))
    const meses = aporte > 0 && falta > 0 ? Math.ceil(falta / aporte) : numMeses
    setNumMeses(meses)
    const dataAlvo = form.dataInicio ? calcDataAlvo(form.dataInicio, meses) : form.dataAlvo
    setForm(prev => ({ ...prev, aporteMensal: aporte, dataAlvo }))
  }

  // Usuário muda meta ou valor atual → mantém numMeses e recalcula aporte
  const onValorChange = (key: 'valorMeta' | 'valorAtual', val: number) => {
    const meta = key === 'valorMeta' ? val : form.valorMeta
    const atual = key === 'valorAtual' ? val : (form.valorAtual ?? 0)
    const falta = Math.max(0, meta - atual)
    const aporte = numMeses > 0 && falta > 0 ? Math.ceil(falta / numMeses) : form.aporteMensal
    setForm(prev => ({ ...prev, [key]: val, aporteMensal: aporte }))
  }

  const historicoChart = (p: Planejamento) => {
    let acumulado = 0
    return p.historico.map(h => {
      acumulado += h.valor
      return { data: formatDate(h.data), valor: acumulado }
    })
  }

  const calcMesesRestantes = (p: Planejamento) => {
    const falta = p.valorMeta - p.valorAtual
    if (p.aporteMensal <= 0 || falta <= 0) return 0
    return Math.ceil(falta / p.aporteMensal)
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg"><Target size={18} className="text-emerald-600" /></div>
            <div className="text-xs text-slate-400">Meta Total</div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-800 truncate">{formatCurrency(totalMeta)}</div>
          <div className="mt-2">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalMeta > 0 ? Math.min(100, (totalAcumulado / totalMeta) * 100) : 0}%` }} />
            </div>
            <div className="text-xs text-slate-400 mt-1">{totalMeta > 0 ? ((totalAcumulado / totalMeta) * 100).toFixed(1) : 0}% acumulado</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg"><PiggyBank size={18} className="text-indigo-600" /></div>
            <div className="text-xs text-slate-400">Total Acumulado</div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-indigo-600 truncate">{formatCurrency(totalAcumulado)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp size={18} className="text-blue-600" /></div>
            <div className="text-xs text-slate-400">Aportes Mensais</div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-blue-600 truncate">{formatCurrency(totalMensal)}</div>
          <div className="text-xs text-slate-400 mt-1">{planejamentos.filter(p => p.ativo).length} planos ativos</div>
        </Card>
      </div>

      {/* Lista */}
      <Card title={`Planejamentos (${planejamentos.length})`} action={<Button size="sm" onClick={openNew}><Plus size={14} /> Novo Plano</Button>}>
        <div className="divide-y divide-slate-50">
          {planejamentos.length === 0 && <p className="text-center text-slate-400 py-10">Nenhum planejamento cadastrado</p>}
          {planejamentos.map(p => {
            const pct = Math.min(100, (p.valorAtual / p.valorMeta) * 100)
            const mesesRestantes = calcMesesRestantes(p)
            const tipoInfo = tipoOpcoes.find(t => t.value === p.tipo)
            return (
              <div key={p.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${p.cor}20` }}>
                      {p.icone}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        {p.nome}
                        {!p.ativo && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inativo</span>}
                      </div>
                      <div className="text-xs text-slate-400">{tipoInfo?.label} · {p.fonte === 'empresa' ? 'Empresa' : 'Pessoal'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold" style={{ color: p.cor }}>{formatCurrency(p.valorAtual)}</div>
                    <div className="text-xs text-slate-400">de {formatCurrency(p.valorMeta)}</div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{pct.toFixed(1)}% concluído</span>
                    <span className="text-slate-500">
                      {mesesRestantes > 0 ? `~${mesesRestantes} meses restantes` : pct >= 100 ? '✓ Meta atingida!' : 'Sem aporte definido'}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.cor }} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><TrendingUp size={11} /> Aporte mensal: <strong>{formatCurrency(p.aporteMensal)}</strong></span>
                  <span className="flex items-center gap-1"><Calendar size={11} /> Meta: <strong>{formatDate(p.dataAlvo)}</strong></span>
                  {p.descricao && <span className="text-slate-400 italic">{p.descricao}</span>}
                </div>

                <div className="flex gap-2">
                  {p.ativo && (
                    <Button size="sm" onClick={() => setAporteModal(p)} style={{ background: p.cor }}>
                      <PiggyBank size={13} /> Fazer Aporte
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDetalhesId(detalhesId === p.id ? null : p.id)}>
                    Histórico ({p.historico.length})
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil size={13} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(p)} className="text-red-500"><Trash2 size={13} /></Button>
                </div>

                {detalhesId === p.id && p.historico.length > 0 && (
                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={historicoChart(p)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => formatCurrency(v as number)} />
                        <Line type="monotone" dataKey="valor" stroke={p.cor} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Modal Novo Planejamento */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Planejamento' : 'Novo Planejamento'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nome do Plano *</label>
            <input value={form.nome} onChange={e => f('nome', e.target.value)} className="fi" placeholder="Ex: Reserva Emergência, Viagem Europa..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tipo</label>
            <select value={form.tipo} onChange={e => {
              const tipo = e.target.value as TipoPlano
              const info = tipoOpcoes.find(t => t.value === tipo)
              f('tipo', tipo); f('icone', info?.icone ?? '🎯')
            }} className="fi">
              {tipoOpcoes.map(t => <option key={t.value} value={t.value}>{t.icone} {t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Fonte</label>
            <select value={form.fonte} onChange={e => f('fonte', e.target.value as FonteRenda)} className="fi">
              <option value="pessoal">Pessoal</option>
              <option value="empresa">Empresa</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Valor da Meta *</label>
            <input type="number" value={form.valorMeta || ''} onChange={e => onValorChange('valorMeta', parseFloat(e.target.value) || 0)} className="fi" placeholder="R$ 0,00" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Valor Atual</label>
            <input type="number" value={form.valorAtual || ''} onChange={e => onValorChange('valorAtual', parseFloat(e.target.value) || 0)} className="fi" placeholder="R$ 0,00" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Data Início</label>
            <input type="date" value={form.dataInicio} onChange={e => {
              const inicio = e.target.value
              const dataAlvo = inicio ? calcDataAlvo(inicio, numMeses) : form.dataAlvo
              setForm(prev => ({ ...prev, dataInicio: inicio, dataAlvo }))
            }} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Em quantos meses?
              {form.dataAlvo && <span className="ml-2 text-slate-400 font-normal normal-case">até {new Date(form.dataAlvo + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>}
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onMesesChange(numMeses - 1)}
                className="w-11 h-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xl font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 touch-manipulation flex-shrink-0">
                −
              </button>
              <input type="number" min="1" max="360" value={numMeses}
                onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) onMesesChange(v) }}
                className="fi text-center min-w-0" />
              <button type="button" onClick={() => onMesesChange(numMeses + 1)}
                className="w-11 h-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xl font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 touch-manipulation flex-shrink-0">
                +
              </button>
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Aporte Mensal
              {form.valorMeta > 0 && (
                <span className="ml-2 text-emerald-600 font-normal normal-case">
                  {formatCurrency(Math.max(0, form.valorMeta - (form.valorAtual || 0)))} em {numMeses} meses
                </span>
              )}
            </label>
            <input type="number" value={form.aporteMensal || ''} onChange={e => onAporteChange(parseFloat(e.target.value) || 0)} className="fi" placeholder="Calculado automaticamente" />
            <p className="text-xs text-slate-400 mt-1">Altere o valor para recalcular o número de meses automaticamente</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {cores.map(c => (
                <button key={c} onClick={() => f('cor', c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.cor === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Descrição</label>
            <textarea value={form.descricao} onChange={e => f('descricao', e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={e => f('ativo', e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-600">Plano ativo</span>
          </label>

          {/* Checkbox diluição */}
          {!editId && aportePreview.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={gerarContasPagar} onChange={e => setGerarContasPagar(e.target.checked)} className="rounded" />
              <span className="text-sm text-slate-600">Gerar aportes em <strong>Contas a Pagar</strong></span>
            </label>
          )}

          {/* Preview dos aportes */}
          {!editId && gerarContasPagar && aportePreview.length > 0 && (
            <div className="col-span-2">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-1">
                  <CheckCircle size={12} /> {aportePreview.length} aportes serão lançados em Contas a Pagar:
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {aportePreview.slice(0, 5).map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-indigo-100">
                      <span className="font-medium text-slate-700">{a.descricao}</span>
                      <span className="text-slate-500">{mesesLongos[a.mes - 1]}/{a.ano} · {formatCurrency(a.valor)}</span>
                    </div>
                  ))}
                  {aportePreview.length > 5 && (
                    <div className="text-xs text-indigo-500 text-center py-1">+ {aportePreview.length - 5} mais...</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
          <Button onClick={save} className="flex-1">
            {editId ? 'Salvar' : gerarContasPagar && aportePreview.length > 0 ? `Criar + ${aportePreview.length} Aportes` : 'Criar Plano'}
          </Button>
        </div>
      </Modal>

      {/* Modal Aporte */}
      <Modal open={!!aporteModal} onClose={() => setAporteModal(null)} title="Fazer Aporte" size="sm">
        {aporteModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="font-medium text-slate-700">{aporteModal.icone} {aporteModal.nome}</div>
              <div className="text-sm text-slate-500">Atual: {formatCurrency(aporteModal.valorAtual)} / Meta: {formatCurrency(aporteModal.valorMeta)}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Valor do Aporte *</label>
              <input value={valorAporte} onChange={e => setValorAporte(e.target.value)} placeholder={formatCurrency(aporteModal.aporteMensal)} className="fi" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Observações</label>
              <input value={obsAporte} onChange={e => setObsAporte(e.target.value)} className="fi" />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setAporteModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={fazerAporte} className="flex-1"><PiggyBank size={15} /> Aportar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Confirmação de Exclusão */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        {deleteConfirm && (() => {
          const vinculados = contasPagar.filter(c => c.origemId === deleteConfirm.id)
          return (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Tem certeza que deseja excluir este planejamento?</p>
                  <p className="text-sm text-red-600 mt-1"><strong>{deleteConfirm.icone} {deleteConfirm.nome}</strong></p>
                </div>
              </div>
              {vinculados.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  <strong>{vinculados.length} aporte{vinculados.length > 1 ? 's' : ''}</strong> em Contas a Pagar também {vinculados.length > 1 ? 'serão excluídos' : 'será excluído'}.
                  <div className="mt-1.5 text-xs space-y-0.5 max-h-24 overflow-y-auto">
                    {vinculados.slice(0, 5).map(c => (
                      <div key={c.id} className="text-amber-600">{c.descricao} — {formatCurrency(c.valor)}</div>
                    ))}
                    {vinculados.length > 5 && <div className="text-amber-500">+ {vinculados.length - 5} mais...</div>}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancelar</Button>
                <Button variant="danger" className="flex-1" onClick={() => {
                  deleteContasPagarByOrigemId(deleteConfirm.id)
                  deletePlanejamento(deleteConfirm.id)
                  setDeleteConfirm(null)
                }}>
                  <Trash2 size={14} /> Excluir{vinculados.length > 0 ? ` + ${vinculados.length} aporte${vinculados.length > 1 ? 's' : ''}` : ''}
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}


