import { useState, useMemo } from 'react'
import {
  Trash2, Download, Upload, Database, Info, CheckCircle,
  Plus, Pencil, Users, Package, TrendingUp, Building2, Settings2,
  Phone, Mail, MapPin
} from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { seedDemoData } from '../utils/seedData'
import { formatCurrency } from '../utils/formatters'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import type { TipoPessoa, Produto, FonteRendaCategoria, Pessoa, ContaBancaria } from '../types'

type Aba = 'pessoas' | 'produtos' | 'fontes' | 'contas' | 'dados' | 'sistema'

const CORES = ['#10b981','#6366f1','#f97316','#ec4899','#0ea5e9','#84cc16','#f59e0b','#8b5cf6','#ef4444','#14b8a6']

const tipoLabel: Record<TipoPessoa, string> = { cliente: 'Cliente', fornecedor: 'Fornecedor', ambos: 'Ambos' }
const tipoColor: Record<TipoPessoa, string> = {
  cliente: 'bg-blue-100 text-blue-700',
  fornecedor: 'bg-orange-100 text-orange-700',
  ambos: 'bg-purple-100 text-purple-700',
}

export function Configuracoes() {
  const store = useFinanceStore()
  const [aba, setAba] = useState<Aba>('pessoas')

  // -------- Pessoas --------
  const [pModal, setPModal] = useState(false)
  const [pEditId, setPEditId] = useState<string | null>(null)
  const [pForm, setPForm] = useState<Omit<Pessoa, 'id'>>({ nome: '', tipo: 'cliente', ativa: true })

  const openPNew = () => { setPForm({ nome: '', tipo: 'cliente', ativa: true }); setPEditId(null); setPModal(true) }
  const openPEdit = (p: Pessoa) => { setPForm({ ...p }); setPEditId(p.id); setPModal(true) }
  const savePessoa = () => {
    if (!pForm.nome.trim()) return
    if (pEditId) store.updatePessoa(pEditId, pForm)
    else store.addPessoa(pForm)
    setPModal(false)
  }
  const fp = (k: keyof typeof pForm, v: unknown) => setPForm(prev => ({ ...prev, [k]: v }))

  // -------- Produtos --------
  const [prModal, setPrModal] = useState(false)
  const [prEditId, setPrEditId] = useState<string | null>(null)
  const [prForm, setPrForm] = useState<Omit<Produto, 'id'>>({ nome: '', fonteRendaId: '', ativo: true })

  const openPrNew = () => { setPrForm({ nome: '', fonteRendaId: store.fonteRendaCategorias[0]?.id ?? '', ativo: true }); setPrEditId(null); setPrModal(true) }
  const openPrEdit = (p: Produto) => { setPrForm({ ...p }); setPrEditId(p.id); setPrModal(true) }
  const saveProduto = () => {
    if (!prForm.nome.trim() || !prForm.fonteRendaId) return
    if (prEditId) store.updateProduto(prEditId, prForm)
    else store.addProduto(prForm)
    setPrModal(false)
  }
  const fpr = (k: keyof typeof prForm, v: unknown) => setPrForm(prev => ({ ...prev, [k]: v }))

  // -------- Fontes de Renda --------
  const [fModal, setFModal] = useState(false)
  const [fEditId, setFEditId] = useState<string | null>(null)
  const [fForm, setFForm] = useState<Omit<FonteRendaCategoria, 'id'>>({ nome: '', cor: '#10b981', ativa: true })

  const openFNew = () => { setFForm({ nome: '', cor: '#10b981', ativa: true }); setFEditId(null); setFModal(true) }
  const openFEdit = (f: FonteRendaCategoria) => { setFForm({ ...f }); setFEditId(f.id); setFModal(true) }
  const saveFonte = () => {
    if (!fForm.nome.trim()) return
    if (fEditId) store.updateFonteRendaCategoria(fEditId, fForm)
    else store.addFonteRendaCategoria(fForm)
    setFModal(false)
  }
  const ff = (k: keyof typeof fForm, v: unknown) => setFForm(prev => ({ ...prev, [k]: v }))

  // -------- Contas Bancárias --------
  const [cModal, setCModal] = useState(false)
  const [cEditId, setCEditId] = useState<string | null>(null)
  const [cForm, setCForm] = useState<Omit<ContaBancaria, 'id'>>({
    nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo: 0, fonte: 'pessoal', ativa: true, cor: '#10b981'
  })

  const openCNew = () => { setCForm({ nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo: 0, fonte: 'pessoal', ativa: true, cor: '#10b981' }); setCEditId(null); setCModal(true) }
  const openCEdit = (c: ContaBancaria) => { setCForm({ ...c }); setCEditId(c.id); setCModal(true) }
  const saveConta = () => {
    if (!cForm.nome.trim()) return
    const payload = { ...cForm, banco: cForm.banco.trim() || cForm.nome.trim() }
    if (cEditId) store.updateContaBancaria(cEditId, payload)
    else store.addContaBancaria(payload)
    setCModal(false)
  }
  const fc = (k: keyof typeof cForm, v: unknown) => setCForm(prev => ({ ...prev, [k]: v }))

  // -------- Backup --------
  const [confirmClear, setConfirmClear] = useState(false)
  const [seeded, setSeeded] = useState(false)

  const exportarDados = () => {
    const data = {
      contasPagar: store.contasPagar, contasReceber: store.contasReceber,
      transacoesBancarias: store.transacoesBancarias, dividas: store.dividas,
      planejamentos: store.planejamentos, fontesRenda: store.fontesRenda,
      fonteRendaCategorias: store.fonteRendaCategorias, produtos: store.produtos,
      pessoas: store.pessoas, provisionamentos: store.provisionamentos,
      contasBancarias: store.contasBancarias, exportadoEm: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `gestor-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importarDados = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          if (data.contasBancarias) data.contasBancarias.forEach((c: Parameters<typeof store.addContaBancaria>[0]) => store.addContaBancaria(c))
          if (data.fonteRendaCategorias) data.fonteRendaCategorias.forEach((f: Parameters<typeof store.addFonteRendaCategoria>[0]) => store.addFonteRendaCategoria(f))
          if (data.produtos) data.produtos.forEach((p: Parameters<typeof store.addProduto>[0]) => store.addProduto(p))
          if (data.pessoas) data.pessoas.forEach((p: Parameters<typeof store.addPessoa>[0]) => store.addPessoa(p))
          if (data.contasPagar) data.contasPagar.forEach((c: Parameters<typeof store.addContaPagar>[0]) => store.addContaPagar(c))
          if (data.contasReceber) data.contasReceber.forEach((c: Parameters<typeof store.addContaReceber>[0]) => store.addContaReceber(c))
          if (data.dividas) data.dividas.forEach((d: Parameters<typeof store.addDivida>[0]) => store.addDivida(d))
          if (data.planejamentos) data.planejamentos.forEach((p: Parameters<typeof store.addPlanejamento>[0]) => store.addPlanejamento(p))
          alert('Dados importados!')
        } catch { alert('Erro ao importar.') }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const carregarDemo = () => { seedDemoData(); setSeeded(true); setTimeout(() => setSeeded(false), 3000) }

  // -------- Tabs config --------
  const tabs: { id: Aba; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'pessoas', label: 'Pessoas', icon: Users, count: store.pessoas.length },
    { id: 'produtos', label: 'Produtos', icon: Package, count: store.produtos.length },
    { id: 'fontes', label: 'Fontes de Renda', icon: TrendingUp, count: store.fonteRendaCategorias.length },
    { id: 'contas', label: 'Contas Bancárias', icon: Building2, count: store.contasBancarias.length },
    { id: 'dados', label: 'Backup', icon: Download },
    { id: 'sistema', label: 'Sistema', icon: Settings2 },
  ]

  // Produto count por fonte
  const produtosPorFonte = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of store.produtos) m[p.fonteRendaId] = (m[p.fonteRendaId] ?? 0) + 1
    return m
  }, [store.produtos])

  return (
    <div className="space-y-5">
      {/* Tabs — scroll horizontal no mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-0.5 border-b border-slate-200 min-w-max sm:min-w-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setAba(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative
                ${aba === t.id ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'}`}>
              <t.icon size={14} className="flex-shrink-0" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${aba === t.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {t.count}
                </span>
              )}
              {aba === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* --- Aba: PESSOAS --- */}
      {aba === 'pessoas' && (
        <Card title="Pessoas cadastradas" action={<Button size="sm" onClick={openPNew}><Plus size={14} /> Nova Pessoa</Button>}>
          {store.pessoas.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Users size={32} className="mx-auto mb-2 text-slate-200" />
              <div>Nenhuma pessoa cadastrada</div>
              <div className="text-xs mt-1">Clientes e fornecedores aparecem aqui</div>
              <Button onClick={openPNew} className="mt-3" size="sm"><Plus size={13} /> Cadastrar</Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {store.pessoas.sort((a, b) => a.nome.localeCompare(b.nome)).map(p => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                    ${p.tipo === 'cliente' ? 'bg-blue-100 text-blue-700' : p.tipo === 'fornecedor' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                    {p.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-700">{p.nome}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <Badge className={tipoColor[p.tipo]}>{tipoLabel[p.tipo]}</Badge>
                      {p.telefone && <span className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10} />{p.telefone}</span>}
                      {p.email && <span className="text-xs text-slate-400 flex items-center gap-1"><Mail size={10} />{p.email}</span>}
                      {(p.cidade || p.estado) && <span className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={10} />{[p.cidade, p.estado].filter(Boolean).join(', ')}</span>}
                    </div>
                  </div>
                  {!p.ativa && <Badge className="bg-slate-100 text-slate-400">Inativo</Badge>}
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openPEdit(p)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500"><Pencil size={13} /></button>
                    <button onClick={() => store.deletePessoa(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* --- Aba: PRODUTOS --- */}
      {aba === 'produtos' && (
        <Card title="Produtos" action={<Button size="sm" onClick={openPrNew}><Plus size={14} /> Novo Produto</Button>}>
          {store.fonteRendaCategorias.length === 0 && (
            <div className="mx-5 my-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              ⚠ Cadastre pelo menos uma <strong>Fonte de Renda</strong> antes de adicionar produtos.
              <button onClick={() => setAba('fontes')} className="ml-2 underline font-medium">Ir para Fontes ?</button>
            </div>
          )}
          {store.produtos.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Package size={32} className="mx-auto mb-2 text-slate-200" />
              <div>Nenhum produto cadastrado</div>
              <div className="text-xs mt-1">Ex: Camiseta, Action Max, Consultoria...</div>
              {store.fonteRendaCategorias.length > 0 && (
                <Button onClick={openPrNew} className="mt-3" size="sm"><Plus size={13} /> Cadastrar</Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {store.produtos.sort((a, b) => a.nome.localeCompare(b.nome)).map(p => {
                const fonte = store.fonteRendaCategorias.find(f => f.id === p.fonteRendaId)
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Package size={16} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-700">{p.nome}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {fonte && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <div className="w-2 h-2 rounded-full" style={{ background: fonte.cor }} />
                            {fonte.nome}
                          </div>
                        )}
                        {p.precoBase && (
                          <span className="text-xs text-slate-400">· {formatCurrency(p.precoBase)}</span>
                        )}
                        {p.descricao && <span className="text-xs text-slate-400 truncate">· {p.descricao}</span>}
                      </div>
                    </div>
                    {!p.ativo && <Badge className="bg-slate-100 text-slate-400">Inativo</Badge>}
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openPrEdit(p)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500"><Pencil size={13} /></button>
                      <button onClick={() => store.deleteProduto(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* --- Aba: FONTES DE RENDA --- */}
      {aba === 'fontes' && (
        <Card title="Fontes de Renda" action={<Button size="sm" onClick={openFNew}><Plus size={14} /> Nova Fonte</Button>}>
          {store.fonteRendaCategorias.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <TrendingUp size={32} className="mx-auto mb-2 text-slate-200" />
              <div>Nenhuma fonte cadastrada</div>
              <div className="text-xs mt-1">Ex: Action Max, Urbaninhos PC, Freelance...</div>
              <Button onClick={openFNew} className="mt-3" size="sm"><Plus size={13} /> Cadastrar</Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {store.fonteRendaCategorias.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: f.cor }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-700">{f.nome}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {f.descricao && <span className="text-xs text-slate-400">{f.descricao}</span>}
                      <span className="text-xs text-slate-400">{produtosPorFonte[f.id] ?? 0} produto(s)</span>
                    </div>
                  </div>
                  {!f.ativa && <Badge className="bg-slate-100 text-slate-400">Inativo</Badge>}
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openFEdit(f)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500"><Pencil size={13} /></button>
                    <button onClick={() => store.deleteFonteRendaCategoria(f.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* --- Aba: CONTAS BANCÁRIAS --- */}
      {aba === 'contas' && (
        <Card title="Contas Bancárias" action={<Button size="sm" onClick={openCNew}><Plus size={14} /> Nova Conta</Button>}>
          {store.contasBancarias.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Building2 size={32} className="mx-auto mb-2 text-slate-200" />
              <div>Nenhuma conta cadastrada</div>
              <div className="text-xs mt-1">Nubank, Itaú, Carteira, etc.</div>
              <Button onClick={openCNew} className="mt-3" size="sm"><Plus size={13} /> Cadastrar</Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {store.contasBancarias.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: c.cor }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-700">{c.nome}</div>
                    <div className="text-xs text-slate-400">{c.banco} · {c.tipo === 'corrente' ? 'C/C' : c.tipo === 'poupanca' ? 'Poupança' : c.tipo === 'investimento' ? 'Investimento' : 'Carteira'}</div>
                  </div>
                  <div className={`font-bold text-sm ${c.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(c.saldo)}
                  </div>
                  {!c.ativa && <Badge className="bg-slate-100 text-slate-400">Inativa</Badge>}
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openCEdit(c)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500"><Pencil size={13} /></button>
                    <button onClick={() => store.deleteContaBancaria(c.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              <div className="px-5 py-3 bg-slate-50 flex justify-between text-sm">
                <span className="text-slate-500">Total em contas</span>
                <span className="font-bold text-slate-700">
                  {formatCurrency(store.contasBancarias.filter(c => c.ativa).reduce((s, c) => s + c.saldo, 0))}
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* --- Aba: BACKUP --- */}
      {aba === 'dados' && (
        <div className="space-y-4 max-w-2xl mx-auto">
          <Card title="Resumo dos Dados">
            <div className="p-4 grid grid-cols-2 gap-2 text-sm">
              {[
                ['Pessoas', store.pessoas.length],
                ['Produtos', store.produtos.length],
                ['Fontes de Renda', store.fonteRendaCategorias.length],
                ['Contas Bancárias', store.contasBancarias.length],
                ['Contas a Pagar', store.contasPagar.length],
                ['Contas a Receber', store.contasReceber.length],
                ['Dívidas', store.dividas.length],
                ['Planejamentos', store.planejamentos.length],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-slate-600">{k}</span>
                  <span className="font-bold text-slate-800">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Dados de Demonstração">
            <div className="p-5">
              <p className="text-sm text-slate-500 mb-4">Carregue dados de exemplo para explorar as funcionalidades.</p>
              <Button onClick={carregarDemo} variant="secondary" className="w-full">
                {seeded ? <><CheckCircle size={16} className="text-emerald-500" /> Dados carregados!</> : <><Database size={16} /> Carregar Demonstração</>}
              </Button>
            </div>
          </Card>

          <Card title="Backup e Restauração">
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-500">Exporte todos os seus dados para JSON e importe quando necessário.</p>
              <div className="flex gap-3">
                <Button onClick={exportarDados} variant="secondary" className="flex-1"><Download size={15} /> Exportar</Button>
                <Button onClick={importarDados} variant="secondary" className="flex-1"><Upload size={15} /> Importar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* --- Aba: SISTEMA --- */}
      {aba === 'sistema' && (
        <div className="max-w-2xl mx-auto space-y-4">
          <Card title="Sobre o Gestor Financeiro">
            <div className="p-5 flex items-start gap-4">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl">??</div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Gestor Financeiro</h3>
                <p className="text-sm text-slate-500 mt-1">Dados armazenados localmente. 100% privado.</p>
                <div className="flex gap-2 mt-3">
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">v1.0.0</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Dados Locais</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Zona de Perigo" className="border-red-100">
            <div className="p-5">
              {!confirmClear ? (
                <div>
                  <p className="text-sm text-slate-500 mb-4">Apaga permanentemente todos os dados armazenados localmente.</p>
                  <Button variant="danger" onClick={() => setConfirmClear(true)} className="w-full">
                    <Trash2 size={15} /> Limpar Todos os Dados
                  </Button>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                    <Info size={16} /> Tem certeza? Esta ação não pode ser desfeita.
                  </div>
                  <div className="flex gap-3 mt-3">
                    <Button variant="secondary" onClick={() => setConfirmClear(false)} className="flex-1">Cancelar</Button>
                    <Button variant="danger" onClick={() => { localStorage.removeItem('gestor-financeiro-v2'); window.location.reload() }} className="flex-1">
                      <Trash2 size={14} /> Confirmar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* --- Modal Pessoa --- */}
      <Modal open={pModal} onClose={() => setPModal(false)} title={pEditId ? 'Editar Pessoa' : 'Nova Pessoa'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nome *</label>
            <input value={pForm.nome} onChange={e => fp('nome', e.target.value)}
              className="fi"
              placeholder="Nome completo ou razão social" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tipo *</label>
            <select value={pForm.tipo} onChange={e => fp('tipo', e.target.value as TipoPessoa)}
              className="fi">
              <option value="cliente">Cliente</option>
              <option value="fornecedor">Fornecedor</option>
              <option value="ambos">Cliente e Fornecedor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">CPF / CNPJ</label>
            <input value={pForm.cpfCnpj ?? ''} onChange={e => fp('cpfCnpj', e.target.value)}
              className="fi" placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Telefone</label>
            <input value={pForm.telefone ?? ''} onChange={e => fp('telefone', e.target.value)}
              className="fi" placeholder="(00) 90000-0000" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">E-mail</label>
            <input type="email" value={pForm.email ?? ''} onChange={e => fp('email', e.target.value)}
              className="fi" placeholder="email@exemplo.com" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Endereço</label>
            <input value={pForm.endereco ?? ''} onChange={e => fp('endereco', e.target.value)}
              className="fi" placeholder="Rua, número, complemento" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Cidade</label>
            <input value={pForm.cidade ?? ''} onChange={e => fp('cidade', e.target.value)}
              className="fi" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Estado</label>
              <input value={pForm.estado ?? ''} onChange={e => fp('estado', e.target.value)}
                className="fi" placeholder="SP" maxLength={2} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">CEP</label>
              <input value={pForm.cep ?? ''} onChange={e => fp('cep', e.target.value)}
                className="fi" placeholder="00000-000" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Observações</label>
            <textarea value={pForm.observacoes ?? ''} onChange={e => fp('observacoes', e.target.value)}
              rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pForm.ativa} onChange={e => fp('ativa', e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-600">Pessoa ativa</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setPModal(false)} className="flex-1">Cancelar</Button>
          <Button onClick={savePessoa} className="flex-1">{pEditId ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </Modal>

      {/* --- Modal Produto --- */}
      <Modal open={prModal} onClose={() => setPrModal(false)} title={prEditId ? 'Editar Produto' : 'Novo Produto'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nome do Produto *</label>
            <input value={prForm.nome} onChange={e => fpr('nome', e.target.value)}
              className="fi"
              placeholder="Ex: Camiseta P, Action Max, Consultoria..." autoFocus />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Fonte de Renda *</label>
            {store.fonteRendaCategorias.length === 0 ? (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Cadastre uma Fonte de Renda primeiro.
                <button onClick={() => { setPrModal(false); setAba('fontes'); openFNew() }} className="ml-1 underline font-medium">Cadastrar agora ?</button>
              </div>
            ) : (
              <select value={prForm.fonteRendaId} onChange={e => fpr('fonteRendaId', e.target.value)}
                className="fi">
                <option value="">Selecione a fonte</option>
                {store.fonteRendaCategorias.filter(f => f.ativa).map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            )}
            {prForm.fonteRendaId && (() => {
              const f = store.fonteRendaCategorias.find(x => x.id === prForm.fonteRendaId)
              return f ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: f.cor }} />
                  <span className="text-xs text-slate-400">{f.nome}</span>
                </div>
              ) : null
            })()}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Descrição</label>
            <input value={prForm.descricao ?? ''} onChange={e => fpr('descricao', e.target.value)}
              className="fi"
              placeholder="Opcional..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Preço base (opcional)</label>
            <input type="number" value={prForm.precoBase ?? ''} onChange={e => fpr('precoBase', parseFloat(e.target.value) || undefined)}
              className="fi"
              placeholder="0,00" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={prForm.ativo} onChange={e => fpr('ativo', e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-600">Produto ativo</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setPrModal(false)} className="flex-1">Cancelar</Button>
          <Button onClick={saveProduto} className="flex-1">{prEditId ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </Modal>

      {/* --- Modal Fonte de Renda --- */}
      <Modal open={fModal} onClose={() => setFModal(false)} title={fEditId ? 'Editar Fonte' : 'Nova Fonte de Renda'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nome *</label>
            <input value={fForm.nome} onChange={e => ff('nome', e.target.value)}
              className="fi"
              placeholder="Ex: Action Max, Urbaninhos PC..." autoFocus />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Descrição</label>
            <input value={fForm.descricao ?? ''} onChange={e => ff('descricao', e.target.value)}
              className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Cor identificadora</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map(c => (
                <button key={c} type="button" onClick={() => ff('cor', c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${fForm.cor === c ? 'border-slate-700 scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={fForm.ativa} onChange={e => ff('ativa', e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-600">Fonte ativa</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setFModal(false)} className="flex-1">Cancelar</Button>
          <Button onClick={saveFonte} className="flex-1">{fEditId ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </Modal>

      {/* --- Modal Conta Bancária --- */}
      <Modal open={cModal} onClose={() => setCModal(false)} title={cEditId ? 'Editar Conta' : 'Nova Conta Bancária'} size="sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nome da conta *</label>
            <input value={cForm.nome} onChange={e => fc('nome', e.target.value)}
              className="fi"
              placeholder="Ex: Nubank Pessoal" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Banco <span className="font-normal text-slate-400">(opcional)</span></label>
            <input value={cForm.banco} onChange={e => fc('banco', e.target.value)}
              className="fi"
              placeholder="Nubank, Itaú, Banestes" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tipo</label>
            <select value={cForm.tipo} onChange={e => fc('tipo', e.target.value)}
              className="fi">
              <option value="corrente">Conta Corrente</option>
              <option value="poupanca">Poupança</option>
              <option value="investimento">Investimento</option>
              <option value="carteira">Carteira</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Agência</label>
            <input value={cForm.agencia} onChange={e => fc('agencia', e.target.value)}
              className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Conta</label>
            <input value={cForm.conta} onChange={e => fc('conta', e.target.value)}
              className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Saldo inicial</label>
            <input type="number" value={cForm.saldo} onChange={e => fc('saldo', parseFloat(e.target.value) || 0)}
              className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Uso</label>
            <select value={cForm.fonte} onChange={e => fc('fonte', e.target.value)}
              className="fi">
              <option value="pessoal">Pessoal</option>
              <option value="empresa">Empresa</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Cor identificadora</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map(c => (
                <button key={c} type="button" onClick={() => fc('cor', c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${cForm.cor === c ? 'border-slate-700 scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer col-span-2">
            <input type="checkbox" checked={cForm.ativa} onChange={e => fc('ativa', e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-600">Conta ativa</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setCModal(false)} className="flex-1">Cancelar</Button>
          <Button onClick={saveConta} className="flex-1">{cEditId ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </Modal>
    </div>
  )
}

