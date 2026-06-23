import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, Filter, Building2, UserPlus, Package, X, ChevronDown } from 'lucide-react'
import { PessoaCombobox } from '../components/ui/PessoaCombobox'
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

// --- Item individual de uma venda -----------------------------------
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

// --- Grupo de entradas por pessoa ------------------------------------
type GrupoPessoa = {
  pessoaId: string
  pessoa: Pessoa | null
  entradas: ContaReceber[]
  total: number
  saldoDevedor: number
  status: 'pago' | 'parcial' | 'pendente' | 'atrasado'
}

// --- Form state ------------------------------------------------------
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
  // Recebimento simples
  valorRecebimento: 0,
  recorrente: false,
  fonteRendaId: '',
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
  const [tipoModal, setTipoModal] = useState<'recebimento' | 'venda'>('recebimento')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroFonte, setFiltroFonte] = useState<string>('todos')

  // --- Expandir/colapsar pessoas ------------------------------------
  const [expandedPessoas, setExpandedPessoas] = useState<Set<string>>(new Set())
  const togglePessoa = (id: string) => setExpandedPessoas(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  // --- Modal de pagamento -------------------------------------------
  const [pagarModal, setPagarModal] = useState<ContaReceber | null>(null)
  const [pagarValor, setPagarValor] = useState(0)
  const [pagarContaId, setPagarContaId] = useState('')

  // --- Tabela e filtros ---------------------------------------------
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

  // --- Agrupar por pessoa -------------------------------------------
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

  // --- Débitos do modal: entradas do mês filtrado para a pessoa ----
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

  // --- Distribuição PROPORCIONAL (por saldo de cada produto) --------
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

  // --- Informação de restante/excedente para próximo mês ----------
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

    // Aplica distribuição proporcional no mês atual
    let totalBanco = 0
    for (const item of distribuicao) {
      if (item.aplicar > 0) {
        addPagamentoRecebido(item.d.id, { data, valor: item.aplicar, contaBancariaId: pagarContaId || undefined })
        totalBanco += item.aplicar
      }
    }

    // PAGOU MENOS: cria lançamentos do restante no próximo mês
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
            observacoes: `Débito não quitado em ${mesNome}/${anoAtivo}`,
          })
        }
      }
    }

    // PAGOU MAIS: abate excedente das parcelas do próximo mês
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

  // --- Quick-add inline: Pessoa -------------------------------------
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

  // --- Quick-add inline: Produto ------------------------------------
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

  // --- Item helpers -------------------------------------------------
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

  // --- KPIs ---------------------------------------------------------
  const totais = useMemo(() => ({
    total: filtered.reduce((s, c) => s + c.valor, 0),
    pendente: filtered.filter(c => c.status === 'pendente').reduce((s, c) => s + c.valor, 0),
    vencido: filtered.filter(c => c.status === 'vencido').reduce((s, c) => s + c.valor, 0),
    recebido: filtered.filter(c => c.status === 'pago').reduce((s, c) => s + (c.valorRecebido ?? c.valor), 0),
  }), [filtered])

  // --- Preview de todos os lançamentos -----------------------------
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

  // --- Abrir modais -------------------------------------------------
  const openNew = (tipo: 'recebimento' | 'venda' = 'recebimento') => {
    const d = new Date()
    setForm({
      ...emptyForm(),
      vencimento: `${anoAtivo}-${String(mesAtivo).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      diaPagamento: d.getDate(),
    })
    setTipoModal(tipo); setErros({})
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
      valorRecebimento: c.valor,
      recorrente: false,
      fonteRendaId: c.fonteRendaId ?? '',
    })
    setTipoModal(c.produtoId ? 'venda' : 'recebimento'); setErros({})
    setEditId(c.id); setQuickPessoa(false); setQuickProduto(false); setModalOpen(true)
  }

  // --- Salvar -------------------------------------------------------
  const save = () => {
    // ── RECEBIMENTO ─────────────────────────────────────────────────
    if (tipoModal === 'recebimento' && !editId) {
      const novosErros: Record<string, string> = {}
      if (!form.pessoaId) novosErros.pessoaId = 'Informe de quem é este recebimento'
      if (!form.valorRecebimento || form.valorRecebimento <= 0) novosErros.valorRecebimento = 'Informe o valor a receber'
      if (!form.vencimento) novosErros.vencimento = 'Informe a data'
      if (!form.fonteRendaId && form.fonte !== 'pessoal') novosErros.fonteRendaId = 'Selecione a conta ou fonte de renda'
      if (Object.keys(novosErros).length > 0) { setErros(novosErros); return }

      const count = form.recorrente && form.parcelas > 1 ? form.parcelas : 1
      const pessoa = pessoas.find(p => p.id === form.pessoaId)
      const desc = pessoa?.nome ?? 'Recebimento'
      const baseDate = new Date(form.vencimento + 'T00:00:00')

      for (let i = 0; i < count; i++) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate())
        addContaReceber({
          descricao: count > 1 ? `${desc} ${String(i + 1).padStart(2, '0')}/${String(count).padStart(2, '0')}` : desc,
          valor: form.valorRecebimento,
          vencimento: d.toISOString().split('T')[0],
          status: 'pendente',
          fonte: form.fonteRendaId ? 'empresa' : form.fonte,
          categoria: 'Recebimento',
          pessoaId: form.pessoaId || undefined,
          fonteRendaId: form.fonteRendaId || undefined,
          mesReferencia: d.getMonth() + 1,
          anoReferencia: d.getFullYear(),
          parcelas: count > 1 ? count : undefined,
          parcelaAtual: count > 1 ? i + 1 : undefined,
          observacoes: form.observacoes || undefined,
        })
      }
      setModalOpen(false)
      return
    }

    // ── VENDA / EDIÇÃO ───────────────────────────────────────────────
    const itensValidos = form.itens.filter(it => it.valor > 0)
    if (!editId) {
      const novosErros: Record<string, string> = {}
      if (!form.pessoaId) novosErros.pessoaId = 'Informe de quem é esta venda'
      if (!form.vencimento) novosErros.vencimento = 'Informe a data'
      if (!itensValidos.length) novosErros.itens = 'Adicione ao menos um item com valor'
      if (Object.keys(novosErros).length > 0) { setErros(novosErros); return }
    }
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
          status: 'pendente', fonte: form.fonte, categoria: form.categoria || 'Venda',
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

  const f = (k: Exclude<keyof FormType, 'itens'>, v: unknown) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setErros(prev => { const n = { ...prev }; delete n[k as string]; return n })
  }

  const pessoaSelecionada = pessoas.find(p => p.id === form.pessoaId)
  const totalItens = form.itens.reduce((s, it) => s + it.valor, 0)

  return (
    <div className="space-y-5">
      {/* Navegação Mensal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MesNavigator />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openNew('recebimento')}><Plus size={14} /> Recebimento</Button>
          <Button onClick={() => openNew('venda')}><Plus size={14} /> Nova Venda</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total do mês', value: totais.total, bar: 'bg-slate-400', text: 'text-slate-800' },
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
          {grupos.comPessoa.length} cliente{grupos.comPessoa.length !== 1 ? 's' : ''} ? {grupos.semPessoa.length} avulso{grupos.semPessoa.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* --- Lista agrupada por pessoa -------------------------------- */}
      <Card>
        {filtered.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <div className="text-4xl mb-2">??</div>
            <div>Nenhum recebimento em {mesesLongos[mesAtivo - 1]} {anoAtivo}</div>
            <button onClick={openNew} className="mt-2 text-emerald-500 text-sm hover:underline">+ Registrar venda</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">

            {/* -- Grupos por pessoa --------------------------------- */}
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
                        {grupo.entradas.length} produto{grupo.entradas.length > 1 ? 's' : ''} neste mês
                        {grupo.pessoa?.telefone && <span className="ml-2">?? {grupo.pessoa.telefone}</span>}
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="text-right mr-3 flex-shrink-0">
                      <div className="font-bold text-slate-700 text-sm">{formatCurrency(grupo.total)}</div>
                      {grupo.saldoDevedor < grupo.total && grupo.saldoDevedor > 0 && (
                        <div className="text-xs text-amber-600">Saldo: {formatCurrency(grupo.saldoDevedor)}</div>
                      )}
                      {grupo.saldoDevedor <= 0 && grupo.status === 'pago' && (
                        <div className="text-xs text-emerald-600">Quitado ?</div>
                      )}
                    </div>

                    <Badge className={statusGrupoColor[grupo.status]}>{statusGrupoLabel[grupo.status]}</Badge>

                    {grupo.status !== 'pago' && (
                      <button
                        onClick={e => { e.stopPropagation(); abrirPagarGrupo(grupo) }}
                        className="p-2.5 rounded-xl hover:bg-emerald-50 text-emerald-600 flex-shrink-0 touch-manipulation"
                        title="Registrar pagamento">
                        <CheckCircle size={18} />
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
                            className={`flex items-center gap-3 pl-3 sm:pl-16 pr-3 sm:pr-5 py-3 border-b border-slate-100 last:border-b-0
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
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-400 touch-manipulation"><Pencil size={14} /></button>
                              <button onClick={() => deleteContaReceber(c.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 touch-manipulation"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* -- Entradas avulsas (sem pessoa) --------------------- */}
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
                      <div className="flex gap-1 flex-shrink-0">
                        {c.status !== 'pago' && (
                          <button onClick={() => abrirPagarModal(c)} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 touch-manipulation"><CheckCircle size={16} /></button>
                        )}
                        <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-400 touch-manipulation"><Pencil size={16} /></button>
                        <button onClick={() => deleteContaReceber(c.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 touch-manipulation"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </Card>

      {/* --- Modal --------------------------------------------------- */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editId ? 'Editar Lançamento' : tipoModal === 'recebimento' ? 'Novo Recebimento' : 'Nova Venda'} size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={save} className="flex-1">
              {editId ? 'Salvar' : tipoModal === 'recebimento'
                ? (form.recorrente && form.parcelas > 1 ? `Criar ${form.parcelas} recebimentos` : 'Registrar recebimento')
                : (allEntries.length > 1 ? `Criar ${allEntries.length} lançamentos` : 'Adicionar venda')}
            </Button>
          </div>
        }>
        <div className="space-y-5">

          {/* ── Toggle Recebimento / Venda ── */}
          {!editId && (
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => { setTipoModal('recebimento'); setErros({}) }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tipoModal === 'recebimento' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>
                Recebimento
              </button>
              <button type="button" onClick={() => { setTipoModal('venda'); setErros({}) }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tipoModal === 'venda' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>
                Venda
              </button>
            </div>
          )}

          {/* ── De quem? (comum aos dois modos) ── */}
          <div>
            <PessoaCombobox
              pessoas={pessoas}
              value={form.pessoaId}
              onChange={id => f('pessoaId', id)}
              label="De quem? *"
              placeholder="Buscar cliente..."
              tipoFiltro={['cliente', 'ambos']}
              onQuickAdd={(nome) => { setQuickPessoa(true); setQuickProduto(false); setQpNome(nome ?? '') }}
              quickAddLabel={quickPessoa ? 'Cancelar' : 'Nova pessoa'}
              error={erros.pessoaId}
            />
            {pessoaSelecionada?.telefone && !quickPessoa && (
              <div className="text-xs text-slate-400 mt-1.5">{pessoaSelecionada.telefone}</div>
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

          {/* ════════════════════ MODO RECEBIMENTO ════════════════════ */}
          {(tipoModal === 'recebimento' || editId) && tipoModal === 'recebimento' && (
            <div className="space-y-4">
              {/* Valor + Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Valor *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                    <input type="number" value={form.valorRecebimento || ''} placeholder="0,00"
                      onChange={e => f('valorRecebimento', parseFloat(e.target.value) || 0)}
                      className={`fi pl-9 w-full font-semibold text-emerald-700 ${erros.valorRecebimento ? 'border-red-400 bg-red-50' : ''}`} />
                  </div>
                  {erros.valorRecebimento && <p className="text-xs text-red-500 mt-1">⚠ {erros.valorRecebimento}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Data *</label>
                  <input type="date" value={form.vencimento} onChange={e => f('vencimento', e.target.value)}
                    className={`fi w-full ${erros.vencimento ? 'border-red-400 bg-red-50' : ''}`} />
                  {erros.vencimento && <p className="text-xs text-red-500 mt-1">⚠ {erros.vencimento}</p>}
                </div>
              </div>

              {/* Recorrência */}
              <button type="button" onClick={() => f('recorrente', !form.recorrente)}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border transition-all text-left
                  ${form.recorrente ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                <div className={`w-10 h-5 rounded-full flex-shrink-0 relative transition-colors ${form.recorrente ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.recorrente ? 'left-5' : 'left-0.5'}`} />
                </div>
                <div className="flex-1">
                  <div className={`text-xs font-bold uppercase tracking-wide ${form.recorrente ? 'text-emerald-700' : 'text-slate-700'}`}>
                    Recorrente (mensal)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {form.recorrente ? `Criará ${form.parcelas} lançamentos mensais` : 'Ativar para recebimentos que repetem todo mês'}
                  </div>
                </div>
              </button>
              {form.recorrente && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Quantas vezes?</label>
                  <input type="number" min="2" max="120" value={form.parcelas}
                    onChange={e => f('parcelas', Math.max(2, parseInt(e.target.value) || 2))}
                    className="fi w-full" placeholder="Ex: 12 (1 ano)" />
                </div>
              )}

              {/* Conta / Fonte de Renda */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Conta / Fonte de Renda *</label>
                <select
                  value={form.fonteRendaId || form.fonte}
                  onChange={e => {
                    const val = e.target.value
                    if (val === 'pessoal' || val === 'empresa') { f('fonte', val as FonteRenda); f('fonteRendaId', '') }
                    else { f('fonte', 'empresa'); f('fonteRendaId', val) }
                  }}
                  className={`fi w-full ${erros.fonteRendaId ? 'border-red-400 bg-red-50' : ''}`}>
                  <option value="pessoal">Pessoal</option>
                  {fonteRendaCategorias.filter(fc => fc.ativa).length > 0
                    ? fonteRendaCategorias.filter(fc => fc.ativa).map(fc => (
                        <option key={fc.id} value={fc.id}>{fc.nome}</option>
                      ))
                    : <option value="empresa">Empresa</option>
                  }
                </select>
                {erros.fonteRendaId && <p className="text-xs text-red-500 mt-1">⚠ {erros.fonteRendaId}</p>}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => f('observacoes', e.target.value)}
                  rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 resize-none" />
              </div>
            </div>
          )}

          {/* ════════════════════ MODO VENDA ══════════════════════════ */}
          {(tipoModal === 'venda' || editId) && tipoModal !== 'recebimento' && (
            <div className="space-y-4">
              {/* Itens da venda */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Itens da venda *
                    {form.itens.filter(it => it.valor > 0).length > 0 && (
                      <span className="ml-2 font-normal text-slate-400 normal-case">
                        ({form.itens.filter(it => it.valor > 0).length} item · {formatCurrency(totalItens)})
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
                {erros.itens && <p className="text-xs text-red-500 mb-2">⚠ {erros.itens}</p>}

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
                        <option value="">Selecione a fonte</option>
                        {fonteRendaCategorias.filter(f => f.ativa).map(f => (
                          <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                      </select>
                      <input type="number" value={qprPreco} onChange={e => setQprPreco(parseFloat(e.target.value) || '')}
                        placeholder="Preço base"
                        className="border border-indigo-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-400 bg-white" />
                    </div>
                    <button type="button" onClick={salvarQuickProduto} disabled={!qprNome.trim() || !qprFonteId}
                      className="w-full py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                      Cadastrar e adicionar à venda
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
                              <option value="">Selecione o produto</option>
                              {produtos.filter(p => p.ativo).map(p => {
                                const f = fonteRendaCategorias.find(f => f.id === p.fonteRendaId)
                                return <option key={p.id} value={p.id}>{p.nome}{f ? ` · ${f.nome}` : ''}</option>
                              })}
                            </select>
                            <div className="flex gap-2">
                              <input value={item.descricao} onChange={e => updateItemVenda(idx, 'descricao', e.target.value)}
                                placeholder={prod?.nome ?? 'Descrição (opcional)'}
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
                                <option value="">Selecione a fonte de renda</option>
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
                    <span className="text-sm font-bold text-slate-700">Total: {formatCurrency(totalItens)}</span>
                  </div>
                )}
              </div>

              {/* Data + Parcelas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Data *</label>
                  <input type="date" value={form.vencimento} onChange={e => f('vencimento', e.target.value)}
                    className={`fi w-full ${erros.vencimento ? 'border-red-400 bg-red-50' : ''}`} />
                  {erros.vencimento && <p className="text-xs text-red-500 mt-1">⚠ {erros.vencimento}</p>}
                </div>
                {!editId && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Parcelas</label>
                    <input type="number" min="1" max="120" value={form.parcelas}
                      onChange={e => f('parcelas', Math.max(1, parseInt(e.target.value) || 1))}
                      className="fi w-full" />
                  </div>
                )}
                {!editId && form.parcelas > 1 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Todo dia</label>
                    <input type="number" min="1" max="28" value={form.diaPagamento}
                      onChange={e => f('diaPagamento', Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="fi w-full" />
                  </div>
                )}
                {editId && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                    <select value={form.status} onChange={e => f('status', e.target.value as StatusConta)} className="fi">
                      {(['pendente', 'pago', 'vencido', 'parcial'] as StatusConta[]).map(s => (
                        <option key={s} value={s}>{statusLabel[s]}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => f('observacoes', e.target.value)}
                  rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 resize-none" />
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                    <CheckCircle size={12} />
                    {allEntries.length} lançamento(s) serão criados
                    {form.parcelas > 1 && <> · todo dia {form.diaPagamento} · {form.parcelas}x</>}
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
                          <span className="text-slate-500 flex-shrink-0">{mesesLongos[e.mes - 1]}/{e.ano} · {formatCurrency(e.valor)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t border-emerald-100 flex justify-between text-xs font-bold text-emerald-700">
                    <span>{form.itens.filter(it => it.valor > 0).length} produto(s) · {form.parcelas}x</span>
                    <span>Total: {formatCurrency(allEntries.reduce((s, e) => s + e.valor, 0))}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* --- Modal Registrar Pagamento (distribuição proporcional) ------ */}
      <Modal open={!!pagarModal} onClose={() => setPagarModal(null)} title="Registrar Pagamento" size="md">
        {pagarModal && (() => {
          const pessoa = pagarModal.pessoaId ? pessoas.find(p => p.id === pagarModal.pessoaId) : null
          return (
            <div className="space-y-4">
              {/* Cabeçalho */}
              {pessoa ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {pessoa.nome.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{pessoa.nome}</div>
                    {pessoa.telefone && <div className="text-xs text-slate-400">?? {pessoa.telefone}</div>}
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
                    Produtos em aberto — {mesesLongos[mesAtivo - 1]}
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
                            {fonte && <div className="text-slate-400">{fonte.nome} ? {pct}% do total</div>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold text-slate-700">{formatCurrency(saldo)}</div>
                            {item && item.aplicar > 0 && (
                              <div className={`font-bold ${item.novoStatus === 'pago' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                ? {formatCurrency(item.aplicar)}
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quanto está pagando agora?</label>
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

              {/* Preview distribuição proporcional */}
              {pagarValor > 0 && todosDebitos.length > 1 && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs font-semibold text-slate-500 mb-2">
                    Distribuição proporcional ao saldo de cada produto
                  </div>
                  <div className="space-y-1">
                    {distribuicao.map((item, i) => {
                      const fonte = item.d.fonteRendaId ? fonteRendaCategorias.find(f => f.id === item.d.fonteRendaId) : null
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {fonte && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: fonte.cor }} />}
                          <span className="flex-1 text-slate-600 truncate">{item.d.descricao}</span>
                          <span className="text-slate-400">{formatCurrency(item.saldo)}</span>
                          <span className="text-slate-300">?</span>
                          <span className={`font-semibold ${item.novoStatus === 'pago' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {formatCurrency(item.aplicar)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-medium ${item.novoStatus === 'pago' ? 'bg-emerald-100 text-emerald-700' : item.novoStatus === 'parcial' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {item.novoStatus === 'pago' ? '?' : item.novoStatus === 'parcial' ? '~' : '-'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Notificação: restante / excedente */}
              {pagamentoInfo && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  pagamentoInfo.type === 'restante'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <span className="text-base leading-none flex-shrink-0">
                    {pagamentoInfo.type === 'restante' ? '⚠️' : '✅'}
                  </span>
                  <div className="space-y-0.5">
                    {pagamentoInfo.type === 'restante' ? (
                      <>
                        <div className="font-semibold">
                          Restante ({formatCurrency(pagamentoInfo.valor)}) lançado em {mesesLongos[pagamentoInfo.nextMes - 1]}/{pagamentoInfo.nextAno}
                        </div>
                        <div className="text-amber-700">
                          Serão criados lançamentos no próximo mês para cada produto com o saldo não pago,
                          identificados como "(restante de {mesesLongos[mesAtivo - 1]}/{anoAtivo})".
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold">
                          Excedente {formatCurrency(pagamentoInfo.valor)}
                          {pagamentoInfo.hasNext
                            ? ` abatido de ${mesesLongos[pagamentoInfo.nextMes - 1]}/${pagamentoInfo.nextAno}`
                            : ` — sem parcelas em ${mesesLongos[pagamentoInfo.nextMes - 1]}/${pagamentoInfo.nextAno}`}
                        </div>
                        <div className="text-emerald-700">
                          {pagamentoInfo.hasNext
                            ? `O excedente ser? aplicado proporcionalmente nas parcelas de ${mesesLongos[pagamentoInfo.nextMes - 1]}/${pagamentoInfo.nextAno}, identificado como "(saldo de ${mesesLongos[mesAtivo - 1]}/${anoAtivo})".`
                            : 'Não há parcelas no próximo mês para abater o excedente. O valor extra ficará apenas no saldo da conta.'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Conta bancária */}
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
                          <div className="text-xs text-slate-400">{cb.banco} · {formatCurrency(cb.saldo)}</div>
                        </div>
                        {pagarContaId === cb.id && pagarValor > 0 && (
                          <span className="text-xs text-emerald-600 font-semibold">
                            ? {formatCurrency(cb.saldo + Math.min(pagarValor, totalEmAberto))}
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

