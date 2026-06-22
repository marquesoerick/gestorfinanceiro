import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, TrendingDown, DollarSign, Calendar, Percent, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency, formatDate, toDateInput, fonteColor, mesesLongos } from '../utils/formatters'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import type { Divida, FonteRenda } from '../types'

const emptyDivida = (): Omit<Divida, 'id'> => ({
  descricao: '', credor: '', valorOriginal: 0, valorAtual: 0, taxaJuros: 0,
  dataInicio: toDateInput(), dataVencimento: toDateInput(), status: 'ativa',
  fonte: 'pessoal', parcelas: 12, parcelaAtual: 1, valorParcela: 0,
  historicoPagamentos: [], observacoes: ''
})

export function Dividas() {
  const {
    dividas, addDivida, updateDivida, deleteDivida, addPagamentoDivida,
    addContaPagar
  } = useFinanceStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyDivida)
  const [gerarContasPagar, setGerarContasPagar] = useState(true)
  const [pagamentoModal, setPagamentoModal] = useState<Divida | null>(null)
  const [valorPagamento, setValorPagamento] = useState('')
  const [detalhesId, setDetalhesId] = useState<string | null>(null)

  const totalDividas = useMemo(() => dividas.filter(d => d.status === 'ativa').reduce((s, d) => s + d.valorAtual, 0), [dividas])
  const totalOriginal = useMemo(() => dividas.filter(d => d.status === 'ativa').reduce((s, d) => s + d.valorOriginal, 0), [dividas])
  const parcelasMes = useMemo(() => dividas.filter(d => d.status === 'ativa').reduce((s, d) => s + d.valorParcela, 0), [dividas])
  const quitadas = useMemo(() => dividas.filter(d => d.status === 'quitada').length, [dividas])

  // Preview das parcelas em Contas a Pagar ao criar nova dÃ­vida
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

  const openNew = () => { setForm(emptyDivida()); setEditId(null); setGerarContasPagar(true); setModalOpen(true) }
  const openEdit = (d: Divida) => { setForm({ ...d }); setEditId(d.id); setModalOpen(true) }

  const save = () => {
    if (!form.descricao || !form.valorOriginal) return
    const d = { ...form, valorAtual: editId ? form.valorAtual : form.valorOriginal }
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
            grupo: 'outros',
            fonte: form.fonte,
            categoria: 'DÃ­vida',
            prioridade: 'alta',
            origem: 'divida',
            mesReferencia: p.mes,
            anoReferencia: p.ano,
          })
        })
      }
    }
    setModalOpen(false)
  }

  const pagarParcela = () => {
    if (!pagamentoModal) return
    const valor = parseFloat(valorPagamento.replace(',', '.')) || pagamentoModal.valorParcela
    addPagamentoDivida(pagamentoModal.id, { data: toDateInput(), valor, observacoes: 'Pagamento parcela' })
    if (pagamentoModal.valorAtual - valor <= 0) {
      updateDivida(pagamentoModal.id, { status: 'quitada', valorAtual: 0 })
    }
    setPagamentoModal(null); setValorPagamento('')
  }

  const f = (k: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="p-2 bg-orange-50 rounded-lg w-fit mb-2"><TrendingDown size={18} className="text-orange-600" /></div>
          <div className="text-xl font-bold text-orange-600">{formatCurrency(totalDividas)}</div>
          <div className="text-xs text-slate-400 mt-0.5">Total em DÃ­vidas</div>
        </Card>
        <Card className="p-4">
          <div className="text-xl font-bold text-slate-600">{formatCurrency(totalOriginal)}</div>
          <div className="text-xs text-slate-400 mt-0.5">Valor Original Total</div>
          {totalOriginal > 0 && (
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full">
              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(100, (totalDividas / totalOriginal) * 100)}%` }} />
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-red-500" />
            <div className="text-xl font-bold text-red-600">{formatCurrency(parcelasMes)}</div>
          </div>
          <div className="text-xs text-slate-400">Parcelas/MÃªs</div>
        </Card>
        <Card className="p-4">
          <div className="text-xl font-bold text-emerald-600">{quitadas}</div>
          <div className="text-xs text-slate-400 mt-0.5">DÃ­vidas Quitadas</div>
        </Card>
      </div>

      {/* ProjeÃ§Ã£o */}
      <Card title="ProjeÃ§Ã£o de Parcelas - 12 Meses">
        <div className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={projecaoMeses} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$${((v as number) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Bar dataKey="parcelas" name="Parcelas" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Lista de DÃ­vidas */}
      <Card title="DÃ­vidas Ativas" action={<Button size="sm" onClick={openNew}><Plus size={14} /> Nova DÃ­vida</Button>}>
        <div className="divide-y divide-slate-50">
          {dividas.length === 0 && <p className="text-center text-slate-400 py-10">Nenhuma dÃ­vida cadastrada</p>}
          {dividas.map(d => {
            const pct = Math.min(100, ((d.valorOriginal - d.valorAtual) / d.valorOriginal) * 100)
            const parcelasRestantes = d.parcelas - d.parcelaAtual
            return (
              <div key={d.id} className={`p-5 ${d.status === 'quitada' ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{d.descricao}</span>
                      <Badge className={d.status === 'quitada' ? 'bg-emerald-100 text-emerald-700' : d.status === 'ativa' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}>
                        {d.status === 'ativa' ? 'Ativa' : d.status === 'quitada' ? 'Quitada' : 'Renegociada'}
                      </Badge>
                      <Badge className={fonteColor[d.fonte]}>{d.fonte}</Badge>
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">{d.credor}</div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="text-lg font-bold text-orange-600">{formatCurrency(d.valorAtual)}</div>
                    <div className="text-xs text-slate-400">de {formatCurrency(d.valorOriginal)}</div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{pct.toFixed(0)}% quitado</span>
                    <span>{parcelasRestantes} parcelas restantes</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><DollarSign size={12} /> Parcela: <strong>{formatCurrency(d.valorParcela)}/mÃªs</strong></span>
                  <span className="flex items-center gap-1"><Percent size={12} /> Juros: <strong>{d.taxaJuros}% a.m.</strong></span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> Vence: <strong>{formatDate(d.dataVencimento)}</strong></span>
                </div>

                <div className="flex gap-2 mt-3">
                  {d.status === 'ativa' && (
                    <Button size="sm" onClick={() => { setPagamentoModal(d); setValorPagamento(String(d.valorParcela)) }}>
                      <DollarSign size={13} /> Pagar Parcela
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDetalhesId(detalhesId === d.id ? null : d.id)}>
                    HistÃ³rico ({d.historicoPagamentos.length})
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil size={13} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteDivida(d.id)} className="text-red-500 hover:text-red-600"><Trash2 size={13} /></Button>
                </div>

                {detalhesId === d.id && d.historicoPagamentos.length > 0 && (
                  <div className="mt-4 bg-slate-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-500 mb-2">HISTÃ“RICO DE PAGAMENTOS</div>
                    <div className="space-y-1.5">
                      {d.historicoPagamentos.map(p => (
                        <div key={p.id} className="flex justify-between text-sm">
                          <span className="text-slate-600">{formatDate(p.data)}</span>
                          <span className="font-medium text-emerald-600">{formatCurrency(p.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Modal Nova DÃ­vida */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar DÃ­vida' : 'Nova DÃ­vida'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">DescriÃ§Ã£o *</label>
            <input value={form.descricao} onChange={e => f('descricao', e.target.value)} className="fi" placeholder="Ex: EmprÃ©stimo banco, CartÃ£o, Financiamento..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Credor</label>
            <input value={form.credor} onChange={e => f('credor', e.target.value)} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Valor Original *</label>
            <input type="number" value={form.valorOriginal || ''} onChange={e => f('valorOriginal', parseFloat(e.target.value))} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Taxa de Juros (% a.m.)</label>
            <input type="number" step="0.01" value={form.taxaJuros || ''} onChange={e => f('taxaJuros', parseFloat(e.target.value))} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Valor da Parcela
              {parcelasPreview.length > 0 && (
                <span className="ml-2 text-emerald-600 font-normal">â†’ {parcelasPreview.length} parcelas</span>
              )}
            </label>
            <input type="number" value={form.valorParcela || ''} onChange={e => f('valorParcela', parseFloat(e.target.value))} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Total de Parcelas</label>
            <input type="number" value={form.parcelas || ''} onChange={e => f('parcelas', parseInt(e.target.value))} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Parcela Atual</label>
            <input type="number" value={form.parcelaAtual || ''} onChange={e => f('parcelaAtual', parseInt(e.target.value))} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Data InÃ­cio (1Âª parcela)</label>
            <input type="date" value={form.dataInicio} onChange={e => f('dataInicio', e.target.value)} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Data Vencimento Final</label>
            <input type="date" value={form.dataVencimento} onChange={e => f('dataVencimento', e.target.value)} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Fonte</label>
            <select value={form.fonte} onChange={e => f('fonte', e.target.value as FonteRenda)} className="fi">
              <option value="pessoal">Pessoal</option>
              <option value="empresa">Empresa</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Status</label>
            <select value={form.status} onChange={e => f('status', e.target.value)} className="fi">
              <option value="ativa">Ativa</option>
              <option value="quitada">Quitada</option>
              <option value="renegociada">Renegociada</option>
            </select>
          </div>

          {/* Checkbox diluiÃ§Ã£o */}
          {!editId && parcelasPreview.length > 0 && (
            <label className="col-span-2 flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={gerarContasPagar} onChange={e => setGerarContasPagar(e.target.checked)} className="rounded" />
              <span className="text-sm text-slate-600">Gerar parcelas em <strong>Contas a Pagar</strong> ({parcelasPreview.length}x)</span>
            </label>
          )}

          {/* Preview parcelas */}
          {!editId && gerarContasPagar && parcelasPreview.length > 0 && (
            <div className="col-span-2">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-orange-700 mb-2 flex items-center gap-1">
                  <CheckCircle size={12} /> {parcelasPreview.length} parcelas serÃ£o lanÃ§adas em Contas a Pagar:
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {parcelasPreview.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-orange-100">
                      <span className="font-medium text-slate-700">{p.descricao}</span>
                      <span className="text-slate-500">{mesesLongos[p.mes - 1]}/{p.ano} Â· {formatCurrency(p.valor)}</span>
                    </div>
                  ))}
                  {parcelasPreview.length > 5 && (
                    <div className="text-xs text-orange-500 text-center py-1">+ {parcelasPreview.length - 5} mais...</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
          <Button onClick={save} className="flex-1">
            {editId ? 'Salvar' : gerarContasPagar && parcelasPreview.length > 0 ? `Adicionar + ${parcelasPreview.length} Parcelas` : 'Adicionar'}
          </Button>
        </div>
      </Modal>

      {/* Modal Pagamento Parcela */}
      <Modal open={!!pagamentoModal} onClose={() => setPagamentoModal(null)} title="Pagar Parcela" size="sm">
        {pagamentoModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              <div className="font-medium text-slate-700">{pagamentoModal.descricao}</div>
              <div className="text-sm text-slate-500">Parcela {pagamentoModal.parcelaAtual}/{pagamentoModal.parcelas}</div>
              <div className="text-sm text-slate-500">Saldo devedor: <strong className="text-orange-600">{formatCurrency(pagamentoModal.valorAtual)}</strong></div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Valor do Pagamento</label>
              <input value={valorPagamento} onChange={e => setValorPagamento(e.target.value)} className="fi" />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setPagamentoModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={pagarParcela} className="flex-1"><DollarSign size={15} /> Pagar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}


