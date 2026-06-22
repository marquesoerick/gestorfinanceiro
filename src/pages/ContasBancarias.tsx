import { useState } from 'react'
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency } from '../utils/formatters'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import type { ContaBancaria, FonteRenda } from '../types'

const cores = ['#6366f1', '#10b981', '#f97316', '#ec4899', '#0ea5e9', '#84cc16', '#f59e0b', '#8b5cf6', '#64748b']

const tipoLabel: Record<string, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
  investimento: 'Investimento',
  carteira: 'Carteira Digital',
}

const emptyForm = (): Omit<ContaBancaria, 'id'> => ({
  nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente',
  saldo: 0, fonte: 'pessoal', ativa: true, cor: '#6366f1'
})

export function ContasBancarias() {
  const { contasBancarias, addContaBancaria, updateContaBancaria, deleteContaBancaria } = useFinanceStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const totalSaldo = contasBancarias.filter(c => c.ativa).reduce((s, c) => s + c.saldo, 0)
  const totalEmpresa = contasBancarias.filter(c => c.ativa && c.fonte === 'empresa').reduce((s, c) => s + c.saldo, 0)
  const totalPessoal = contasBancarias.filter(c => c.ativa && c.fonte === 'pessoal').reduce((s, c) => s + c.saldo, 0)

  const openNew = () => { setForm(emptyForm()); setEditId(null); setModalOpen(true) }
  const openEdit = (c: ContaBancaria) => { setForm({ ...c }); setEditId(c.id); setModalOpen(true) }

  const save = () => {
    if (!form.nome.trim()) return
    const payload = { ...form, banco: form.banco.trim() || form.nome.trim() }
    if (editId) updateContaBancaria(editId, payload)
    else addContaBancaria(payload)
    setModalOpen(false)
  }

  const f = (k: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-xs text-slate-400 mb-1">Saldo Total</div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalSaldo)}</div>
          <div className="text-xs text-slate-400 mt-1">{contasBancarias.filter(c => c.ativa).length} contas ativas</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-slate-400 mb-1">Empresa</div>
          <div className="text-2xl font-bold text-indigo-600">{formatCurrency(totalEmpresa)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-slate-400 mb-1">Pessoal</div>
          <div className="text-2xl font-bold text-teal-600">{formatCurrency(totalPessoal)}</div>
        </Card>
      </div>

      {/* Cards das Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contasBancarias.map(c => (
          <Card key={c.id} className={`overflow-hidden ${!c.ativa ? 'opacity-60' : ''}`}>
            <div className="h-2" style={{ background: c.cor }} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${c.cor}20` }}>
                    <Building2 size={20} style={{ color: c.cor }} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{c.nome}</div>
                    <div className="text-xs text-slate-400">{c.banco}</div>
                  </div>
                </div>
                <Badge className={c.fonte === 'empresa' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}>
                  {c.fonte}
                </Badge>
              </div>

              <div className="mb-4">
                <div className="text-xs text-slate-400 mb-0.5">Saldo disponível</div>
                <div className="text-2xl font-bold" style={{ color: c.cor }}>{formatCurrency(c.saldo)}</div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-4">
                <span className="bg-slate-50 px-2 py-1 rounded">{tipoLabel[c.tipo]}</span>
                {c.agencia && <span className="bg-slate-50 px-2 py-1 rounded">Ag: {c.agencia}</span>}
                {c.conta && <span className="bg-slate-50 px-2 py-1 rounded">Cc: {c.conta}</span>}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil size={13} /> Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => deleteContaBancaria(c.id)} className="text-red-500"><Trash2 size={13} /></Button>
              </div>
            </div>
          </Card>
        ))}

        {/* Card Adicionar */}
        <button
          onClick={openNew}
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
        >
          <Plus size={24} />
          <span className="text-sm font-medium">Adicionar Conta</span>
        </button>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Conta' : 'Nova Conta Bancária'} size="md">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nome da Conta *</label>
            <input value={form.nome} onChange={e => f('nome', e.target.value)} className="fi" placeholder="Ex: Conta Corrente PF" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Banco *</label>
            <input value={form.banco} onChange={e => f('banco', e.target.value)} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tipo</label>
            <select value={form.tipo} onChange={e => f('tipo', e.target.value)} className="fi">
              {Object.entries(tipoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Agência</label>
            <input value={form.agencia} onChange={e => f('agencia', e.target.value)} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Conta</label>
            <input value={form.conta} onChange={e => f('conta', e.target.value)} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Saldo Atual</label>
            <input type="number" value={form.saldo || ''} onChange={e => f('saldo', parseFloat(e.target.value))} className="fi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Fonte</label>
            <select value={form.fonte} onChange={e => f('fonte', e.target.value as FonteRenda)} className="fi">
              <option value="pessoal">Pessoal</option>
              <option value="empresa">Empresa</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {cores.map(c => (
                <button key={c} onClick={() => f('cor', c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.cor === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <label className="col-span-2 flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.ativa} onChange={e => f('ativa', e.target.checked)} />
            <span className="text-sm text-slate-600">Conta ativa</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
          <Button onClick={save} className="flex-1">{editId ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </Modal>
    </div>
  )
}


