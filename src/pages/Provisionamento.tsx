import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency, formatDate, meses, mesesLongos } from '../utils/formatters'
import { getMesRef, getAnoRef } from '../utils/helpers'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { MesNavigator } from '../components/ui/MesNavigator'
import { TrendingUp, TrendingDown, BarChart3, DollarSign } from 'lucide-react'

export function Provisionamento() {
  const {
    provisionamentos,
    contasPagar,
    contasReceber,
    fonteRendaCategorias,
    mesAtivo,
    anoAtivo,
  } = useFinanceStore()

  // --- helpers para filtrar por mês/ano ---
  const isCurrentPeriod = (vencimento: string, mesRef?: number, anoRef?: number) =>
    getMesRef(vencimento, mesRef) === mesAtivo && getAnoRef(vencimento, anoRef) === anoAtivo

  // --- KPIs ---
  const kpis = useMemo(() => {
    const receitaRealizada = contasReceber
      .filter(c => c.status === 'pago' && isCurrentPeriod(c.vencimento, c.mesReferencia, c.anoReferencia))
      .reduce((s, c) => s + (c.valorRecebido ?? c.valor), 0)

    const despesasTotal = contasPagar
      .filter(c => isCurrentPeriod(c.vencimento, c.mesReferencia, c.anoReferencia))
      .reduce((s, c) => s + c.valor, 0)

    const aReceber = contasReceber
      .filter(c => c.status === 'pendente' && isCurrentPeriod(c.vencimento, c.mesReferencia, c.anoReferencia))
      .reduce((s, c) => s + c.valor, 0)

    return {
      receitaRealizada,
      despesasTotal,
      resultado: receitaRealizada - despesasTotal,
      aReceber,
    }
  }, [contasPagar, contasReceber, mesAtivo, anoAtivo])

  // --- Previsão vs Realizado ---
  const previsionamentoDoMes = useMemo(() =>
    provisionamentos.filter(p => p.mes === mesAtivo && p.ano === anoAtivo)
  , [provisionamentos, mesAtivo, anoAtivo])

  const previsaoRealizado = useMemo(() => {
    const receitaReal = contasReceber
      .filter(c => c.status === 'pago' && isCurrentPeriod(c.vencimento, c.mesReferencia, c.anoReferencia))
      .reduce((s, c) => s + (c.valorRecebido ?? c.valor), 0)

    const despesaReal = contasPagar
      .filter(c => isCurrentPeriod(c.vencimento, c.mesReferencia, c.anoReferencia))
      .reduce((s, c) => s + c.valor, 0)

    const receitaPrevista = provisionamentos
      .filter(p => p.mes === mesAtivo && p.ano === anoAtivo && p.tipo === 'faturamento')
      .reduce((s, p) => s + p.valor, 0)

    const despesaPrevista = provisionamentos
      .filter(p => p.mes === mesAtivo && p.ano === anoAtivo && p.tipo === 'despesa')
      .reduce((s, p) => s + p.valor, 0)

    return { receitaReal, despesaReal, receitaPrevista, despesaPrevista }
  }, [contasPagar, contasReceber, provisionamentos, mesAtivo, anoAtivo])

  // --- Despesas por Grupo ---
  const despesasPorGrupo = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    const contasFiltradas = contasPagar.filter(
      c => isCurrentPeriod(c.vencimento, c.mesReferencia, c.anoReferencia)
    )
    const totalGeral = contasFiltradas.reduce((s, c) => s + c.valor, 0)

    for (const c of contasFiltradas) {
      const grupo = c.grupo || 'outros'
      const entry = map.get(grupo) ?? { count: 0, total: 0 }
      map.set(grupo, { count: entry.count + 1, total: entry.total + c.valor })
    }

    return Array.from(map.entries())
      .map(([grupo, { count, total }]) => ({
        grupo,
        count,
        total,
        pct: totalGeral > 0 ? (total / totalGeral) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [contasPagar, mesAtivo, anoAtivo])

  // --- Receitas por Fonte ---
  const receitasPorFonte = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of contasReceber.filter(
      c => c.status === 'pago' && isCurrentPeriod(c.vencimento, c.mesReferencia, c.anoReferencia)
    )) {
      const key = c.fonteRendaId ?? '__sem_fonte__'
      map.set(key, (map.get(key) ?? 0) + (c.valorRecebido ?? c.valor))
    }

    return Array.from(map.entries())
      .map(([fonteId, total]) => {
        const cat = fonteRendaCategorias.find(f => f.id === fonteId)
        return { nome: cat?.nome ?? 'Sem Fonte', total, cor: cat?.cor }
      })
      .sort((a, b) => b.total - a.total)
  }, [contasReceber, fonteRendaCategorias, mesAtivo, anoAtivo])

  // --- Evolução 6 Meses ---
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const offset = i - 5
      let m = mesAtivo + offset
      let a = anoAtivo
      while (m <= 0) { m += 12; a -= 1 }
      while (m > 12) { m -= 12; a += 1 }

      const receitas = contasReceber
        .filter(c => c.status === 'pago' && getMesRef(c.vencimento, c.mesReferencia) === m && getAnoRef(c.vencimento, c.anoReferencia) === a)
        .reduce((s, c) => s + (c.valorRecebido ?? c.valor), 0)

      const despesas = contasPagar
        .filter(c => getMesRef(c.vencimento, c.mesReferencia) === m && getAnoRef(c.vencimento, c.anoReferencia) === a)
        .reduce((s, c) => s + c.valor, 0)

      return {
        mes: meses[m - 1],
        receitas,
        despesas,
        resultado: receitas - despesas,
      }
    })
  }, [contasPagar, contasReceber, mesAtivo, anoAtivo])

  // --- Contas em Aberto ---
  const contasEmAberto = useMemo(() =>
    contasPagar.filter(
      c => c.status === 'pendente' && isCurrentPeriod(c.vencimento, c.mesReferencia, c.anoReferencia)
    ).sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  , [contasPagar, mesAtivo, anoAtivo])

  const mesLabel = mesesLongos[mesAtivo - 1]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Provisionamento</h1>
          <p className="text-xs text-slate-400 mt-0.5">Relatório financeiro — {mesLabel} {anoAtivo}</p>
        </div>
        <MesNavigator />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp size={15} className="text-emerald-600" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-emerald-700 truncate">{formatCurrency(kpis.receitaRealizada)}</div>
          <div className="text-xs text-slate-400 mt-0.5">Receita do mês</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
              <TrendingDown size={15} className="text-red-600" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-red-700 truncate">{formatCurrency(kpis.despesasTotal)}</div>
          <div className="text-xs text-slate-400 mt-0.5">Despesas do mês</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpis.resultado >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <BarChart3 size={15} className={kpis.resultado >= 0 ? 'text-green-600' : 'text-red-600'} />
            </div>
          </div>
          <div className={`text-base sm:text-xl font-bold truncate ${kpis.resultado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {kpis.resultado >= 0 ? '+' : ''}{formatCurrency(kpis.resultado)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Resultado</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
              <DollarSign size={15} className="text-indigo-600" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-indigo-700 truncate">{formatCurrency(kpis.aReceber)}</div>
          <div className="text-xs text-slate-400 mt-0.5">A receber</div>
        </Card>
      </div>

      {/* Previsão vs Realizado */}
      <Card title="Previsão vs Realizado">
        <div className="p-5 space-y-5">
          {previsionamentoDoMes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição</th>
                    <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Tipo</th>
                    <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Previsto</th>
                    <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Realizado</th>
                    <th className="text-center pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {previsionamentoDoMes.map(p => {
                    const statusColor = p.status === 'realizado'
                      ? 'bg-emerald-100 text-emerald-700'
                      : p.status === 'parcial'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    const statusLabel = p.status === 'realizado' ? 'Realizado' : p.status === 'parcial' ? 'Parcial' : 'Previsto'
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 pr-3">
                          <div className="font-medium text-slate-700">{p.descricao}</div>
                          {p.categoria && <div className="text-xs text-slate-400">{p.categoria}</div>}
                        </td>
                        <td className="py-2.5 pr-3 hidden md:table-cell">
                          <Badge className={p.tipo === 'faturamento' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'}>
                            {p.tipo === 'faturamento' ? 'Receita' : 'Despesa'}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-slate-700">{formatCurrency(p.valor)}</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-600">{formatCurrency(p.realizado)}</td>
                        <td className="py-2.5 text-center hidden sm:table-cell">
                          <Badge className={statusColor}>{statusLabel}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {previsionamentoDoMes.length === 0 && (
            <p className="text-sm text-slate-400 italic">Nenhum provisionamento cadastrado para este período.</p>
          )}

          {/* Totais com barra de progresso */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Receita Real</span>
                <span>{formatCurrency(previsaoRealizado.receitaReal)}</span>
              </div>
              {previsaoRealizado.receitaPrevista > 0 && (
                <>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (previsaoRealizado.receitaReal / previsaoRealizado.receitaPrevista) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Previsto: {formatCurrency(previsaoRealizado.receitaPrevista)} · {previsaoRealizado.receitaPrevista > 0 ? ((previsaoRealizado.receitaReal / previsaoRealizado.receitaPrevista) * 100).toFixed(0) : 0}% realizado
                  </div>
                </>
              )}
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Despesa Real</span>
                <span>{formatCurrency(previsaoRealizado.despesaReal)}</span>
              </div>
              {previsaoRealizado.despesaPrevista > 0 && (
                <>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (previsaoRealizado.despesaReal / previsaoRealizado.despesaPrevista) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Previsto: {formatCurrency(previsaoRealizado.despesaPrevista)} · {previsaoRealizado.despesaPrevista > 0 ? ((previsaoRealizado.despesaReal / previsaoRealizado.despesaPrevista) * 100).toFixed(0) : 0}% realizado
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Despesas por Grupo + Receitas por Fonte */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Despesas por Grupo */}
        <Card title="Despesas por Grupo">
          <div className="p-4 space-y-3">
            {despesasPorGrupo.length === 0 && (
              <p className="text-sm text-slate-400 italic">Nenhuma despesa neste período.</p>
            )}
            {despesasPorGrupo.map(({ grupo, count, total, pct }) => (
              <div key={grupo}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 capitalize">{grupo}</span>
                    <span className="text-xs text-slate-400">({count})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{pct.toFixed(0)}%</span>
                    <span className="text-sm font-semibold text-red-700">{formatCurrency(total)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Receitas por Fonte */}
        <Card title="Receitas por Fonte">
          <div className="p-4 space-y-3">
            {receitasPorFonte.length === 0 && (
              <p className="text-sm text-slate-400 italic">Nenhuma receita recebida neste período.</p>
            )}
            {receitasPorFonte.map(({ nome, total, cor }) => {
              const totalGeral = receitasPorFonte.reduce((s, r) => s + r.total, 0)
              const pct = totalGeral > 0 ? (total / totalGeral) * 100 : 0
              return (
                <div key={nome}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {cor && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />}
                      <span className="text-sm font-medium text-slate-700">{nome}</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-700">{formatCurrency(total)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Evolução 6 Meses */}
      <Card title="Evolução 6 Meses">
        <div className="p-4">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="resultado" name="Resultado" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Contas em Aberto */}
      <Card title="Contas em Aberto" subtitle={`${contasEmAberto.length} conta(s) pendente(s) — ${mesLabel} ${anoAtivo}`}>
        {contasEmAberto.length === 0 ? (
          <div className="p-5 text-sm text-slate-400 italic">Nenhuma conta pendente neste período.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Grupo</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {contasEmAberto.map(c => {
                  const hoje = new Date()
                  hoje.setHours(0, 0, 0, 0)
                  const venc = new Date(c.vencimento + 'T00:00:00')
                  const vencido = venc < hoje
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-700">{c.descricao}</div>
                        {c.fornecedor && <div className="text-xs text-slate-400">{c.fornecedor}</div>}
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <Badge className="bg-slate-100 text-slate-600 capitalize">{c.grupo}</Badge>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs font-medium ${vencido ? 'text-red-600' : 'text-slate-600'}`}>
                          {formatDate(c.vencimento)}
                        </span>
                        {vencido && <div className="text-xs text-red-400">vencida</div>}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatCurrency(c.valor)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={3} className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Total em aberto</td>
                  <td className="px-5 py-2.5 text-right font-bold text-red-700">
                    {formatCurrency(contasEmAberto.reduce((s, c) => s + c.valor, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
