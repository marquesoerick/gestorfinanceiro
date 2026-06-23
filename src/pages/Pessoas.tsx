import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, Users, Phone, Mail, MapPin, Building2, User, Wallet, CheckCircle } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency, formatDate, toDateInput, statusColor, statusLabel } from '../utils/formatters'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import type { Pessoa, TipoPessoa } from '../types'

const emptyForm = (): Omit<Pessoa, 'id'> => ({
  nome: '', tipo: 'cliente', telefone: '', email: '', cpfCnpj: '',
  endereco: '', cidade: '', estado: '', cep: '', observacoes: '', ativa: true
})

const tipoLabel: Record<TipoPessoa, string> = { cliente: 'Cliente', fornecedor: 'Fornecedor', ambos: 'Cliente/Fornecedor' }
const tipoColor: Record<TipoPessoa, string> = {
  cliente: 'bg-blue-100 text-blue-700',
  fornecedor: 'bg-orange-100 text-orange-700',
  ambos: 'bg-purple-100 text-purple-700',
}

export function Pessoas() {
  const {
    pessoas, addPessoa, updatePessoa, deletePessoa,
    contasReceber, fonteRendaCategorias, contasBancarias,
    addPagamentoRecebido, updateContaBancaria,
  } = useFinanceStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [busca, setBusca] = useState('')

  // Conta do cliente: ver saldo devedor
  const [contaView, setContaView] = useState<Pessoa | null>(null)
  const [pagarValorConta, setPagarValorConta] = useState(0)
  const [pagarContaIdConta, setPagarContaIdConta] = useState('')

  const filtered = useMemo(() =>
    pessoas.filter(p =>
      (filtroTipo === 'todos' || p.tipo === filtroTipo) &&
      (busca === '' || p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.email ?? '').toLowerCase().includes(busca.toLowerCase()) ||
        (p.telefone ?? '').includes(busca))
    ).sort((a, b) => a.nome.localeCompare(b.nome))
  , [pessoas, filtroTipo, busca])

  const stats = useMemo(() => ({
    clientes: pessoas.filter(p => p.tipo === 'cliente' || p.tipo === 'ambos').length,
    fornecedores: pessoas.filter(p => p.tipo === 'fornecedor' || p.tipo === 'ambos').length,
    total: pessoas.length,
  }), [pessoas])

  // Saldo devedor por pessoa (todas as contas não pagas)
  const saldosPorPessoa = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const c of contasReceber) {
      if (!c.pessoaId || c.status === 'pago') continue
      const saldo = c.valor - (c.valorRecebido ?? 0)
      mapa[c.pessoaId] = (mapa[c.pessoaId] ?? 0) + saldo
    }
    return mapa
  }, [contasReceber])

  // Dados da conta do cliente selecionado
  const contaDebitosView = useMemo(() => {
    if (!contaView) return []
    return contasReceber
      .filter(c => c.pessoaId === contaView.id && c.status !== 'pago')
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  }, [contaView, contasReceber])

  const contaHistoricoView = useMemo(() => {
    if (!contaView) return []
    return contasReceber
      .filter(c => c.pessoaId === contaView.id && c.status === 'pago')
      .sort((a, b) => b.vencimento.localeCompare(a.vencimento))
      .slice(0, 10)
  }, [contaView, contasReceber])

  const totalEmAbertoConta = useMemo(() =>
    contaDebitosView.reduce((s, c) => s + (c.valor - (c.valorRecebido ?? 0)), 0)
  , [contaDebitosView])

  // Por fonte de renda
  const porFonteConta = useMemo(() => {
    const mapa: Record<string, { nome: string; cor: string; total: number }> = {}
    for (const c of contaDebitosView) {
      const key = c.fonteRendaId ?? '__sem__'
      const fonte = c.fonteRendaId ? fonteRendaCategorias.find(f => f.id === c.fonteRendaId) : null
      if (!mapa[key]) mapa[key] = { nome: fonte?.nome ?? 'Sem Fonte', cor: fonte?.cor ?? '#94a3b8', total: 0 }
      mapa[key].total += c.valor - (c.valorRecebido ?? 0)
    }
    return Object.values(mapa).sort((a, b) => b.total - a.total)
  }, [contaDebitosView, fonteRendaCategorias])

  // Distribuição autom?tica para o pagamento na conta
  const distribuicaoConta = useMemo(() => {
    let restante = pagarValorConta
    return contaDebitosView.map(d => {
      const saldo = d.valor - (d.valorRecebido ?? 0)
      const aplicar = Math.min(Math.max(0, saldo), Math.max(0, restante))
      restante -= aplicar
      return { d, saldo, aplicar, novoStatus: aplicar >= saldo ? 'pago' : aplicar > 0 ? 'parcial' : 'pendente' }
    })
  }, [contaDebitosView, pagarValorConta])

  const confirmarPagamentoConta = () => {
    if (!contaView || pagarValorConta <= 0) return
    const data = toDateInput()
    let totalBanco = 0
    for (const item of distribuicaoConta) {
      if (item.aplicar > 0) {
        addPagamentoRecebido(item.d.id, { data, valor: item.aplicar, contaBancariaId: pagarContaIdConta || undefined })
        totalBanco += item.aplicar
      }
    }
    if (pagarContaIdConta && totalBanco > 0) {
      const conta = contasBancarias.find(c => c.id === pagarContaIdConta)
      if (conta) updateContaBancaria(pagarContaIdConta, { saldo: conta.saldo + totalBanco })
    }
    setPagarValorConta(0)
  }

  const openNew = () => { setForm(emptyForm()); setEditId(null); setModalOpen(true) }
  const openEdit = (p: Pessoa) => { setForm({ ...p }); setEditId(p.id); setModalOpen(true) }
  const openConta = (p: Pessoa) => {
    setContaView(p)
    setPagarValorConta(saldosPorPessoa[p.id] ?? 0)
    setPagarContaIdConta(contasBancarias[0]?.id ?? '')
  }

  const save = () => {
    if (!form.nome.trim()) return
    if (editId) updatePessoa(editId, form)
    else addPessoa(form)
    setModalOpen(false)
  }

  const fv = (k: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg"><Users size={18} className="text-slate-600" /></div>
            <div>
              <div className="text-xl font-bold text-slate-800">{stats.total}</div>
              <div className="text-xs text-slate-400">Pessoas cadastradas</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><User size={18} className="text-blue-600" /></div>
            <div>
              <div className="text-xl font-bold text-blue-600">{stats.clientes}</div>
              <div className="text-xs text-slate-400">Clientes</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg"><Building2 size={18} className="text-orange-600" /></div>
            <div>
              <div className="text-xl font-bold text-orange-600">{stats.fornecedores}</div>
              <div className="text-xs text-slate-400">Fornecedores</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Barra de busca e filtro */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail ou telefone..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-400"
            />
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {[['todos', 'Todos'], ['cliente', 'Clientes'], ['fornecedor', 'Fornecedores'], ['ambos', 'Ambos']].map(([v, l]) => (
              <button key={v} onClick={() => setFiltroTipo(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filtroTipo === v ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                {l}
              </button>
            ))}
          </div>
          <Button onClick={openNew} className="ml-auto"><Plus size={16} /> Nova Pessoa</Button>
        </div>
      </Card>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Users size={40} className="text-slate-200 mx-auto mb-3" />
          <div className="text-slate-400 font-medium">Nenhuma pessoa encontrada</div>
          <div className="text-sm text-slate-300 mt-1">Cadastre clientes e fornecedores para us?-los nas contas</div>
          <Button onClick={openNew} className="mt-4"><Plus size={14} /> Cadastrar Pessoa</Button>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(p => {
            const saldo = saldosPorPessoa[p.id] ?? 0
            return (
              <div key={p.id} onClick={() => openConta(p)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                      ${p.tipo === 'cliente' ? 'bg-blue-100 text-blue-700' : p.tipo === 'fornecedor' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 leading-tight">{p.nome}</div>
                      <Badge className={tipoColor[p.tipo]}>{tipoLabel[p.tipo]}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500"><Pencil size={14} /></button>
                    <button onClick={() => deletePessoa(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500">
                  {p.telefone && (
                    <div className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {p.telefone}</div>
                  )}
                  {p.email && (
                    <div className="flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {p.email}</div>
                  )}
                  {(p.cidade || p.estado) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-400" />
                      {[p.cidade, p.estado].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>

                {/* Saldo devedor badge */}
                {saldo > 0 && (
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs text-red-500">
                      <Wallet size={12} /> Saldo devedor
                    </div>
                    <div className="font-bold text-red-600 text-sm">{formatCurrency(saldo)}</div>
                  </div>
                )}
                {saldo === 0 && contasReceber.some(c => c.pessoaId === p.id) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-emerald-600">
                    <CheckCircle size={12} /> Em dia
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Conta do Cliente */}
      <Modal open={!!contaView} onClose={() => { setContaView(null); setPagarValorConta(0) }} title="Conta do Cliente" size="lg">
        {contaView && (
          <div className="space-y-5">
            {/* Info pessoa */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0
                ${contaView.tipo === 'cliente' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                {contaView.nome.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-800 text-base">{contaView.nome}</div>
                <div className="flex flex-wrap gap-3 mt-1">
                  {contaView.telefone && <span className="text-xs text-slate-500">?? {contaView.telefone}</span>}
                  {contaView.email && <span className="text-xs text-slate-500">? {contaView.email}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Saldo devedor</div>
                <div className={`text-2xl font-bold ${totalEmAbertoConta > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(totalEmAbertoConta)}
                </div>
              </div>
            </div>

            {/* Por fonte de renda */}
            {porFonteConta.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Por Fonte de Renda</div>
                <div className="grid grid-cols-2 gap-2">
                  {porFonteConta.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: f.cor }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-700 truncate">{f.nome}</div>
                        <div className="text-xs text-slate-400">
                          {totalEmAbertoConta > 0 ? ((f.total / totalEmAbertoConta) * 100).toFixed(0) : 0}% do total
                        </div>
                      </div>
                      <div className="text-sm font-bold text-slate-700">{formatCurrency(f.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Débitos em aberto */}
            {contaDebitosView.length > 0 ? (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Débitos em aberto</div>
                <div className="space-y-1.5">
                  {contaDebitosView.map(c => {
                    const saldo = c.valor - (c.valorRecebido ?? 0)
                    const fonte = c.fonteRendaId ? fonteRendaCategorias.find(f => f.id === c.fonteRendaId) : null
                    const item = distribuicaoConta.find(x => x.d.id === c.id)
                    const cor = item?.novoStatus === 'pago' ? 'border-emerald-300 bg-emerald-50'
                      : item?.novoStatus === 'parcial' ? 'border-amber-300 bg-amber-50'
                      : 'border-slate-200'
                    return (
                      <div key={c.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-colors ${cor}`}>
                        {fonte && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: fonte.cor }} />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-700 truncate">{c.descricao}</div>
                          {c.parcelaAtual && c.parcelas && (
                            <div className="text-xs text-blue-500">{c.parcelaAtual}/{c.parcelas}x</div>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{formatDate(c.vencimento)}</div>
                        <div className="text-right">
                          <div className="font-bold text-slate-700">{formatCurrency(saldo)}</div>
                          {c.status === 'parcial' && c.valorRecebido && (
                            <div className="text-xs text-emerald-600">j? pago: {formatCurrency(c.valorRecebido)}</div>
                          )}
                        </div>
                        {item && item.aplicar > 0 && pagarValorConta > 0 && (
                          <span className={`text-xs font-bold flex-shrink-0 ${item.novoStatus === 'pago' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            -{formatCurrency(item.aplicar)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400 text-sm">
                <CheckCircle size={24} className="mx-auto mb-1 text-emerald-400" />
                Nenhum débito em aberto
              </div>
            )}

            {/* Registrar pagamento */}
            {contaDebitosView.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-emerald-700 mb-3">Registrar Pagamento</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Valor recebido agora</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                      <input type="number" step="0.01" min="0"
                        value={pagarValorConta || ''}
                        onChange={e => setPagarValorConta(parseFloat(e.target.value) || 0)}
                        className="w-full pl-9 pr-3 py-2 border border-emerald-300 rounded-lg text-sm font-bold text-emerald-800 outline-none focus:border-emerald-500 bg-white" />
                    </div>
                    <div className="flex gap-1.5 mt-1.5">
                      <button onClick={() => setPagarValorConta(totalEmAbertoConta)}
                        className="text-xs px-2 py-0.5 bg-white border border-emerald-200 text-emerald-700 rounded-full hover:bg-emerald-100">
                        Tudo ({formatCurrency(totalEmAbertoConta)})
                      </button>
                    </div>
                  </div>
                  {contasBancarias.length > 0 && (
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Conta bancária</label>
                      <select value={pagarContaIdConta} onChange={e => setPagarContaIdConta(e.target.value)}
                        className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm bg-white outline-none">
                        <option value="">Selecione a conta</option>
                        {contasBancarias.map(cb => (
                          <option key={cb.id} value={cb.id}>{cb.nome} · {formatCurrency(cb.saldo)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {pagarValorConta > 0 && (
                  <div className="mt-3 space-y-1">
                    {distribuicaoConta.filter(x => x.aplicar > 0).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-white rounded-lg px-3 py-1.5 border border-emerald-100">
                        <span className={`w-2 h-2 rounded-full ${item.novoStatus === 'pago' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <span className="flex-1 text-slate-600 truncate">{item.d.descricao}</span>
                        <span className="font-semibold text-emerald-700">+{formatCurrency(item.aplicar)}</span>
                        <span className={`px-1.5 py-0.5 rounded font-medium ${item.novoStatus === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.novoStatus === 'pago' ? '? Quitado' : 'Parcial'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <Button onClick={confirmarPagamentoConta} disabled={pagarValorConta <= 0} className="mt-3 w-full">
                  <CheckCircle size={15} />
                  Confirmar Pagamento {pagarValorConta > 0 ? formatCurrency(Math.min(pagarValorConta, totalEmAbertoConta)) : ''}
                </Button>
              </div>
            )}

            {/* Histórico de recebimentos */}
            {contaHistoricoView.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recebimentos concluídos (últimos)</div>
                <div className="space-y-1">
                  {contaHistoricoView.map(c => {
                    const fonte = c.fonteRendaId ? fonteRendaCategorias.find(f => f.id === c.fonteRendaId) : null
                    return (
                      <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-xs">
                        {fonte && <div className="w-2 h-2 rounded-full" style={{ background: fonte.cor }} />}
                        <span className="flex-1 text-slate-600 truncate">{c.descricao}</span>
                        <Badge className={statusColor[c.status]}>{statusLabel[c.status]}</Badge>
                        <span className="font-semibold text-emerald-700">{formatCurrency(c.valorRecebido ?? c.valor)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Cadastro/Edição */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Pessoa' : 'Nova Pessoa'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nome *</label>
            <input value={form.nome} onChange={e => fv('nome', e.target.value)}
              className="fi"
              placeholder="Nome completo ou razão social" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tipo *</label>
            <select value={form.tipo} onChange={e => fv('tipo', e.target.value as TipoPessoa)}
              className="fi">
              <option value="cliente">Cliente</option>
              <option value="fornecedor">Fornecedor</option>
              <option value="ambos">Cliente e Fornecedor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">CPF / CNPJ</label>
            <input value={form.cpfCnpj ?? ''} onChange={e => fv('cpfCnpj', e.target.value)}
              className="fi"
              placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Telefone</label>
            <input value={form.telefone ?? ''} onChange={e => fv('telefone', e.target.value)}
              className="fi"
              placeholder="(00) 90000-0000" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">E-mail</label>
            <input type="email" value={form.email ?? ''} onChange={e => fv('email', e.target.value)}
              className="fi"
              placeholder="email@exemplo.com" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Endereço</label>
            <input value={form.endereco ?? ''} onChange={e => fv('endereco', e.target.value)}
              className="fi"
              placeholder="Rua, número, complemento" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Cidade</label>
            <input value={form.cidade ?? ''} onChange={e => fv('cidade', e.target.value)}
              className="fi" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Estado</label>
              <input value={form.estado ?? ''} onChange={e => fv('estado', e.target.value)}
                className="fi"
                placeholder="SP" maxLength={2} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">CEP</label>
              <input value={form.cep ?? ''} onChange={e => fv('cep', e.target.value)}
                className="fi"
                placeholder="00000-000" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Observações</label>
            <textarea value={form.observacoes ?? ''} onChange={e => fv('observacoes', e.target.value)}
              rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 resize-none"
              placeholder="Informações adicionais sobre esta pessoa..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativa} onChange={e => fv('ativa', e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-600">Pessoa ativa</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
          <Button onClick={save} className="flex-1">{editId ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </Modal>
    </div>
  )
}


