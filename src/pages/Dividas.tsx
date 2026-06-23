import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, TrendingDown, DollarSign, Calendar, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency, formatDate, toDateInput, fonteColor, mesesLongos } from '../utils/formatters'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { PessoaCombobox } from '../components/ui/PessoaCombobox'
import type { Divida, FonteRenda, TipoPessoa } from '../types'

// PMT formula: monthly payment for a loan
// PV = present value, r = monthly rate (decimal), n = number of payments
function calcPMT(PV: number, r: number, n: number): number {
  if (r === 0) return PV / n
  return (PV * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

// Calculate number of payments from PMT
function calcN(PV: number, r: number, pmt: number): number {
  if (r === 0) return Math.ceil(PV / pmt)
  if (pmt <= PV * r) return Infinity // payment doesn't cover interest
  return Math.ceil(Math.log(pmt / (pmt - PV * r)) / Math.log(1 + r))
}

const emptyDivida = (): Omit<Divida, 'id'> => ({
  descricao: '',
  credor: '',
  pessoaId: '',
  valorOriginal: 0,
  valorAtual: 0,
  taxaJuros: 0,
  dataInicio: toDateInput(),
  dataVencimento: toDateInput(),
  status: 'ativa',
  fonte: 'pessoal',
  parcelas: 12,
  parcelaAtual: 1,
  valorParcela: 0,
  historicoPagamentos: [],
  observacoes: '',
})

// Suppress unused import warning — TipoPessoa is used as a type value below
const _tipoFiltro: TipoPessoa[] = ['fornecedor', 'ambos']

export function Dividas() {
  const {
    dividas, addDivida, updateDivida, deleteDivida,
    addPagamentoDivida, addContaPagar, pessoas,
  } = useFinanceStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyDivida)
  const [gerarContasPagar, setGerarContasPagar] = useState(true)
  const [pagamentoModal, setPagamentoModal] = useState<Divida | null>(null)
  const [valorPagamento, setValorPagamento] = useState('')
  const [detalhesId, setDetalhesId] = useState<string | null>(null)

  // Smart calculator mode: 'parcelas' = user enters N parcelas, 'valor' = user enters monthly value
  const [calcMode, setCalcMode] = useState<'parcelas' | 'valor'>('parcelas')
  // Raw inputs for the smart calculator
  const [inputParcelas, setInputParcelas] = useState('')
  const [inputValorMensal, setInputValorMensal] = useState('')

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalDividas = useMemo(
    () => dividas.filter(d => d.status === 'ativa').reduce((s, d) => s + d.valorAtual, 0),
    [dividas],
  )
  const parcelasMes = useMemo(
    () => dividas.filter(d => d.status === 'ativa').reduce((s, d) => s + d.valorParcela, 0),
    [dividas],
  )
  const mediaPctQuitado = useMemo(() => {
    const ativas = dividas.filter(d => d.status === 'ativa' && d.valorOriginal > 0)
    if (ativas.length === 0) return 0
    const soma = ativas.reduce((s, d) => s + ((d.valorOriginal - d.valorAtual) / d.valorOriginal) * 100, 0)
    return soma / ativas.length
  }, [dividas])
  const quitadas = useMemo(() => dividas.filter(d => d.status === 'quitada').length, [dividas])

  // ── Parcelas preview (for Contas a Pagar generation) ──────────────────────
  const parcelasPreview = useMemo(() => {
    if (!form.descricao || !form.valorParcela || form.valorParcela <= 0 || !form.dataInicio || form.parcelas <= 0) return []
    const restantes = form.parcelas - (form.parcelaAtual - 1)
    const start = new Date(form.dataInicio + 'T00:00:00')
    return Array.from({ length: restantes }, (_, i) => {
      const paIdx = form.parcelaAtual + i
      const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate())
      return {
        descricao: `Parcela ${String(paIdx).padStart(2, '0')}/${String(form.parcelas).padStart(2, '0')} ${form.descricao}`,
        vencimento: d.toISOString().split('T')[0],
        mes: d.getMonth() + 1,
        ano: d.getFullYear(),
        valor: form.valorParcela,
      }
    })
  }, [form.descricao, form.valorParcela, form.dataInicio, form.parcelas, form.parcelaAtual])

  // ── Projection chart ──────────────────────────────────────────────────────
  const projecaoMeses = useMemo(() => {
    const hoje = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
      const mesNome = mes.toLocaleString('pt-BR', { month: 'short' })
      const parcelas = dividas
        .filter(d => d.status === 'ativa')
        .filter(d => mes <= new Date(d.dataVencimento))
        .reduce((s, d) => s + d.valorParcela, 0)
      return { mes: mesNome, parcelas }
    })
  }, [dividas])

  // ── Smart calculator derived values ────────────────────────────────────────
  const smartCalc = useMemo(() => {
    const PV = form.valorOriginal || 0
    const r = (form.taxaJuros || 0) / 100
    if (PV <= 0) return null

    if (calcMode === 'parcelas') {
      const n = parseInt(inputParcelas) || 0
      if (n <= 0) return null
      const pmt = calcPMT(PV, r, n)
      return { parcelas: n, valorParcela: pmt, label: `Parcela calculada: ${formatCurrency(pmt)}/mês` }
    } else {
      const pmt = parseFloat(inputValorMensal.replace(',', '.')) || 0
      if (pmt <= 0) return null
      const n = calcN(PV, r, pmt)
      if (!isFinite(n)) return { parcelas: 0, valorParcela: pmt, label: 'Pagamento insuficiente para cobrir juros' }
      return { parcelas: n, valorParcela: pmt, label: `Duração: ${n} meses` }
    }
  }, [calcMode, inputParcelas, inputValorMensal, form.valorOriginal, form.taxaJuros])

  // ── Vencimento final auto-calculated from dataInicio + parcelas ────────────
  const dataVencimentoCalc = useMemo(() => {
    if (!form.dataInicio || !form.parcelas) return form.dataVencimento
    const start = new Date(form.dataInicio + 'T00:00:00')
    const end = new Date(start.getFullYear(), start.getMonth() + form.parcelas - 1, start.getDate())
    return end.toISOString().split('T')[0]
  }, [form.dataInicio, form.parcelas, form.dataVencimento])

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openNew = () => {
    setForm(emptyDivida())
    setEditId(null)
    setGerarContasPagar(true)
    setCalcMode('parcelas')
    setInputParcelas('')
    setInputValorMensal('')
    setModalOpen(true)
  }

  const openEdit = (d: Divida) => {
    setForm({ ...d })
    setEditId(d.id)
    setCalcMode('parcelas')
    setInputParcelas(String(d.parcelas))
    setInputValorMensal(String(d.valorParcela))
    setModalOpen(true)
  }

  const f = (k: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  // Apply smart-calc result into form before saving
  const applySmartCalc = () => {
    if (!smartCalc) return
    const dvenc = (() => {
      if (!form.dataInicio || !smartCalc.parcelas) return form.dataVencimento
      const start = new Date(form.dataInicio + 'T00:00:00')
      const end = new Date(start.getFullYear(), start.getMonth() + smartCalc.parcelas - 1, start.getDate())
      return end.toISOString().split('T')[0]
    })()
    setForm(prev => ({
      ...prev,
      parcelas: smartCalc.parcelas,
      valorParcela: Math.round(smartCalc.valorParcela * 100) / 100,
      dataVencimento: dvenc,
    }))
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = () => {
    if (!form.descricao || !form.valorOriginal) return
    if (!form.parcelas || !form.valorParcela) return

    // Auto-apply smart calc if user hasn't manually applied it yet
    const parcelas = form.parcelas
    const valorParcela = form.valorParcela
    const dvenc = dataVencimentoCalc

    const d = {
      ...form,
      parcelas,
      valorParcela,
      dataVencimento: dvenc,
      valorAtual: editId ? form.valorAtual : form.valorOriginal,
    }

    if (editId) {
      updateDivida(editId, d)
    } else {
      addDivida(d)
      if (gerarContasPagar && parcelasPreview.length > 0) {
        parcelasPreview.forEach(p => {
          addContaPagar({
            descricao: p.descricao,
            valor: p.valor,
            vencimento: p.vencimento,
            status: 'pendente',
            grupo: 'divida',
            fonte: form.fonte,
            categoria: 'Dívida',
            prioridade: 'alta',
            origem: 'divida',
            mesReferencia: p.mes,
            anoReferencia: p.ano,
            pessoaId: form.pessoaId || undefined,
          })
        })
      }
    }
    setModalOpen(false)
  }

  // ── Pagar parcela ─────────────────────────────────────────────────────────
  const pagarParcela = () => {
    if (!pagamentoModal) return
    const valor = parseFloat(valorPagamento.replace(',', '.')) || pagamentoModal.valorParcela
    addPagamentoDivida(pagamentoModal.id, { data: toDateInput(), valor, observacoes: 'Pagamento parcela' })
    if (pagamentoModal.valorAtual - valor <= 0) {
      updateDivida(pagamentoModal.id, { status: 'quitada', valorAtual: 0 })
    }
    setPagamentoModal(null)
    setValorPagamento('')
  }

  // ── Status badge helper ────────────────────────────────────────────────────
  const statusBadge = (status: Divida['status']) => {
    if (status === 'quitada') return 'bg-emerald-100 text-emerald-700'
    if (status === 'ativa') return 'bg-red-100 text-red-700'
    return 'bg-purple-100 text-purple-700'
  }
  const statusLabel = (status: Divida['status']) =>
    status === 'ativa' ? 'Ativa' : status === 'quitada' ? 'Quitada' : 'Renegociada'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown size={18} className="text-red-600" />
            </div>
            <div className="text-xs text-slate-400">Total em Dívidas</div>
          </div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDividas)}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 rounded-lg">
              <DollarSign size={18} className="text-orange-600" />
            </div>
            <div className="text-xs text-slate-400">Parcelas/Mês</div>
          </div>
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(parcelasMes)}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingDown size={18} className="text-blue-600" />
            </div>
            <div className="text-xs text-slate-400">% Médio Quitado</div>
          </div>
          <div className="text-2xl font-bold text-blue-600">{mediaPctQuitado.toFixed(1)}%</div>
          {dividas.filter(d => d.status === 'ativa').length > 0 && (
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${mediaPctQuitado}%` }} />
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle size={18} className="text-emerald-600" />
            </div>
            <div className="text-xs text-slate-400">Dívidas Quitadas</div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{quitadas}</div>
        </Card>
      </div>

      {/* Projection chart */}
      <Card title="Projeção de Parcelas — 12 Meses">
        <div className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={projecaoMeses} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$${((v as number) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Bar dataKey="parcelas" name="Parcelas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Debt cards */}
      <Card
        title={`Dívidas (${dividas.length})`}
        action={<Button size="sm" onClick={openNew}><Plus size={14} /> Nova Dívida</Button>}
      >
        <div className="divide-y divide-slate-50">
          {dividas.length === 0 && (
            <p className="text-center text-slate-400 py-12">Nenhuma dívida cadastrada</p>
          )}

          {dividas.map(d => {
            const pago = d.valorOriginal - d.valorAtual
            const pct = d.valorOriginal > 0 ? Math.min(100, (pago / d.valorOriginal) * 100) : 0
            const parcelasRestantes = Math.max(0, d.parcelas - d.parcelaAtual)

            // Creditor label — prefer person name if pessoaId is set
            const pessoa = d.pessoaId ? pessoas.find(p => p.id === d.pessoaId) : null
            const credorLabel = pessoa ? pessoa.nome : d.credor

            // Last payment date estimate
            const start = new Date(d.dataInicio + 'T00:00:00')
            const fimMes = new Date(start.getFullYear(), start.getMonth() + d.parcelas - 1, 1)
            const fimLabel = `${mesesLongos[fimMes.getMonth()]}/${fimMes.getFullYear()}`

            return (
              <div key={d.id} className={`p-5 ${d.status === 'quitada' ? 'opacity-60' : ''}`}>
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 bg-red-50 rounded-xl flex-shrink-0">
                    <TrendingDown size={20} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{d.descricao}</span>
                      <Badge className={statusBadge(d.status)}>{statusLabel(d.status)}</Badge>
                      <Badge className={fonteColor[d.fonte]}>{d.fonte}</Badge>
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">{credorLabel}</div>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <div className="text-xl font-bold text-red-600">{formatCurrency(d.valorAtual)}</div>
                    <div className="text-xs text-slate-400">de {formatCurrency(d.valorOriginal)}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{pct.toFixed(1)}% quitado</span>
                    <span>{parcelasRestantes} parcelas restantes</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Pago: <strong className="text-emerald-600">{formatCurrency(pago)}</strong></span>
                    <span>Restante: <strong className="text-red-600">{formatCurrency(d.valorAtual)}</strong></span>
                    <span>Total: <strong>{formatCurrency(d.valorOriginal)}</strong></span>
                  </div>
                </div>

                {/* Footer info */}
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <DollarSign size={11} />
                    <strong>{formatCurrency(d.valorParcela)}/mês</strong>
                  </span>
                  <span>·</span>
                  <span>{parcelasRestantes} parcelas restantes</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> até {fimLabel}
                  </span>
                  {d.taxaJuros > 0 && (
                    <>
                      <span>·</span>
                      <span>{d.taxaJuros}% a.m.</span>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {d.status === 'ativa' && (
                    <Button
                      size="sm"
                      onClick={() => { setPagamentoModal(d); setValorPagamento(String(d.valorParcela)) }}
                    >
                      <DollarSign size={13} /> Pagar Parcela
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDetalhesId(detalhesId === d.id ? null : d.id)}
                    className="flex items-center gap-1"
                  >
                    Histórico ({d.historicoPagamentos.length})
                    {detalhesId === d.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(d)}>
                    <Pencil size={13} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteDivida(d.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>

                {/* Collapsible payment history */}
                {detalhesId === d.id && (
                  <div className="mt-4 bg-slate-50 rounded-xl p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                      Histórico de Pagamentos
                    </div>
                    {d.historicoPagamentos.length === 0 ? (
                      <p className="text-xs text-slate-400">Nenhum pagamento registrado</p>
                    ) : (
                      <div className="space-y-1.5">
                        {d.historicoPagamentos.map(p => (
                          <div key={p.id} className="flex justify-between text-sm">
                            <span className="text-slate-600">{formatDate(p.data)}</span>
                            <span className="font-medium text-emerald-600">{formatCurrency(p.valor)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Modal Nova / Editar Dívida ─────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Editar Dívida' : 'Nova Dívida'}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">

          {/* A quem? (PessoaCombobox) */}
          <div className="col-span-2">
            <PessoaCombobox
              pessoas={pessoas}
              value={form.pessoaId ?? ''}
              onChange={(id) => {
                const p = pessoas.find(x => x.id === id)
                setForm(prev => ({
                  ...prev,
                  pessoaId: id,
                  credor: p ? p.nome : prev.credor,
                }))
              }}
              label="A quem?"
              placeholder="Selecione um fornecedor (opcional)"
              tipoFiltro={_tipoFiltro}
            />
          </div>

          {/* Descrição */}
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Descrição *
            </label>
            <input
              value={form.descricao}
              onChange={e => f('descricao', e.target.value)}
              className="fi"
              placeholder="Ex: Empréstimo banco, Cartão, Financiamento..."
            />
          </div>

          {/* Credor (manual fallback) */}
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Credor (nome)
            </label>
            <input
              value={form.credor}
              onChange={e => f('credor', e.target.value)}
              className="fi"
              placeholder="Nome do credor"
            />
          </div>

          {/* Valor Total */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Valor Total *
            </label>
            <input
              type="number"
              value={form.valorOriginal || ''}
              onChange={e => f('valorOriginal', parseFloat(e.target.value) || 0)}
              className="fi"
              placeholder="0,00"
            />
          </div>

          {/* Taxa de Juros */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Taxa de Juros (% a.m.)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.taxaJuros || ''}
              onChange={e => f('taxaJuros', parseFloat(e.target.value) || 0)}
              className="fi"
              placeholder="0"
            />
          </div>

          {/* Smart calculator */}
          <div className="col-span-2">
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Calculadora de Parcelas
                </span>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setCalcMode('parcelas')}
                    className={`px-3 py-1.5 font-medium transition-colors ${calcMode === 'parcelas' ? 'bg-red-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  >
                    Por parcelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcMode('valor')}
                    className={`px-3 py-1.5 font-medium transition-colors ${calcMode === 'valor' ? 'bg-red-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  >
                    Por valor mensal
                  </button>
                </div>
              </div>

              {calcMode === 'parcelas' ? (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Número de parcelas</label>
                  <input
                    type="number"
                    value={inputParcelas}
                    onChange={e => setInputParcelas(e.target.value)}
                    className="fi"
                    placeholder="Ex: 24"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Valor mensal que posso pagar (R$)</label>
                  <input
                    type="number"
                    value={inputValorMensal}
                    onChange={e => setInputValorMensal(e.target.value)}
                    className="fi"
                    placeholder="Ex: 350,00"
                  />
                </div>
              )}

              {smartCalc && (
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-red-100">
                  <span className="text-sm font-medium text-slate-700">{smartCalc.label}</span>
                  <Button size="sm" onClick={applySmartCalc} className="text-xs">
                    Aplicar
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Parcelas e valor (shows result after applying) */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Total de Parcelas
            </label>
            <input
              type="number"
              value={form.parcelas || ''}
              onChange={e => f('parcelas', parseInt(e.target.value) || 0)}
              className="fi"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Valor da Parcela (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.valorParcela || ''}
              onChange={e => f('valorParcela', parseFloat(e.target.value) || 0)}
              className="fi"
            />
          </div>

          {/* Parcela Atual */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Parcela Atual
            </label>
            <input
              type="number"
              value={form.parcelaAtual || ''}
              onChange={e => f('parcelaAtual', parseInt(e.target.value) || 1)}
              className="fi"
            />
          </div>

          {/* Data 1ª parcela */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Data da 1ª Parcela
            </label>
            <input
              type="date"
              value={form.dataInicio}
              onChange={e => f('dataInicio', e.target.value)}
              className="fi"
            />
          </div>

          {/* Origem */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Origem (opcional)
            </label>
            <input
              value={form.observacoes ?? ''}
              onChange={e => f('observacoes', e.target.value)}
              className="fi"
              placeholder={form.credor || 'Ex: Banco X, Loja Y...'}
            />
          </div>

          {/* Fonte */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Fonte
            </label>
            <select value={form.fonte} onChange={e => f('fonte', e.target.value as FonteRenda)} className="fi">
              <option value="pessoal">Pessoal</option>
              <option value="empresa">Empresa</option>
            </select>
          </div>

          {/* Status (edit only) */}
          {editId && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Status
              </label>
              <select value={form.status} onChange={e => f('status', e.target.value)} className="fi">
                <option value="ativa">Ativa</option>
                <option value="quitada">Quitada</option>
                <option value="renegociada">Renegociada</option>
              </select>
            </div>
          )}

          {/* Toggle: gerar contas a pagar */}
          {!editId && (
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gerarContasPagar}
                  onChange={e => setGerarContasPagar(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-slate-600">
                  Gerar <strong>Contas a Pagar</strong> automaticamente
                </span>
              </label>
            </div>
          )}

          {/* Preview parcelas */}
          {!editId && gerarContasPagar && parcelasPreview.length > 0 && (
            <div className="col-span-2">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                  <CheckCircle size={12} /> {parcelasPreview.length} parcelas serão lançadas em Contas a Pagar:
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {parcelasPreview.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-red-100">
                      <span className="font-medium text-slate-700">{p.descricao}</span>
                      <span className="text-slate-500">{mesesLongos[p.mes - 1]}/{p.ano} · {formatCurrency(p.valor)}</span>
                    </div>
                  ))}
                  {parcelasPreview.length > 5 && (
                    <div className="text-xs text-red-500 text-center py-1">+ {parcelasPreview.length - 5} mais...</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={save} className="flex-1">
            {editId
              ? 'Salvar'
              : gerarContasPagar && parcelasPreview.length > 0
                ? `Adicionar + ${parcelasPreview.length} Parcelas`
                : 'Adicionar Dívida'}
          </Button>
        </div>
      </Modal>

      {/* ── Modal Pagar Parcela ───────────────────────────────────────────── */}
      <Modal open={!!pagamentoModal} onClose={() => setPagamentoModal(null)} title="Pagar Parcela" size="sm">
        {pagamentoModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-50 rounded-lg">
                  <TrendingDown size={16} className="text-red-600" />
                </div>
                <span className="font-medium text-slate-700">{pagamentoModal.descricao}</span>
              </div>
              <div className="text-sm text-slate-500">
                Credor: <strong>{pagamentoModal.credor}</strong>
              </div>
              <div className="text-sm text-slate-500">
                Parcela {pagamentoModal.parcelaAtual}/{pagamentoModal.parcelas}
              </div>
              <div className="text-sm text-slate-500">
                Saldo devedor: <strong className="text-red-600">{formatCurrency(pagamentoModal.valorAtual)}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Valor do Pagamento
              </label>
              <input
                value={valorPagamento}
                onChange={e => setValorPagamento(e.target.value)}
                className="fi"
                placeholder={formatCurrency(pagamentoModal.valorParcela)}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setPagamentoModal(null)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={pagarParcela} className="flex-1">
                <DollarSign size={15} /> Pagar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
