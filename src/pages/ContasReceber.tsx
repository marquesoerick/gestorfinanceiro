import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, Filter, Building2, UserPlus, Package, X, ChevronDown } from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import {
  formatCurrency, formatDate, toDateInput, statusLabel, statusColor, mesesLongos
} from '../utils/formatters'
import { getMesRef, getAnoRef } from '../utils/helpers'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { MesNavigator } from '../components/ui/MesNavigator'
import type { ContaReceber, FonteRenda, StatusConta, Prioridade, TipoPessoa, Pessoa } from '../types'

// â”€â”€â”€ Item individual de uma venda â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type ItemVenda = {
  _id: string
  produtoId: string
  fonteRendaId: string
  descricao: string
  valor: number
}

const newItem = (): ItemVenda => ({
  _id: Math.random().toString(36).slice(2),
  produtoId: '', fonteRendaId: '', descricao: '', valor: 0,
})

// â”€â”€â”€ Grupo de entradas por pessoa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type GrupoPessoa = {
  pessoaId: string
  pessoa: Pessoa | null
  entradas: ContaReceber[]
  total: number
  saldoDevedor: number
  status: 'pago' | 'parcial' | 'pendente' | 'atrasado'
}

// â”€â”€â”€ Form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const emptyForm = () => ({
  pessoaId: '',
  status: 'pendente' as StatusConta,
  fonte: 'empresa' as FonteRenda,
  categoria: '',
  observacoes: '',
  prioridade: 'media' as Prioridade,
  vencimento: toDateInput(),
  parcelas: 1,
  diaPagamento: new Date().getDate(),
  itens: [newItem()] as ItemVenda[],
})

type FormType = ReturnType<typeof emptyForm>

const statusGrupoLabel: Record<GrupoPessoa['status'], string> = {
  pago: 'Recebido', parcial: 'Parcial', pendente: 'Pendente', atrasado: 'Em atraso'
}
const statusGrupoColor: Record<GrupoPessoa['status'], string> = {
  pago: 'bg-emerald-100 text-emerald-700',
  parcial: 'bg-amber-100 text-amber-700',
  pendente: 'bg-blue-100 text-blue-700',
  atrasado: 'bg-red-100 text-red-700',
}

