import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '../utils/helpers'
import { getMesRef, getAnoRef } from '../utils/helpers'
import type {
  FinanceStore, PagamentoDivida, AportePlanejamento,
  ContaPagar, MesFechado, StatusConta, OrigemConta
} from '../types'

const hoje = new Date()
const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// Persist key dinâmica por usuário — lida antes do React montar
const getDataKey = (): string => {
  try {
    const raw = localStorage.getItem('gestor-auth-v1')
    if (!raw) return 'gestor-financeiro-v2'
    const userId = (JSON.parse(raw) as { state: { currentUserId: string | null } }).state?.currentUserId
    return userId ? `gestor-data-${userId}` : 'gestor-financeiro-v2'
  } catch { return 'gestor-financeiro-v2' }
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set) => ({
      contasPagar: [],
      contasReceber: [],
      transacoesBancarias: [],
      dividas: [],
      planejamentos: [],
      fontesRenda: [],
      fonteRendaCategorias: [],
      produtos: [],
      pessoas: [],
      provisionamentos: [],
      contasBancarias: [],
      mesesFechados: [],
      mesAtivo: hoje.getMonth() + 1,
      anoAtivo: hoje.getFullYear(),

      addContaPagar: (c) => set((s) => ({ contasPagar: [...s.contasPagar, { ...c, id: uid() }] })),
      updateContaPagar: (id, c) => set((s) => ({ contasPagar: s.contasPagar.map(x => x.id === id ? { ...x, ...c } : x) })),
      deleteContaPagar: (id) => set((s) => ({ contasPagar: s.contasPagar.filter(x => x.id !== id) })),

      addContaReceber: (c) => set((s) => ({ contasReceber: [...s.contasReceber, { ...c, id: uid() }] })),
      updateContaReceber: (id, c) => set((s) => ({ contasReceber: s.contasReceber.map(x => x.id === id ? { ...x, ...c } : x) })),
      deleteContaReceber: (id) => set((s) => ({ contasReceber: s.contasReceber.filter(x => x.id !== id) })),
      addPagamentoRecebido: (contaId, pagamento) => set((s) => ({
        contasReceber: s.contasReceber.map(c => {
          if (c.id !== contaId) return c
          const pagamentos = [...(c.pagamentosRecebidos ?? []), { ...pagamento, id: uid() }]
          const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0)
          const novoStatus: StatusConta = totalPago >= c.valor ? 'pago' : totalPago > 0 ? 'parcial' : 'pendente'
          return {
            ...c,
            pagamentosRecebidos: pagamentos,
            valorRecebido: totalPago,
            status: novoStatus,
            dataRecebimento: novoStatus === 'pago' ? (c.dataRecebimento ?? pagamento.data) : undefined,
          }
        })
      })),

      addPessoa: (p) => set((s) => ({ pessoas: [...s.pessoas, { ...p, id: uid() }] })),
      updatePessoa: (id, p) => set((s) => ({ pessoas: s.pessoas.map(x => x.id === id ? { ...x, ...p } : x) })),
      deletePessoa: (id) => set((s) => ({ pessoas: s.pessoas.filter(x => x.id !== id) })),

      addFonteRendaCategoria: (f) => set((s) => ({ fonteRendaCategorias: [...s.fonteRendaCategorias, { ...f, id: uid() }] })),
      updateFonteRendaCategoria: (id, f) => set((s) => ({ fonteRendaCategorias: s.fonteRendaCategorias.map(x => x.id === id ? { ...x, ...f } : x) })),
      deleteFonteRendaCategoria: (id) => set((s) => ({ fonteRendaCategorias: s.fonteRendaCategorias.filter(x => x.id !== id) })),

      addProduto: (p) => set((s) => ({ produtos: [...s.produtos, { ...p, id: uid() }] })),
      updateProduto: (id, p) => set((s) => ({ produtos: s.produtos.map(x => x.id === id ? { ...x, ...p } : x) })),
      deleteProduto: (id) => set((s) => ({ produtos: s.produtos.filter(x => x.id !== id) })),

      addTransacao: (t) => set((s) => ({ transacoesBancarias: [...s.transacoesBancarias, { ...t, id: uid() }] })),
      updateTransacao: (id, t) => set((s) => ({ transacoesBancarias: s.transacoesBancarias.map(x => x.id === id ? { ...x, ...t } : x) })),
      deleteTransacao: (id) => set((s) => ({ transacoesBancarias: s.transacoesBancarias.filter(x => x.id !== id) })),

      addDivida: (d) => set((s) => ({ dividas: [...s.dividas, { ...d, id: uid() }] })),
      updateDivida: (id, d) => set((s) => ({ dividas: s.dividas.map(x => x.id === id ? { ...x, ...d } : x) })),
      deleteDivida: (id) => set((s) => ({ dividas: s.dividas.filter(x => x.id !== id) })),
      addPagamentoDivida: (dividaId, pagamento) => set((s) => ({
        dividas: s.dividas.map(d => {
          if (d.id !== dividaId) return d
          const p: PagamentoDivida = { ...pagamento, id: uid() }
          return {
            ...d,
            valorAtual: Math.max(0, d.valorAtual - pagamento.valor),
            parcelaAtual: d.parcelaAtual + 1,
            historicoPagamentos: [...d.historicoPagamentos, p]
          }
        })
      })),

      addPlanejamento: (p) => set((s) => ({ planejamentos: [...s.planejamentos, { ...p, id: uid() }] })),
      updatePlanejamento: (id, p) => set((s) => ({ planejamentos: s.planejamentos.map(x => x.id === id ? { ...x, ...p } : x) })),
      deletePlanejamento: (id) => set((s) => ({ planejamentos: s.planejamentos.filter(x => x.id !== id) })),
      addAportePlanejamento: (planejamentoId, aporte) => set((s) => ({
        planejamentos: s.planejamentos.map(p => {
          if (p.id !== planejamentoId) return p
          const a: AportePlanejamento = { ...aporte, id: uid() }
          return { ...p, valorAtual: p.valorAtual + aporte.valor, historico: [...p.historico, a] }
        })
      })),

      addFonteRenda: (f) => set((s) => ({ fontesRenda: [...s.fontesRenda, { ...f, id: uid() }] })),
      updateFonteRenda: (id, f) => set((s) => ({ fontesRenda: s.fontesRenda.map(x => x.id === id ? { ...x, ...f } : x) })),
      deleteFonteRenda: (id) => set((s) => ({ fontesRenda: s.fontesRenda.filter(x => x.id !== id) })),

      addProvisionamento: (p) => set((s) => ({ provisionamentos: [...s.provisionamentos, { ...p, id: uid() }] })),
      updateProvisionamento: (id, p) => set((s) => ({ provisionamentos: s.provisionamentos.map(x => x.id === id ? { ...x, ...p } : x) })),
      deleteProvisionamento: (id) => set((s) => ({ provisionamentos: s.provisionamentos.filter(x => x.id !== id) })),

      addContaBancaria: (c) => set((s) => ({ contasBancarias: [...s.contasBancarias, { ...c, id: uid() }] })),
      updateContaBancaria: (id, c) => set((s) => ({ contasBancarias: s.contasBancarias.map(x => x.id === id ? { ...x, ...c } : x) })),
      deleteContaBancaria: (id) => set((s) => ({ contasBancarias: s.contasBancarias.filter(x => x.id !== id) })),

      setMesAtivo: (mes, ano) => set({ mesAtivo: mes, anoAtivo: ano }),

      fecharMes: (mes, ano) => set((s) => {
        const contasDoMes = s.contasPagar.filter(c =>
          getMesRef(c.vencimento, c.mesReferencia) === mes &&
          getAnoRef(c.vencimento, c.anoReferencia) === ano
        )
        const contasPendentes = contasDoMes.filter(c => c.status === 'pendente' || c.status === 'vencido')
        const contasRecorrentesQuitadas = contasDoMes.filter(c => c.recorrente && c.status === 'pago')

        const nextMes = mes === 12 ? 1 : mes + 1
        const nextAno = mes === 12 ? ano + 1 : ano

        // Ids já existentes no próximo mês para evitar duplicatas de recorrentes
        const existentesNextMes = new Set(
          s.contasPagar
            .filter(c => getMesRef(c.vencimento, c.mesReferencia) === nextMes && getAnoRef(c.vencimento, c.anoReferencia) === nextAno)
            .map(c => c.origemId)
            .filter(Boolean)
        )

        const carryoverEntries: ContaPagar[] = contasPendentes.map(c => {
          const oldDate = new Date(c.vencimento + 'T00:00:00')
          const newDate = new Date(nextAno, nextMes - 1, Math.min(oldDate.getDate(), 28))
          return {
            ...c,
            id: uid(),
            mesReferencia: nextMes,
            anoReferencia: nextAno,
            vencimento: newDate.toISOString().split('T')[0],
            status: 'pendente' as StatusConta,
            origem: 'carryover' as OrigemConta,
            origemId: c.id,
            dataPagamento: undefined,
            valorPago: undefined,
            observacoes: `Pendência carregada de ${mesesNomes[mes - 1]}/${ano}${c.observacoes ? ' · ' + c.observacoes : ''}`
          }
        })

        const recorrenteEntries: ContaPagar[] = contasRecorrentesQuitadas
          .filter(c => !existentesNextMes.has(c.id))
          .map(c => {
            const oldDate = new Date(c.vencimento + 'T00:00:00')
            const newDate = new Date(nextAno, nextMes - 1, Math.min(oldDate.getDate(), 28))
            return {
              ...c,
              id: uid(),
              mesReferencia: nextMes,
              anoReferencia: nextAno,
              vencimento: newDate.toISOString().split('T')[0],
              status: 'pendente' as StatusConta,
              origem: 'recorrente' as OrigemConta,
              origemId: c.id,
              dataPagamento: undefined,
              valorPago: undefined,
            }
          })

        const mesFechado: MesFechado = {
          id: uid(),
          mes, ano,
          fechadoEm: new Date().toISOString(),
          totalPendente: contasPendentes.reduce((sum, c) => sum + c.valor, 0),
          contasCarryover: contasPendentes.length + recorrenteEntries.length
        }

        return {
          contasPagar: [...s.contasPagar, ...carryoverEntries, ...recorrenteEntries],
          mesesFechados: [...s.mesesFechados.filter(m => !(m.mes === mes && m.ano === ano)), mesFechado],
          mesAtivo: nextMes,
          anoAtivo: nextAno
        }
      }),

      reabrirMes: (mes, ano) => set((s) => {
        const billIds = new Set(
          s.contasPagar
            .filter(c => getMesRef(c.vencimento, c.mesReferencia) === mes && getAnoRef(c.vencimento, c.anoReferencia) === ano)
            .map(c => c.id)
        )
        const toRemove = new Set(
          s.contasPagar
            .filter(c => c.origem === 'carryover' && c.origemId && billIds.has(c.origemId))
            .map(c => c.id)
        )
        return {
          contasPagar: s.contasPagar.filter(c => !toRemove.has(c.id)),
          mesesFechados: s.mesesFechados.filter(m => !(m.mes === mes && m.ano === ano)),
          mesAtivo: mes,
          anoAtivo: ano,
        }
      }),
    }),
    { name: getDataKey() }
  )
)
