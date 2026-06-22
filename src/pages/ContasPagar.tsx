import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, Filter, Lock, AlertTriangle, ArrowRight, LockOpen } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import {
  formatCurrency, formatDate, toDateInput, grupoLabel, statusLabel,
  statusColor, grupoColor, fonteColor, prioridadeLabel, prioridadeColor,
  prioridadeIcone, mesesLongos
} from '../utils/formatters'
import { getMesRef, getAnoRef } from '../utils/helpers'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input, Select, Textarea } from '../components/ui/Input'
import { MesNavigator } from '../components/ui/MesNavigator'
import type { ContaPagar, GrupoGasto, FonteRenda, StatusConta, Prioridade } from '../types'

const grupos: GrupoGasto[] = ['casa','carro','viagens','alimentacao','saude','educacao','lazer','outros']
const fontes: FonteRenda[] = ['pessoal','empresa']
const prioridades: Prioridade[] = ['alta','media','baixa']

const emptyForm = (): Omit<ContaPagar, 'id'> => ({
  descricao: '', valor: 0, vencimento: toDateInput(), status: 'pendente',
  grupo: 'outros', fonte: 'pessoal', categoria: '', fornecedor: '',
  parcelas: undefined, parcelaAtual: undefined, observacoes: '',
  prioridade: 'media', origem: 'manual',
  mesReferencia: undefined, anoReferencia: undefined,
})