export function ContasReceber() {
  const {
    contasReceber, addContaReceber, updateContaReceber, deleteContaReceber, addPagamentoRecebido,
    mesAtivo, anoAtivo,
    pessoas, addPessoa,
    produtos, addProduto,
    fonteRendaCategorias,
    contasBancarias, updateContaBancaria,
  } = useFinanceStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormType>(emptyForm)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroFonte, setFiltroFonte] = useState<string>('todos')

  // â”€â”€â”€ Expandir/colapsar pessoas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [expandedPessoas, setExpandedPessoas] = useState<Set<string>>(new Set())
  const togglePessoa = (id: string) => setExpandedPessoas(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  // â”€â”€â”€ Modal de pagamento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [pagarModal, setPagarModal] = useState<ContaReceber | null>(null)
  const [pagarValor, setPagarValor] = useState(0)
  const [pagarContaId, setPagarContaId] = useState('')

  // â”€â”€â”€ Tabela e filtros â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filtered = useMemo(() =>
    contasReceber
      .filter(c =>
        getMesRef(c.vencimento, c.mesReferencia) === mesAtivo &&
        getAnoRef(c.vencimento, c.anoReferencia) === anoAtivo &&
        (filtroStatus === 'todos' || c.status === filtroStatus) &&
        (filtroFonte === 'todos' || c.fonte === filtroFonte)
      )
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  , [contasReceber, mesAtivo, anoAtivo, filtroStatus, filtroFonte])

  // â”€â”€â”€ Agrupar por pessoa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const grupos = useMemo(() => {
    const map = new Map<string, GrupoPessoa>()
    const semPessoa: ContaReceber[] = []
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)

    for (const c of filtered) {
      if (!c.pessoaId) { semPessoa.push(c); continue }
      if (!map.has(c.pessoaId)) {
        const p = pessoas.find(x => x.id === c.pessoaId) ?? null
        map.set(c.pessoaId, { pessoaId: c.pessoaId, pessoa: p, entradas: [], total: 0, saldoDevedor: 0, status: 'pendente' })
      }
      const g = map.get(c.pessoaId)!
      g.entradas.push(c)
      g.total += c.valor
      g.saldoDevedor += c.valor - (c.valorRecebido ?? 0)
    }

    for (const g of map.values()) {
      const todosPagos = g.entradas.every(c => c.status === 'pago')
      const algumAtrasado = g.entradas.some(c => c.status !== 'pago' && new Date(c.vencimento + 'T00:00:00') < hoje)
      const algumPago = g.entradas.some(c => (c.valorRecebido ?? 0) > 0)
      if (todosPagos) g.status = 'pago'
      else if (algumAtrasado) g.status = 'atrasado'
      else if (algumPago) g.status = 'parcial'
      else g.status = 'pendente'
    }

    return {
      comPessoa: [...map.values()].sort((a, b) => (a.pessoa?.nome ?? '').localeCompare(b.pessoa?.nome ?? '')),
      semPessoa,
    }
  }, [filtered, pessoas])

  // â”€â”€â”€ DÃ©bitos do modal: entradas do mÃªs filtrado para a pessoa â”€â”€â”€â”€
  const todosDebitos = useMemo(() => {
    if (!pagarModal) return []
    if (pagarModal.pessoaId) {
      return filtered
        .filter(c => c.pessoaId === pagarModal.pessoaId && c.status !== 'pago')
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    }
    return [pagarModal].filter(c => c.status !== 'pago')
  }, [pagarModal, filtered])

  const totalEmAberto = useMemo(() =>
    todosDebitos.reduce((s, c) => s + (c.valor - (c.valorRecebido ?? 0)), 0)
  , [todosDebitos])

  // â”€â”€â”€ DistribuiÃ§Ã£o PROPORCIONAL (por saldo de cada produto) â”€â”€â”€â”€â”€â”€â”€â”€
  const distribuicao = useMemo(() => {
    const totalSaldo = todosDebitos.reduce((s, d) => s + (d.valor - (d.valorRecebido ?? 0)), 0)
    return todosDebitos.map(d => {
      const saldo = d.valor - (d.valorRecebido ?? 0)
      const proporcao = totalSaldo > 0 ? saldo / totalSaldo : 0
      const aplicar = Math.min(saldo, Math.round(pagarValor * proporcao * 100) / 100)
      const novoStatus = aplicar >= saldo ? 'pago' : aplicar > 0 ? 'parcial' : 'sem-alteracao'
      return { d, saldo, aplicar, novoStatus }
    })
  }, [todosDebitos, pagarValor])

  // â”€â”€â”€ InformaÃ§Ã£o de restante/excedente para prÃ³ximo mÃªs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pagamentoInfo = useMemo(() => {
    if (!pagarModal || pagarValor <= 0 || totalEmAberto <= 0) return null
    const nextMes = mesAtivo === 12 ? 1 : mesAtivo + 1
    const nextAno = mesAtivo === 12 ? anoAtivo + 1 : anoAtivo
    const diff = pagarValor - totalEmAberto

    if (diff > 0.01) {
      const proximasParcelas = pagarModal.pessoaId
        ? contasReceber.filter(c =>
            c.pessoaId === pagarModal.pessoaId && c.status !== 'pago' &&
            getMesRef(c.vencimento, c.mesReferencia) === nextMes &&
            getAnoRef(c.vencimento, c.anoReferencia) === nextAno
          )
        : []
      return { type: 'excesso' as const, valor: diff, nextMes, nextAno, hasNext: proximasParcelas.length > 0 }
    }
    if (totalEmAberto - pagarValor > 0.01) {
      return { type: 'restante' as const, valor: totalEmAberto - pagarValor, nextMes, nextAno, hasNext: false }
    }
    return null
  }, [pagarModal, pagarValor, totalEmAberto, mesAtivo, anoAtivo, contasReceber])

  const abrirPagarModal = (c: ContaReceber) => {
    setPagarModal(c)
    const saldo = c.pessoaId
      ? filtered.filter(x => x.pessoaId === c.pessoaId && x.status !== 'pago')
          .reduce((s, x) => s + (x.valor - (x.valorRecebido ?? 0)), 0)
      : c.valor - (c.valorRecebido ?? 0)
    setPagarValor(saldo)
    setPagarContaId(contasBancarias[0]?.id ?? '')
  }

  const abrirPagarGrupo = (g: GrupoPessoa) => {
    const primeira = g.entradas.find(c => c.status !== 'pago') ?? g.entradas[0]
    abrirPagarModal(primeira)
  }

  const confirmarPagamento = () => {
    if (!pagarModal || pagarValor <= 0) return
    const data = toDateInput()
    const mesNome = mesesLongos[mesAtivo - 1]
    const nextMes = mesAtivo === 12 ? 1 : mesAtivo + 1
    const nextAno = mesAtivo === 12 ? anoAtivo + 1 : anoAtivo

    // Aplica distribuiÃ§Ã£o proporcional no mÃªs atual
    let totalBanco = 0
    for (const item of distribuicao) {
      if (item.aplicar > 0) {
        addPagamentoRecebido(item.d.id, { data, valor: item.aplicar, contaBancariaId: pagarContaId || undefined })
        totalBanco += item.aplicar
      }
    }

    // PAGOU MENOS: cria lanÃ§amentos do restante no prÃ³ximo mÃªs
    if (pagarValor < totalEmAberto - 0.01) {
      for (const item of distribuicao) {
        const remaining = Math.round((item.saldo - item.aplicar) * 100) / 100
        if (remaining > 0.01) {
          const diaVenc = new Date(item.d.vencimento + 'T00:00:00').getDate()
          const nextVenc = `${nextAno}-${String(nextMes).padStart(2, '0')}-${String(Math.min(diaVenc, 28)).padStart(2, '0')}`
          addContaReceber({
            descricao: `${item.d.descricao} (restante de ${mesNome}/${anoAtivo})`,
            valor: remaining,
            vencimento: nextVenc,
            status: 'pendente',
            fonte: item.d.fonte,
            categoria: item.d.categoria,
            pessoaId: item.d.pessoaId,
            produtoId: item.d.produtoId,
            fonteRendaId: item.d.fonteRendaId,
            mesReferencia: nextMes,
            anoReferencia: nextAno,
            diaPagamento: item.d.diaPagamento ?? diaVenc,
            observacoes: `DÃ©bito nÃ£o quitado em ${mesNome}/${anoAtivo}`,
          })
        }
      }
    }

    // PAGOU MAIS: abate excedente das parcelas do prÃ³ximo mÃªs
    if (pagarValor > totalEmAberto + 0.01 && pagarModal.pessoaId) {
      const excesso = Math.round((pagarValor - totalEmAberto) * 100) / 100
      const proximasParcelas = contasReceber.filter(c =>
        c.pessoaId === pagarModal.pessoaId && c.status !== 'pago' &&
        getMesRef(c.vencimento, c.mesReferencia) === nextMes &&
        getAnoRef(c.vencimento, c.anoReferencia) === nextAno
      )
      if (proximasParcelas.length > 0) {
        const totalProx = proximasParcelas.reduce((s, c) => s + (c.valor - (c.valorRecebido ?? 0)), 0)
        for (const prox of proximasParcelas) {
          const saldoProx = prox.valor - (prox.valorRecebido ?? 0)
          const propProx = totalProx > 0 ? saldoProx / totalProx : 1 / proximasParcelas.length
          const aplicarProx = Math.min(saldoProx, Math.round(excesso * propProx * 100) / 100)
          if (aplicarProx > 0) {
            addPagamentoRecebido(prox.id, {
              data,
              valor: aplicarProx,
              contaBancariaId: pagarContaId || undefined,
              observacoes: `Saldo de ${mesNome}/${anoAtivo}`,
            })
          }
        }
      }
      totalBanco = pagarValor // valor total depositado no banco
    }

    if (pagarContaId && totalBanco > 0) {
      const conta = contasBancarias.find(c => c.id === pagarContaId)
      if (conta) updateContaBancaria(pagarContaId, { saldo: conta.saldo + totalBanco })
    }
    setPagarModal(null)
  }

  // â”€â”€â”€ Quick-add inline: Pessoa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [quickPessoa, setQuickPessoa] = useState(false)
  const [qpNome, setQpNome] = useState('')
  const [qpTipo, setQpTipo] = useState<TipoPessoa>('cliente')
  const [qpTelefone, setQpTelefone] = useState('')

  const salvarQuickPessoa = () => {
    if (!qpNome.trim()) return
    addPessoa({ nome: qpNome.trim(), tipo: qpTipo, telefone: qpTelefone || undefined, ativa: true })
    setTimeout(() => {
      const nova = useFinanceStore.getState().pessoas.find(p => p.nome === qpNome.trim())
      if (nova) setForm(prev => ({ ...prev, pessoaId: nova.id }))
    }, 0)
    setQpNome(''); setQpTelefone(''); setQuickPessoa(false)
  }

  // â”€â”€â”€ Quick-add inline: Produto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [quickProduto, setQuickProduto] = useState(false)
  const [qprNome, setQprNome] = useState('')
  const [qprFonteId, setQprFonteId] = useState('')
  const [qprPreco, setQprPreco] = useState<number | ''>('')

  const salvarQuickProduto = () => {
    if (!qprNome.trim() || !qprFonteId) return
    addProduto({ nome: qprNome.trim(), fonteRendaId: qprFonteId, precoBase: qprPreco || undefined, ativo: true })
    setTimeout(() => {
      const novo = useFinanceStore.getState().produtos.find(x => x.nome === qprNome.trim())
      if (novo) {
        const item: ItemVenda = {
          _id: Math.random().toString(36).slice(2),
          produtoId: novo.id,
          fonteRendaId: novo.fonteRendaId,
          descricao: novo.nome,
          valor: novo.precoBase ?? 0,
        }
        setForm(prev => {
          const itens = [...prev.itens]
          const last = itens[itens.length - 1]
          if (!last.produtoId && !last.valor && !last.descricao) itens[itens.length - 1] = item
          else itens.push(item)
          return { ...prev, itens }
        })
      }
    }, 0)
    setQprNome(''); setQprFonteId(''); setQprPreco(''); setQuickProduto(false)
  }

  // â”€â”€â”€ Item helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addItemVenda = () => setForm(prev => ({ ...prev, itens: [...prev.itens, newItem()] }))
  const removeItemVenda = (idx: number) =>
    setForm(prev => ({ ...prev, itens: prev.itens.filter((_, i) => i !== idx) }))
  const updateItemVenda = (idx: number, key: keyof ItemVenda, val: unknown) => {
    setForm(prev => {
      const itens = prev.itens.map((it, i) => {
        if (i !== idx) return it
        const updated = { ...it, [key]: val }
        if (key === 'produtoId' && val) {
          const prod = useFinanceStore.getState().produtos.find(p => p.id === val)
          if (prod) {
            updated.fonteRendaId = prod.fonteRendaId
            if (!updated.descricao) updated.descricao = prod.nome
            if (!updated.valor && prod.precoBase) updated.valor = prod.precoBase
          }
        }
        return updated
      })
      return { ...prev, itens }
    })
  }

  // â”€â”€â”€ KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totais = useMemo(() => ({
    total: filtered.reduce((s, c) => s + c.valor, 0),
    pendente: filtered.filter(c => c.status === 'pendente').reduce((s, c) => s + c.valor, 0),
    vencido: filtered.filter(c => c.status === 'vencido').reduce((s, c) => s + c.valor, 0),
    recebido: filtered.filter(c => c.status === 'pago').reduce((s, c) => s + (c.valorRecebido ?? c.valor), 0),
  }), [filtered])

  // â”€â”€â”€ Preview de todos os lanÃ§amentos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const allEntries = useMemo(() => {
    const itensValidos = form.itens.filter(it => it.valor > 0)
    if (!itensValidos.length) return []
    const result: Array<{
      descricao: string; vencimento: string; mes: number; ano: number;
      valor: number; fonteRendaId: string; produtoId: string; parcelaAtual: number;
    }> = []
    const hoje = new Date()
    for (const item of itensValidos) {
      const nome = item.descricao
        || produtos.find(p => p.id === item.produtoId)?.nome
        || fonteRendaCategorias.find(f => f.id === item.fonteRendaId)?.nome
        || 'Recebimento'
      const valorParcela = Math.round((item.valor / form.parcelas) * 100) / 100
      for (let i = 0; i < form.parcelas; i++) {
        const d = form.parcelas > 1
          ? new Date(hoje.getFullYear(), hoje.getMonth() + i, form.diaPagamento)
          : new Date(form.vencimento + 'T00:00:00')
        const isUltima = i === form.parcelas - 1
        const valorUsado = isUltima
          ? Math.round((item.valor - valorParcela * (form.parcelas - 1)) * 100) / 100
          : valorParcela
        result.push({
          descricao: form.parcelas > 1
            ? `${nome} ${String(i + 1).padStart(2, '0')}/${String(form.parcelas).padStart(2, '0')}`
            : nome,
          vencimento: d.toISOString().split('T')[0],
          mes: d.getMonth() + 1,
          ano: d.getFullYear(),
          valor: valorUsado,
          fonteRendaId: item.fonteRendaId,
          produtoId: item.produtoId,
          parcelaAtual: i + 1,
        })
      }
    }
    return result
  }, [form.itens, form.parcelas, form.diaPagamento, form.vencimento, produtos, fonteRendaCategorias])

  const showPreview = !editId && allEntries.length > 0 &&
    (form.itens.filter(it => it.valor > 0).length > 1 || form.parcelas > 1)

  // â”€â”€â”€ Abrir modais â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openNew = () => {
    const d = new Date()
    setForm({
      ...emptyForm(),
      vencimento: `${anoAtivo}-${String(mesAtivo).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      diaPagamento: d.getDate(),
    })
    setEditId(null); setQuickPessoa(false); setQuickProduto(false); setModalOpen(true)
  }

  const openEdit = (c: ContaReceber) => {
    setForm({
      pessoaId: c.pessoaId ?? '',
      status: c.status,
      fonte: c.fonte,
      categoria: c.categoria,
      observacoes: c.observacoes ?? '',
      prioridade: c.prioridade ?? 'media',
      vencimento: c.vencimento,
      parcelas: c.parcelas ?? 1,
      diaPagamento: c.diaPagamento ?? new Date().getDate(),
      itens: [{ _id: Math.random().toString(36).slice(2), produtoId: c.produtoId ?? '', fonteRendaId: c.fonteRendaId ?? '', descricao: c.descricao, valor: c.valor }],
    })
    setEditId(c.id); setQuickPessoa(false); setQuickProduto(false); setModalOpen(true)
  }

  // â”€â”€â”€ Salvar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const save = () => {
    const itensValidos = form.itens.filter(it => it.valor > 0)
    if (!itensValidos.length) return
    if (editId) {
      const item = itensValidos[0]
      const nome = item.descricao || produtos.find(p => p.id === item.produtoId)?.nome || 'Recebimento'
      updateContaReceber(editId, {
        descricao: nome, valor: item.valor,
        produtoId: item.produtoId || undefined,
        fonteRendaId: item.fonteRendaId || undefined,
        pessoaId: form.pessoaId || undefined,
        status: form.status, fonte: form.fonte, categoria: form.categoria,
        prioridade: form.prioridade,
        observacoes: form.observacoes || undefined,
        vencimento: form.vencimento,
        mesReferencia: new Date(form.vencimento + 'T00:00:00').getMonth() + 1,
        anoReferencia: new Date(form.vencimento + 'T00:00:00').getFullYear(),
      })
    } else {
      for (const entry of allEntries) {
        addContaReceber({
          descricao: entry.descricao, valor: entry.valor, vencimento: entry.vencimento,
          status: 'pendente', fonte: form.fonte, categoria: form.categoria || 'Recebimento',
          prioridade: form.prioridade,
          pessoaId: form.pessoaId || undefined,
          produtoId: entry.produtoId || undefined,
          fonteRendaId: entry.fonteRendaId || undefined,
          parcelas: form.parcelas > 1 ? form.parcelas : undefined,
          parcelaAtual: form.parcelas > 1 ? entry.parcelaAtual : undefined,
          diaPagamento: form.diaPagamento,
          mesReferencia: entry.mes, anoReferencia: entry.ano,
          observacoes: form.observacoes || undefined,
        })
      }
    }
    setModalOpen(false)
  }

  const f = (k: Exclude<keyof FormType, 'itens'>, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const pessoaSelecionada = pessoas.find(p => p.id === form.pessoaId)
  const totalItens = form.itens.reduce((s, it) => s + it.valor, 0)

  return (
    <div className="space-y-5">
      {/* NavegaÃ§Ã£o Mensal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MesNavigator />
        <Button onClick={openNew}><Plus size={16} /> Nova Venda</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total do mÃªs', value: totais.total, bar: 'bg-slate-400', text: 'text-slate-800' },
          { label: 'Pendente', value: totais.pendente, bar: 'bg-blue-400', text: 'text-blue-700' },
          { label: 'Vencido', value: totais.vencido, bar: 'bg-red-400', text: 'text-red-700' },
          { label: 'Recebido', value: totais.recebido, bar: 'bg-emerald-400', text: 'text-emerald-700' },
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
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className={`flex-shrink-0 text-xs border rounded-xl px-3 py-1.5 outline-none transition-all cursor-pointer ${filtroStatus !== 'todos' ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold' : 'border-slate-200 bg-white text-slate-600'}`}>
          <option value="todos">Status</option>
          <option value="pendente">Pendente</option>
          <option value="vencido">Vencido</option>
          <option value="pago">Recebido</option>
        </select>
        <select value={filtroFonte} onChange={e => setFiltroFonte(e.target.value)}
          className={`flex-shrink-0 text-xs border rounded-xl px-3 py-1.5 outline-none transition-all cursor-pointer ${filtroFonte !== 'todos' ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold' : 'border-slate-200 bg-white text-slate-600'}`}>
          <option value="todos">Empresa + Pessoal</option>
          <option value="empresa">Empresa</option>
          <option value="pessoal">Pessoal</option>
        </select>
        <span className="ml-auto text-xs text-slate-400 flex-shrink-0 pl-2">
          {grupos.comPessoa.length} cliente{grupos.comPessoa.length !== 1 ? 's' : ''} Â· {grupos.semPessoa.length} avulso{grupos.semPessoa.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* â”€â”€â”€ Lista agrupada por pessoa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Card>
        {filtered.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <div className="text-4xl mb-2">ðŸ’°</div>
            <div>Nenhum recebimento em {mesesLongos[mesAtivo - 1]} {anoAtivo}</div>
            <button onClick={openNew} className="mt-2 text-emerald-500 text-sm hover:underline">+ Registrar venda</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">

            {/* â”€â”€ Grupos por pessoa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {grupos.comPessoa.map(grupo => {
              const isExpanded = expandedPessoas.has(grupo.pessoaId)
              const atrasado = grupo.status === 'atrasado'
              const inicial = grupo.pessoa?.nome.charAt(0).toUpperCase() ?? '?'

              return (
                <div key={grupo.pessoaId}>
                  {/* Linha do grupo (pessoa) */}
                  <div
                    className={`flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors
                      ${atrasado ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-slate-50'}`}
                    onClick={() => togglePessoa(grupo.pessoaId)}
                  >
                    {/* Avatar + nome */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white
                      ${atrasado ? 'bg-red-500' : grupo.status === 'pago' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                      {inicial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{grupo.pessoa?.nome ?? 'Pessoa'}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {grupo.entradas.length} produto{grupo.entradas.length > 1 ? 's' : ''} neste mÃªs
                        {grupo.pessoa?.telefone && <span className="ml-2">ðŸ“ž {grupo.pessoa.telefone}</span>}
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="text-right mr-3 flex-shrink-0">
                      <div className="font-bold text-slate-700 text-sm">{formatCurrency(grupo.total)}</div>
                      {grupo.saldoDevedor < grupo.total && grupo.saldoDevedor > 0 && (
                        <div className="text-xs text-amber-600">Saldo: {formatCurrency(grupo.saldoDevedor)}</div>
                      )}
                      {grupo.saldoDevedor <= 0 && grupo.status === 'pago' && (
                        <div className="text-xs text-emerald-600">Quitado âœ“</div>
                      )}
                    </div>

                    <Badge className={statusGrupoColor[grupo.status]}>{statusGrupoLabel[grupo.status]}</Badge>

                    {grupo.status !== 'pago' && (
                      <button
                        onClick={e => { e.stopPropagation(); abrirPagarGrupo(grupo) }}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 flex-shrink-0"
                        title="Registrar pagamento">
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>

                  {/* Produtos expandidos */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50">
                      {grupo.entradas.map((c, idx) => {
                        const fonte = c.fonteRendaId ? fonteRendaCategorias.find(f => f.id === c.fonteRendaId) : null
                        const dias = Math.ceil((new Date(c.vencimento + 'T00:00:00').getTime() - Date.now()) / 86400000)
                        const atrasadoItem = c.status !== 'pago' && dias < 0
                        const saldoItem = c.valor - (c.valorRecebido ?? 0)
                        return (
                          <div key={c.id}
                            className={`flex items-center gap-3 pl-16 pr-5 py-3 border-b border-slate-100 last:border-b-0
                              ${atrasadoItem ? 'bg-red-50/40' : idx % 2 === 0 ? 'bg-white/60' : 'bg-slate-50/60'}`}>
                            {/* Cor da fonte */}
                            <div className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: fonte?.cor ?? '#94a3b8' }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-700">{c.descricao}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {fonte && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                                    style={{ background: fonte.cor }}>
                                    {fonte.nome}
                                  </span>
                                )}
                                {c.parcelaAtual && c.parcelas && (
                                  <span className="text-xs text-blue-500 font-medium">{c.parcelaAtual}/{c.parcelas}x</span>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">
                              <div>{formatDate(c.vencimento)}</div>
                              <div className={atrasadoItem ? 'text-red-400 font-medium' : ''}>
                                {atrasadoItem ? `${Math.abs(dias)}d atraso` : dias === 0 ? 'Hoje' : `em ${dias}d`}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <div className="text-sm font-semibold text-slate-700">{formatCurrency(c.valor)}</div>
                              {(c.valorRecebido ?? 0) > 0 && saldoItem > 0 && (
                                <div className="text-xs text-amber-600">Saldo: {formatCurrency(saldoItem)}</div>
                              )}
                            </div>
                            <Badge className={statusColor[c.status]}>{statusLabel[c.status]}</Badge>
                            <div className="flex gap-0.5 flex-shrink-0">
                              <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-blue-50 text-blue-400"><Pencil size={13} /></button>
                              <button onClick={() => deleteContaReceber(c.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* â”€â”€ Entradas avulsas (sem pessoa) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {grupos.semPessoa.length > 0 && (
              <>
                {grupos.comPessoa.length > 0 && (
                  <div className="px-5 py-2 bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Vendas avulsas (sem cliente)
                  </div>
                )}
                {grupos.semPessoa.map(c => {
                  const fonte = c.fonteRendaId ? fonteRendaCategorias.find(f => f.id === c.fonteRendaId) : null
                  const dias = Math.ceil((new Date(c.vencimento + 'T00:00:00').getTime() - Date.now()) / 86400000)
                  const atrasado = c.status !== 'pago' && dias < 0
                  return (
                    <div key={c.id} className={`flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors ${atrasado ? 'bg-red-50/30' : ''}`}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-300" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-700">{c.descricao}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {fonte && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                              style={{ background: fonte.cor }}>{fonte.nome}</span>
                          )}
                          {c.parcelaAtual && c.parcelas && (
                            <span className="text-xs text-blue-500">{c.parcelaAtual}/{c.parcelas}x</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 flex-shrink-0 hidden sm:block text-right">
                        <div>{formatDate(c.vencimento)}</div>
                        <div className={atrasado ? 'text-red-400 font-medium' : ''}>
                          {atrasado ? `${Math.abs(dias)}d atraso` : dias === 0 ? 'Hoje' : `em ${dias}d`}
                        </div>
                      </div>
                      <div className="font-semibold text-sm text-slate-700 flex-shrink-0">{formatCurrency(c.valor)}</div>
                      <Badge className={statusColor[c.status]}>{statusLabel[c.status]}</Badge>
                      <div className="flex gap-0.5 flex-shrink-0">
                        {c.status !== 'pago' && (
                          <button onClick={() => abrirPagarModal(c)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600"><CheckCircle size={15} /></button>
                        )}
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-blue-50 text-blue-400"><Pencil size={15} /></button>
                        <button onClick={() => deleteContaReceber(c.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </Card>

      {/* â”€â”€â”€ Modal: Nova Venda / Editar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editId ? 'Editar Conta a Receber' : 'Nova Venda'} size="lg">
        <div className="space-y-5">

          {/* Pessoa */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600">Pessoa (cliente/fornecedor)</label>
              <button type="button" onClick={() => { setQuickPessoa(v => !v); setQuickProduto(false) }}
                className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors
                  ${quickPessoa ? 'bg-blue-100 text-blue-700' : 'text-blue-500 hover:bg-blue-50'}`}>
                {quickPessoa ? <X size={11} /> : <UserPlus size={11} />}
                {quickPessoa ? 'Cancelar' : 'Nova pessoa'}
              </button>
            </div>
            <select value={form.pessoaId} onChange={e => f('pessoaId', e.target.value)}
              className="fi">
              <option value="">â€” Sem pessoa vinculada â€”</option>
              {pessoas.filter(p => p.ativa && (p.tipo === 'cliente' || p.tipo === 'ambos')).map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            {pessoaSelecionada?.telefone && !quickPessoa && (
              <div className="text-xs text-slate-400 mt-1">ðŸ“ž {pessoaSelecionada.telefone}</div>
            )}
            {quickPessoa && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                  <UserPlus size={12} /> Cadastrar nova pessoa
                </div>
                <input value={qpNome} onChange={e => setQpNome(e.target.value)} placeholder="Nome *" autoFocus
                  className="w-full border border-blue-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={qpTipo} onChange={e => setQpTipo(e.target.value as TipoPessoa)}
                    className="border border-blue-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none">
                    <option value="cliente">Cliente</option>
                    <option value="fornecedor">Fornecedor</option>
                    <option value="ambos">Ambos</option>
                  </select>
                  <input value={qpTelefone} onChange={e => setQpTelefone(e.target.value)} placeholder="Telefone"
                    className="border border-blue-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400 bg-white" />
                </div>
                <button type="button" onClick={salvarQuickPessoa} disabled={!qpNome.trim()}
                  className="w-full py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
                  Cadastrar e selecionar
                </button>
              </div>
            )}
          </div>

          {/* Itens da venda */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">
                Itens da venda
                {form.itens.length > 1 && (
                  <span className="ml-2 font-normal text-slate-400">
                    ({form.itens.filter(it => it.valor > 0).length} produto(s) Â· {formatCurrency(totalItens)})
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                {!editId && (
                  <button type="button" onClick={() => { setQuickProduto(v => !v); setQuickPessoa(false) }}
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors
                      ${quickProduto ? 'bg-indigo-100 text-indigo-700' : 'text-indigo-600 hover:bg-indigo-50'}`}>
                    {quickProduto ? <X size={11} /> : <Package size={11} />}
                    {quickProduto ? 'Cancelar' : 'Novo produto'}
                  </button>
                )}
                {!editId && (
                  <button type="button" onClick={addItemVenda}
                    className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 px-2 py-0.5 rounded-full transition-colors">
                    <Plus size={11} /> Adicionar item
                  </button>
                )}
              </div>
            </div>

            {quickProduto && (
              <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                  <Package size={12} /> Cadastrar novo produto
                </div>
                <input value={qprNome} onChange={e => setQprNome(e.target.value)} placeholder="Nome do produto *" autoFocus
                  className="w-full border border-indigo-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-400 bg-white" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={qprFonteId} onChange={e => setQprFonteId(e.target.value)}
                    className="border border-indigo-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none">
                    <option value="">â€” Fonte de renda * â€”</option>
                    {fonteRendaCategorias.filter(f => f.ativa).map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                  <input type="number" value={qprPreco} onChange={e => setQprPreco(parseFloat(e.target.value) || '')}
                    placeholder="PreÃ§o base"
                    className="border border-indigo-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-400 bg-white" />
                </div>
                <button type="button" onClick={salvarQuickProduto} disabled={!qprNome.trim() || !qprFonteId}
                  className="w-full py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                  Cadastrar e adicionar Ã  venda
                </button>
              </div>
            )}

            <div className="space-y-2">
              {form.itens.map((item, idx) => {
                const fonte = item.fonteRendaId ? fonteRendaCategorias.find(f => f.id === item.fonteRendaId) : null
                const prod = item.produtoId ? produtos.find(p => p.id === item.produtoId) : null
                return (
                  <div key={item._id} className={`p-3 rounded-xl border-2 transition-colors ${item.valor > 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <select value={item.produtoId} onChange={e => updateItemVenda(idx, 'produtoId', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm bg-white outline-none focus:border-emerald-400">
                          <option value="">â€” Selecione o produto (opcional) â€”</option>
                          {produtos.filter(p => p.ativo).map(p => {
                            const f = fonteRendaCategorias.find(f => f.id === p.fonteRendaId)
                            return <option key={p.id} value={p.id}>{p.nome}{f ? ` Â· ${f.nome}` : ''}</option>
                          })}
                        </select>
                        <div className="flex gap-2">
                          <input value={item.descricao} onChange={e => updateItemVenda(idx, 'descricao', e.target.value)}
                            placeholder={prod?.nome ?? 'DescriÃ§Ã£o (opcional)'}
                            className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400" />
                          <div className="relative flex-shrink-0 w-32">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                            <input type="number" value={item.valor || ''} onChange={e => updateItemVenda(idx, 'valor', parseFloat(e.target.value) || 0)}
                              placeholder="0,00"
                              className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-emerald-700 outline-none focus:border-emerald-400" />
                          </div>
                        </div>
                        {fonte && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: fonte.cor }} />
                            {fonte.nome}
                          </div>
                        )}
                        {!item.produtoId && fonteRendaCategorias.length > 0 && (
                          <select value={item.fonteRendaId} onChange={e => updateItemVenda(idx, 'fonteRendaId', e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none text-slate-500">
                            <option value="">â€” ou selecione a fonte de renda â€”</option>
                            {fonteRendaCategorias.filter(f => f.ativa).map(f => (
                              <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      {form.itens.length > 1 && (
                        <button type="button" onClick={() => removeItemVenda(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {form.itens.length > 1 && totalItens > 0 && (
              <div className="mt-2 text-right">
                <span className="text-sm font-bold text-slate-700">Total da venda: {formatCurrency(totalItens)}</span>
              </div>
            )}
          </div>

          {/* Parcelas + Dia + Vencimento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {!editId && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Parcelas</label>
                <input type="number" min="1" max="120" value={form.parcelas}
                  onChange={e => f('parcelas', Math.max(1, parseInt(e.target.value) || 1))}
                  className="fi" />
              </div>
            )}
            {!editId && form.parcelas > 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Todo dia (do mÃªs)</label>
                <input type="number" min="1" max="28" value={form.diaPagamento}
                  onChange={e => f('diaPagamento', Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="fi" />
              </div>
            )}
            {(editId || form.parcelas <= 1) && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vencimento</label>
                <input type="date" value={form.vencimento} onChange={e => f('vencimento', e.target.value)}
                  className="fi" />
              </div>
            )}
          </div>

          {/* Conta + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Conta</label>
              <select value={form.fonte} onChange={e => f('fonte', e.target.value as FonteRenda)}
                className="fi">
                <option value="empresa">Empresa</option>
                <option value="pessoal">Pessoal</option>
              </select>
            </div>
            {editId && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select value={form.status} onChange={e => f('status', e.target.value as StatusConta)}
                  className="fi">
                  {(['pendente', 'pago', 'vencido', 'parcial'] as StatusConta[]).map(s => (
                    <option key={s} value={s}>{statusLabel[s]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ObservaÃ§Ãµes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">ObservaÃ§Ãµes</label>
            <textarea value={form.observacoes} onChange={e => f('observacoes', e.target.value)}
              rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 resize-none" />
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                <CheckCircle size={12} />
                {allEntries.length} lanÃ§amento(s) serÃ£o criados
                {form.parcelas > 1 && <> â€” todo dia {form.diaPagamento} â€” {form.parcelas}x</>}
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {allEntries.map((e, i) => {
                  const fonte = e.fonteRendaId ? fonteRendaCategorias.find(f => f.id === e.fonteRendaId) : null
                  return (
                    <div key={i} className="flex items-center gap-2 justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-emerald-100">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {fonte && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: fonte.cor }} />}
                        <span className="font-medium text-slate-700 truncate">{e.descricao}</span>
                      </div>
                      <span className="text-slate-500 flex-shrink-0">{mesesLongos[e.mes - 1]}/{e.ano} Â· {formatCurrency(e.valor)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-100 flex justify-between text-xs font-bold text-emerald-700">
                <span>{form.itens.filter(it => it.valor > 0).length} produto(s) Ã— {form.parcelas}x</span>
                <span>Total: {formatCurrency(allEntries.reduce((s, e) => s + e.valor, 0))}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
          <Button onClick={save} className="flex-1" disabled={form.itens.filter(it => it.valor > 0).length === 0}>
            {editId ? 'Salvar' : allEntries.length > 1 ? `Criar ${allEntries.length} lanÃ§amento(s)` : 'Adicionar'}
          </Button>
        </div>
      </Modal>

      {/* â”€â”€â”€ Modal Registrar Pagamento (distribuiÃ§Ã£o proporcional) â”€â”€â”€â”€â”€â”€ */}
      <Modal open={!!pagarModal} onClose={() => setPagarModal(null)} title="Registrar Pagamento" size="md">
        {pagarModal && (() => {
          const pessoa = pagarModal.pessoaId ? pessoas.find(p => p.id === pagarModal.pessoaId) : null
          return (
            <div className="space-y-4">
              {/* CabeÃ§alho */}
              {pessoa ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {pessoa.nome.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{pessoa.nome}</div>
                    {pessoa.telefone && <div className="text-xs text-slate-400">ðŸ“ž {pessoa.telefone}</div>}
                    <div className="text-xs text-red-500 font-medium mt-0.5">
                      Total em aberto ({mesesLongos[mesAtivo - 1]}): {formatCurrency(totalEmAberto)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="font-semibold text-slate-700">{pagarModal.descricao}</div>
                  <div className="text-sm text-red-500 font-medium">Saldo pendente: {formatCurrency(totalEmAberto)}</div>
                </div>
              )}

              {/* Produtos em aberto */}
              {todosDebitos.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                    Produtos em aberto â€” {mesesLongos[mesAtivo - 1]}
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {todosDebitos.map(d => {
                      const saldo = d.valor - (d.valorRecebido ?? 0)
                      const fonte = d.fonteRendaId ? fonteRendaCategorias.find(f => f.id === d.fonteRendaId) : null
                      const item = distribuicao.find(x => x.d.id === d.id)
                      const cor = item?.novoStatus === 'pago' ? 'border-emerald-300 bg-emerald-50'
                        : item?.novoStatus === 'parcial' ? 'border-amber-300 bg-amber-50'
                        : 'border-slate-200'
                      const pct = totalEmAberto > 0 ? Math.round((saldo / totalEmAberto) * 100) : 0
                      return (
                        <div key={d.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs transition-colors ${cor}`}>
                          {fonte && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: fonte.cor }} />}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-700 truncate">{d.descricao}</div>
                            {fonte && <div className="text-slate-400">{fonte.nome} Â· {pct}% do total</div>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold text-slate-700">{formatCurrency(saldo)}</div>
                            {item && item.aplicar > 0 && (
                              <div className={`font-bold ${item.novoStatus === 'pago' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                â†³ {formatCurrency(item.aplicar)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Valor a pagar */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quanto estÃ¡ pagando agora?</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                  <input type="number" step="0.01" min="0" value={pagarValor || ''}
                    onChange={e => setPagarValor(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2.5 border-2 border-emerald-400 rounded-xl text-lg font-bold text-emerald-700 outline-none focus:border-emerald-500"
                    autoFocus />
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setPagarValor(totalEmAberto)}
                    className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100">
                    Total ({formatCurrency(totalEmAberto)})
                  </button>
                </div>
              </div>

              {/* Preview distribuiÃ§Ã£o proporcional */}
              {pagarValor > 0 && todosDebitos.length > 1 && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs font-semibold text-slate-500 mb-2">
                    DistribuiÃ§Ã£o proporcional ao saldo de cada produto
                  </div>
                  <div className="space-y-1">
                    {distribuicao.map((item, i) => {
                      const fonte = item.d.fonteRendaId ? fonteRendaCategorias.find(f => f.id === item.d.fonteRendaId) : null
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {fonte && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: fonte.cor }} />}
                          <span className="flex-1 text-slate-600 truncate">{item.d.descricao}</span>
                          <span className="text-slate-400">{formatCurrency(item.saldo)}</span>
                          <span className="text-slate-300">â†’</span>
                          <span className={`font-semibold ${item.novoStatus === 'pago' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {formatCurrency(item.aplicar)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-medium ${item.novoStatus === 'pago' ? 'bg-emerald-100 text-emerald-700' : item.novoStatus === 'parcial' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {item.novoStatus === 'pago' ? 'âœ“' : item.novoStatus === 'parcial' ? '~' : '-'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* NotificaÃ§Ã£o: restante / excedente */}
              {pagamentoInfo && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  pagamentoInfo.type === 'restante'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <span className="text-base leading-none flex-shrink-0">
                    {pagamentoInfo.type === 'restante' ? 'â­' : 'ðŸ’°'}
                  </span>
                  <div className="space-y-0.5">
                    {pagamentoInfo.type === 'restante' ? (
                      <>
                        <div className="font-semibold">
                          Restante ({formatCurrency(pagamentoInfo.valor)}) lanÃ§ado em {mesesLongos[pagamentoInfo.nextMes - 1]}/{pagamentoInfo.nextAno}
                        </div>
                        <div className="text-amber-700">
                          SerÃ£o criados lanÃ§amentos no prÃ³ximo mÃªs para cada produto com o saldo nÃ£o pago,
                          identificados como "(restante de {mesesLongos[mesAtivo - 1]}/{anoAtivo})".
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold">
                          Excedente {formatCurrency(pagamentoInfo.valor)}
                          {pagamentoInfo.hasNext
                            ? ` abatido de ${mesesLongos[pagamentoInfo.nextMes - 1]}/${pagamentoInfo.nextAno}`
                            : ` â€” sem parcelas em ${mesesLongos[pagamentoInfo.nextMes - 1]}/${pagamentoInfo.nextAno}`}
                        </div>
                        <div className="text-emerald-700">
                          {pagamentoInfo.hasNext
                            ? `O excedente serÃ¡ aplicado proporcionalmente nas parcelas de ${mesesLongos[pagamentoInfo.nextMes - 1]}/${pagamentoInfo.nextAno}, identificado como "(saldo de ${mesesLongos[mesAtivo - 1]}/${anoAtivo})".`
                            : 'NÃ£o hÃ¡ parcelas no prÃ³ximo mÃªs para abater o excedente. O valor extra ficarÃ¡ apenas no saldo da conta.'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Conta bancÃ¡ria */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Em qual conta recebeu?</label>
                {contasBancarias.length > 0 ? (
                  <div className="space-y-1.5">
                    {contasBancarias.map(cb => (
                      <label key={cb.id} className={`flex items-center gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-colors
                        ${pagarContaId === cb.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" name="pagarConta" value={cb.id} checked={pagarContaId === cb.id}
                          onChange={() => setPagarContaId(cb.id)} />
                        <div className="flex-1">
                          <div className="font-medium text-sm text-slate-700">{cb.nome}</div>
                          <div className="text-xs text-slate-400">{cb.banco} Â· {formatCurrency(cb.saldo)}</div>
                        </div>
                        {pagarContaId === cb.id && pagarValor > 0 && (
                          <span className="text-xs text-emerald-600 font-semibold">
                            â†’ {formatCurrency(cb.saldo + Math.min(pagarValor, totalEmAberto))}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 bg-slate-50 p-3 rounded-lg">
                    Nenhuma conta cadastrada.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setPagarModal(null)} className="flex-1">Cancelar</Button>
                <Button onClick={confirmarPagamento} disabled={pagarValor <= 0} className="flex-1">
                  <CheckCircle size={15} /> Confirmar {pagarValor > 0 ? formatCurrency(Math.min(pagarValor, totalEmAberto)) : ''}
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