export function ContasPagar() {
  const {
    contasPagar, addContaPagar, updateContaPagar, deleteContaPagar,
    mesAtivo, anoAtivo, mesesFechados, fecharMes, reabrirMes
  } = useFinanceStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [filtroGrupo, setFiltroGrupo] = useState('todos')
  const [filtroFonte, setFiltroFonte] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos')
  const [fecharModal, setFecharModal] = useState(false)
  const [reabrirModal, setReobrirModal] = useState(false)

  const isFechado = mesesFechados.some(m => m.mes === mesAtivo && m.ano === anoAtivo)
  const infoFechado = mesesFechados.find(m => m.mes === mesAtivo && m.ano === anoAtivo)

  const filtered = useMemo(() =>
    contasPagar
      .filter(c =>
        getMesRef(c.vencimento, c.mesReferencia) === mesAtivo &&
        getAnoRef(c.vencimento, c.anoReferencia) === anoAtivo &&
        (filtroGrupo === 'todos' || c.grupo === filtroGrupo) &&
        (filtroFonte === 'todos' || c.fonte === filtroFonte) &&
        (filtroStatus === 'todos' || c.status === filtroStatus) &&
        (filtroPrioridade === 'todos' || c.prioridade === filtroPrioridade)
      )
      .sort((a, b) => {
        const prio = { alta: 0, media: 1, baixa: 2 }
        const pa = prio[a.prioridade ?? 'media']
        const pb = prio[b.prioridade ?? 'media']
        if (pa !== pb) return pa - pb
        return a.vencimento.localeCompare(b.vencimento)
      })
  , [contasPagar, mesAtivo, anoAtivo, filtroGrupo, filtroFonte, filtroStatus, filtroPrioridade])

  const totais = useMemo(() => ({
    total: filtered.reduce((s, c) => s + c.valor, 0),
    pendente: filtered.filter(c => c.status === 'pendente').reduce((s, c) => s + c.valor, 0),
    vencido: filtered.filter(c => c.status === 'vencido').reduce((s, c) => s + c.valor, 0),
    pago: filtered.filter(c => c.status === 'pago').reduce((s, c) => s + c.valor, 0),
    pendentes_count: filtered.filter(c => c.status === 'pendente' || c.status === 'vencido').length,
  }), [filtered])

  // Preview das parcelas ao criar nova conta
  const parcelasPreview = useMemo(() => {
    if (!form.parcelas || form.parcelas <= 1 || !form.descricao || !form.vencimento) return []
    return Array.from({ length: form.parcelas }, (_, i) => {
      const date = new Date(form.vencimento + 'T00:00:00')
      date.setMonth(date.getMonth() + i)
      return {
        descricao: `${form.descricao} ${String(i + 1).padStart(2, '0')}/${String(form.parcelas).padStart(2, '0')}`,
        vencimento: date.toISOString().split('T')[0],
        mes: date.getMonth() + 1,
        ano: date.getFullYear(),
      }
    })
  }, [form.parcelas, form.descricao, form.vencimento])

  const openNew = () => {
    const d = new Date()
    const defaultVenc = `${anoAtivo}-${String(mesAtivo).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    setForm({ ...emptyForm(), vencimento: defaultVenc })
    setEditId(null)
    setModalOpen(true)
  }

  const openEdit = (c: ContaPagar) => {
    setForm({ ...c })
    setEditId(c.id)
    setModalOpen(true)
  }

  const save = () => {
    if (!form.descricao || !form.valor) return
    const baseDate = new Date(form.vencimento + 'T00:00:00')

    if (editId) {
      updateContaPagar(editId, {
        ...form,
        mesReferencia: getMesRef(form.vencimento, form.mesReferencia),
        anoReferencia: getAnoRef(form.vencimento, form.anoReferencia),
      })
    } else if (form.parcelas && form.parcelas > 1) {
      // Criar N parcelas separadas
      for (let i = 0; i < form.parcelas; i++) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate())
        addContaPagar({
          ...form,
          descricao: `${form.descricao} ${String(i + 1).padStart(2, '0')}/${String(form.parcelas).padStart(2, '0')}`,
          vencimento: d.toISOString().split('T')[0],
          parcelaAtual: i + 1,
          mesReferencia: d.getMonth() + 1,
          anoReferencia: d.getFullYear(),
          origem: 'manual',
        })
      }
    } else {
      addContaPagar({
        ...form,
        mesReferencia: baseDate.getMonth() + 1,
        anoReferencia: baseDate.getFullYear(),
        origem: 'manual',
      })
    }
    setModalOpen(false)
  }

  const marcarPago = (c: ContaPagar) => {
    updateContaPagar(c.id, { status: 'pago', dataPagamento: toDateInput(), valorPago: c.valor })
  }

  const confirmarFecharMes = () => {
    fecharMes(mesAtivo, anoAtivo)
    setFecharModal(false)
  }

  const f = (k: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-5">
      {/* Navegação Mensal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MesNavigator
          showFecharMes={!isFechado}
          onFecharMes={() => setFecharModal(true)}
        />
        <Button onClick={openNew} disabled={isFechado}>
          <Plus size={16} /> Nova Conta
        </Button>
      </div>

      {/* Banner mês fechado */}
      {isFechado && (
        <div className="flex items-center gap-3 bg-slate-800 text-white rounded-xl px-5 py-3">
          <Lock size={16} className="flex-shrink-0" />
          <div className="flex-1 text-sm">
            <strong>{mesesLongos[mesAtivo - 1]} {anoAtivo}</strong> está fechado.
            {infoFechado && infoFechado.contasCarryover > 0 && (
              <span className="text-slate-300 ml-2">
                {infoFechado.contasCarryover} pendências carregadas ao próximo mês.
              </span>
            )}
          </div>
          <button
            onClick={() => setReobrirModal(true)}
            className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            <LockOpen size={13} /> Reabrir Mês
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total do mês', value: totais.total, bar: 'bg-slate-400', text: 'text-slate-800' },
          { label: 'Pendente', value: totais.pendente, bar: 'bg-amber-400', text: 'text-amber-700' },
          { label: 'Vencido', value: totais.vencido, bar: 'bg-red-400', text: 'text-red-700' },
          { label: 'Pago', value: totais.pago, bar: 'bg-emerald-400', text: 'text-emerald-700' },
        ].map(t => (
          <Card key={t.label} className="p-4 flex flex-col gap-2">
            <div className={`h-1 w-8 rounded-full ${t.bar}`} />
            <div className={`text-lg font-bold tabular-nums ${t.text}`}>{formatCurrency(t.value)}</div>
            <div className="text-xs text-slate-400 font-medium">{t.label}</div>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <Filter size={14} className="text-slate-400 flex-shrink-0" />
        {([
          ['todos', 'Todos grupos', filtroGrupo, setFiltroGrupo, [['todos', 'Todos grupos'], ...grupos.map(g => [g, grupoLabel[g]])]],
          ['todos', 'Fonte', filtroFonte, setFiltroFonte, [['todos', 'Empresa + Pessoal'], ['empresa', 'Empresa'], ['pessoal', 'Pessoal']]],
          ['todos', 'Status', filtroStatus, setFiltroStatus, [['todos', 'Status'], ['pendente', 'Pendente'], ['vencido', 'Vencido'], ['pago', 'Pago'], ['parcial', 'Parcial']]],
          ['todos', 'Prioridade', filtroPrioridade, setFiltroPrioridade, [['todos', 'Prioridade'], ['alta', '🔴 Alta'], ['media', '🟡 Média'], ['baixa', '🟢 Baixa']]],
        ] as [string, string, string, (v: string) => void, [string, string][]][]).map(([, , val, setter, opts]) => (
          <select
            key={opts[0][0]}
            value={val}
            onChange={e => setter(e.target.value)}
            className={`flex-shrink-0 text-xs border rounded-xl px-3 py-1.5 outline-none transition-all cursor-pointer
              ${val !== 'todos' ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <span className="ml-auto text-xs text-slate-400 flex-shrink-0 pl-2">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Lista — cards no mobile, tabela no desktop */}
      <Card>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-2">📋</div>
            <div>Nenhuma conta em {mesesLongos[mesAtivo - 1]} {anoAtivo}</div>
          </div>
        ) : (
          <>
            {/* ── Card view (mobile) ── */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filtered.map(c => {
                const dias = Math.ceil((new Date(c.vencimento + 'T00:00:00').getTime() - Date.now()) / 86400000)
                const atrasado = c.status !== 'pago' && dias < 0
                const isCarryover = c.origem === 'carryover'
                return (
                  <div key={c.id} className={`px-4 py-3.5 ${atrasado ? 'bg-red-50/40' : isCarryover ? 'bg-amber-50/30' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${c.prioridade === 'alta' ? 'bg-red-400' : c.prioridade === 'baixa' ? 'bg-blue-300' : 'bg-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-medium text-slate-800 text-sm leading-tight flex-1">{c.descricao}</div>
                          <div className="font-bold text-slate-800 text-sm flex-shrink-0">{formatCurrency(c.valor)}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <Badge className={statusColor[c.status]}>{statusLabel[c.status]}</Badge>
                          <Badge className={grupoColor[c.grupo]}>{grupoLabel[c.grupo]}</Badge>
                          {c.parcelaAtual && c.parcelas && (
                            <span className="text-xs text-blue-500 font-medium">{c.parcelaAtual}/{c.parcelas}x</span>
                          )}
                          {isCarryover && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">carry</span>}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`text-xs ${atrasado ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                            {formatDate(c.vencimento)}
                            {c.status !== 'pago' && (
                              <span className="ml-1">
                                {atrasado ? `· ${Math.abs(dias)}d atraso` : dias === 0 ? '· Hoje' : `· em ${dias}d`}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {c.status !== 'pago' && !isFechado && (
                              <button onClick={() => marcarPago(c)} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 active:bg-emerald-100 touch-manipulation">
                                <CheckCircle size={16} />
                              </button>
                            )}
                            {!isFechado && (
                              <button onClick={() => openEdit(c)} className="p-2 rounded-lg bg-slate-50 text-slate-500 active:bg-slate-100 touch-manipulation">
                                <Pencil size={16} />
                              </button>
                            )}
                            {!isFechado && (
                              <button onClick={() => deleteContaPagar(c.id)} className="p-2 rounded-lg bg-slate-50 text-red-400 active:bg-red-50 touch-manipulation">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Tabela (desktop) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-6"></th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grupo</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Fonte</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Vencimento</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Prioridade</th>
                    <th className="px-3 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(c => {
                    const dias = Math.ceil((new Date(c.vencimento + 'T00:00:00').getTime() - Date.now()) / 86400000)
                    const atrasado = c.status !== 'pago' && dias < 0
                    const isCarryover = c.origem === 'carryover'
                    const isPlanejamento = c.origem === 'planejamento'
                    const isDivida = c.origem === 'divida'
                    return (
                      <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${atrasado ? 'bg-red-50/30' : ''} ${isCarryover ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-3 py-3">
                          <div className={`w-1 h-8 rounded-full mx-auto ${c.prioridade === 'alta' ? 'bg-red-400' : c.prioridade === 'baixa' ? 'bg-blue-300' : 'bg-amber-400'}`} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-700 flex items-center gap-1.5 flex-wrap">
                            {c.descricao}
                            {isCarryover && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><ArrowRight size={9} /> carry</span>}
                            {isPlanejamento && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">plano</span>}
                            {isDivida && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">dívida</span>}
                          </div>
                          {c.fornecedor && <div className="text-xs text-slate-400">{c.fornecedor}</div>}
                          {c.parcelaAtual && c.parcelas && <div className="text-xs text-blue-500">{c.parcelaAtual}/{c.parcelas}x</div>}
                        </td>
                        <td className="px-3 py-3"><Badge className={grupoColor[c.grupo]}>{grupoLabel[c.grupo]}</Badge></td>
                        <td className="px-3 py-3 hidden lg:table-cell"><Badge className={fonteColor[c.fonte]}>{c.fonte}</Badge></td>
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <div className={`text-sm ${atrasado ? 'text-red-500 font-medium' : 'text-slate-600'}`}>{formatDate(c.vencimento)}</div>
                          {c.status !== 'pago' && (
                            <div className={`text-xs ${atrasado ? 'text-red-400' : Math.abs(dias) <= 7 ? 'text-amber-500' : 'text-slate-400'}`}>
                              {atrasado ? `${Math.abs(dias)}d atraso` : dias === 0 ? 'Hoje' : `em ${dias}d`}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-slate-800">{formatCurrency(c.valor)}</td>
                        <td className="px-3 py-3 text-center"><Badge className={statusColor[c.status]}>{statusLabel[c.status]}</Badge></td>
                        <td className="px-3 py-3 text-center hidden lg:table-cell">
                          <Badge className={prioridadeColor[c.prioridade ?? 'media']}>{prioridadeIcone[c.prioridade ?? 'media']} {prioridadeLabel[c.prioridade ?? 'media']}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {c.status !== 'pago' && !isFechado && (
                              <button onClick={() => marcarPago(c)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600"><CheckCircle size={15} /></button>
                            )}
                            {!isFechado && <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500"><Pencil size={15} /></button>}
                            {!isFechado && <button onClick={() => deleteContaPagar(c.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Modal Form */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'} size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={save} className="flex-1">
              {editId ? 'Salvar alterações' : parcelasPreview.length > 1 ? `Criar ${parcelasPreview.length} parcelas` : 'Adicionar'}
            </Button>
          </div>
        }>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input span2 label="Descrição *" value={form.descricao} onChange={e => f('descricao', e.target.value)} placeholder="Ex: Rafael, Aluguel, Fornecedor..." autoFocus />
          <Input label="Valor *" type="number" value={form.valor || ''} onChange={e => f('valor', parseFloat(e.target.value))} placeholder="0,00" />
          <Input label="Vencimento *" type="date" value={form.vencimento} onChange={e => f('vencimento', e.target.value)} />
          <Select label="Prioridade" value={form.prioridade ?? 'media'} onChange={e => f('prioridade', e.target.value as Prioridade)}>
            {prioridades.map(p => <option key={p} value={p}>{prioridadeIcone[p]} {prioridadeLabel[p]}</option>)}
          </Select>
          <Select label="Grupo" value={form.grupo} onChange={e => f('grupo', e.target.value)}>
            {grupos.map(g => <option key={g} value={g}>{grupoLabel[g]}</option>)}
          </Select>
          <Select label="Fonte" value={form.fonte} onChange={e => f('fonte', e.target.value as FonteRenda)}>
            {fontes.map(fn => <option key={fn} value={fn}>{fn === 'empresa' ? 'Empresa' : 'Pessoal'}</option>)}
          </Select>
          <Input label="Categoria" value={form.categoria} onChange={e => f('categoria', e.target.value)} placeholder="Opcional" />
          <Input label="Fornecedor" value={form.fornecedor ?? ''} onChange={e => f('fornecedor', e.target.value)} placeholder="Opcional" />
          {!editId && (
            <Input
              label={`Parcelas${form.parcelas && form.parcelas > 1 ? ` — cria ${form.parcelas}x automático` : ''}`}
              type="number" min="1" max="120"
              value={form.parcelas ?? ''}
              onChange={e => f('parcelas', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="1 (sem parcelamento)"
            />
          )}
          <Select label="Status" value={form.status} onChange={e => f('status', e.target.value as StatusConta)}>
            {(['pendente','pago','vencido','parcial'] as StatusConta[]).map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
          </Select>
          <Textarea span2 label="Observações" value={form.observacoes ?? ''} onChange={e => f('observacoes', e.target.value)} rows={2} placeholder="Notas opcionais..." />

          {!editId && parcelasPreview.length > 1 && (
            <div className="md:col-span-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="text-xs font-bold text-emerald-700 mb-2.5 flex items-center gap-1.5">
                <CheckCircle size={12} /> Serão criadas {parcelasPreview.length} contas automaticamente:
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {parcelasPreview.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-emerald-100">
                    <span className="font-medium text-slate-700">{p.descricao}</span>
                    <span className="text-slate-400">{mesesLongos[p.mes - 1]}/{p.ano} · {formatCurrency(form.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Reabrir Mês */}
      <Modal open={reabrirModal} onClose={() => setReobrirModal(false)} title="Reabrir Mês" size="sm">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
              <LockOpen size={16} />
              Reabrir {mesesLongos[mesAtivo - 1]} {anoAtivo}
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>O mês voltará ao estado <strong>aberto</strong> e você poderá editar as contas normalmente.</p>
              {infoFechado && infoFechado.contasCarryover > 0 && (
                <p className="text-blue-600 mt-1">As <strong>{infoFechado.contasCarryover} pendências</strong> que foram carregadas ao próximo mês serão removidas.</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setReobrirModal(false)} className="flex-1">Cancelar</Button>
            <Button onClick={() => { reabrirMes(mesAtivo, anoAtivo); setReobrirModal(false) }} className="flex-1">
              <LockOpen size={14} /> Confirmar Reabertura
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Fechar Mês */}
      <Modal open={fecharModal} onClose={() => setFecharModal(false)} title="Fechar Mês" size="sm">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-700 font-semibold mb-2">
              <AlertTriangle size={16} />
              Fechar {mesesLongos[mesAtivo - 1]} {anoAtivo}
            </div>
            {totais.pendentes_count > 0 ? (
              <div className="text-sm text-amber-700 space-y-1">
                <p><strong>{totais.pendentes_count}</strong> conta{totais.pendentes_count !== 1 ? 's' : ''} pendente{totais.pendentes_count !== 1 ? 's' : ''}</p>
                <p>Total: <strong>{formatCurrency(totais.pendente + totais.vencido)}</strong></p>
                <p className="mt-2 text-amber-600">Estas contas serão automaticamente carregadas para <strong>{mesesLongos[mesAtivo === 12 ? 0 : mesAtivo]} {mesAtivo === 12 ? anoAtivo + 1 : anoAtivo}</strong>.</p>
              </div>
            ) : (
              <p className="text-sm text-amber-700">Nenhuma pendência — todas as contas estão pagas!</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setFecharModal(false)} className="flex-1">Cancelar</Button>
            <Button onClick={confirmarFecharMes} className="flex-1">
              <Lock size={14} /> Fechar Mês
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
