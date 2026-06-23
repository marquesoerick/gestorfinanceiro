import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Circle, Award } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency, mesesLongos } from '../utils/formatters'
import { getMesRef, getAnoRef } from '../utils/helpers'
import { Card } from '../components/ui/Card'
import { MesNavigator } from '../components/ui/MesNavigator'

export function Rendas() {
  const {
    fonteRendaCategorias,
    produtos,
    contasReceber,
    contasPagar,
    mesAtivo,
    anoAtivo,
    pessoas,
  } = useFinanceStore()

  // ── Existing memo: receitas do mês por fonte ──────────────────────────────
  const relatorioMes = useMemo(() => {
    const recebidosMes = contasReceber.filter(c =>
      c.status === 'pago' &&
      getMesRef(c.vencimento, c.mesReferencia) === mesAtivo &&
      getAnoRef(c.vencimento, c.anoReferencia) === anoAtivo
    )
    const porFonte: Record<string, { total: number; qtd: number; nome: string; cor: string }> = {}
    for (const c of recebidosMes) {
      const fonteId = c.fonteRendaId
        ?? (c.produtoId ? produtos.find(p => p.id === c.produtoId)?.fonteRendaId : undefined)
      const key = fonteId ?? '__sem__'
      const fonte = fonteId ? fonteRendaCategorias.find(f => f.id === fonteId) : null
      if (!porFonte[key]) porFonte[key] = { total: 0, qtd: 0, nome: fonte?.nome ?? 'Sem Fonte', cor: fonte?.cor ?? '#94a3b8' }
      porFonte[key].total += c.valorRecebido ?? c.valor
      porFonte[key].qtd++
    }
    return Object.values(porFonte).sort((a, b) => b.total - a.total)
  }, [contasReceber, mesAtivo, anoAtivo, fonteRendaCategorias, produtos])

  const totalMes = useMemo(() => relatorioMes.reduce((s, r) => s + r.total, 0), [relatorioMes])

  // ── Existing memo: evolução 6 meses ──────────────────────────────────────
  const evolucao6Meses = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(anoAtivo, mesAtivo - 1 - (5 - i), 1)
      const mes = d.getMonth() + 1
      const ano = d.getFullYear()
      const recebidos = contasReceber.filter(c =>
        c.status === 'pago' &&
        getMesRef(c.vencimento, c.mesReferencia) === mes &&
        getAnoRef(c.vencimento, c.anoReferencia) === ano
      )
      const entry: Record<string, number | string> = { mes: mesesLongos[mes - 1].slice(0, 3) }
      for (const f of fonteRendaCategorias) {
        entry[f.nome] = recebidos
          .filter(c => {
            const fid = c.fonteRendaId ?? (c.produtoId ? produtos.find(p => p.id === c.produtoId)?.fonteRendaId : undefined)
            return fid === f.id
          })
          .reduce((s, c) => s + (c.valorRecebido ?? c.valor), 0)
      }
      return entry
    })
  }, [contasReceber, mesAtivo, anoAtivo, fonteRendaCategorias, produtos])

  // ── NEW: total investido no mês (contasPagar com fonteRendaId) ───────────
  const totalInvestidoMes = useMemo(() => {
    return contasPagar
      .filter(c =>
        c.fonteRendaId &&
        getMesRef(c.vencimento, c.mesReferencia) === mesAtivo &&
        getAnoRef(c.vencimento, c.anoReferencia) === anoAtivo
      )
      .reduce((s, c) => s + c.valor, 0)
  }, [contasPagar, mesAtivo, anoAtivo])

  // ── NEW: ROI por fonte ────────────────────────────────────────────────────
  const roiPorFonte = useMemo(() => {
    // helper: filter contasReceber for a given fonteId in active month
    const receitaFonte = (fonteId: string | null) =>
      contasReceber
        .filter(c => {
          const fid = c.fonteRendaId
            ?? (c.produtoId ? produtos.find(p => p.id === c.produtoId)?.fonteRendaId : undefined)
          const matchFonte = fonteId === null ? !fid : fid === fonteId
          return (
            c.status === 'pago' &&
            getMesRef(c.vencimento, c.mesReferencia) === mesAtivo &&
            getAnoRef(c.vencimento, c.anoReferencia) === anoAtivo &&
            matchFonte
          )
        })
        .reduce((s, c) => s + (c.valorRecebido ?? c.valor), 0)

    const custosFonte = (fonteId: string | null) =>
      contasPagar
        .filter(c => {
          const matchFonte = fonteId === null ? !c.fonteRendaId : c.fonteRendaId === fonteId
          return (
            getMesRef(c.vencimento, c.mesReferencia) === mesAtivo &&
            getAnoRef(c.vencimento, c.anoReferencia) === anoAtivo &&
            matchFonte
          )
        })
        .reduce((s, c) => s + c.valor, 0)

    const cards = fonteRendaCategorias
      .filter(f => f.ativa)
      .map(f => {
        const receita = receitaFonte(f.id)
        const custos = custosFonte(f.id)
        const resultado = receita - custos
        const roi = custos > 0 ? (resultado / custos) * 100 : receita > 0 ? Infinity : 0
        return { id: f.id, nome: f.nome, cor: f.cor, receita, custos, resultado, roi }
      })

    // "Sem Fonte" card — only show if there are contasReceber without fonteRendaId
    const receitaSem = receitaFonte(null)
    const custosSem = custosFonte(null)
    if (receitaSem > 0 || custosSem > 0) {
      const resultado = receitaSem - custosSem
      const roi = custosSem > 0 ? (resultado / custosSem) * 100 : receitaSem > 0 ? Infinity : 0
      cards.push({
        id: '__sem__',
        nome: 'Pessoal / Sem vínculo',
        cor: '#94a3b8',
        receita: receitaSem,
        custos: custosSem,
        resultado,
        roi,
      })
    }

    return cards
  }, [contasReceber, contasPagar, mesAtivo, anoAtivo, fonteRendaCategorias, produtos])

  // ── NEW: Top clientes do mês ──────────────────────────────────────────────
  const topClientes = useMemo(() => {
    const recebidosMes = contasReceber.filter(c =>
      c.status === 'pago' &&
      getMesRef(c.vencimento, c.mesReferencia) === mesAtivo &&
      getAnoRef(c.vencimento, c.anoReferencia) === anoAtivo
    )
    const agrupado: Record<string, number> = {}
    for (const c of recebidosMes) {
      const key = c.pessoaId ?? '__avulso__'
      agrupado[key] = (agrupado[key] ?? 0) + (c.valorRecebido ?? c.valor)
    }
    return Object.entries(agrupado)
      .map(([pessoaId, total]) => {
        const pessoa = pessoas.find(p => p.id === pessoaId)
        return { pessoaId, nome: pessoa?.nome ?? 'Avulso', total }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [contasReceber, mesAtivo, anoAtivo, pessoas])

  // ── ROI badge helpers ─────────────────────────────────────────────────────
  const roiBadgeClass = (roi: number) => {
    if (roi > 0) return 'bg-emerald-100 text-emerald-700'
    if (roi < 0) return 'bg-red-100 text-red-700'
    return 'bg-slate-100 text-slate-500'
  }

  const roiLabel = (roi: number) => {
    if (!isFinite(roi)) return '100% margem'
    return `${roi.toFixed(0)}%`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <MesNavigator />
      </div>

      {/* KPIs — 2 cols mobile, 4 cols large */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp size={18} className="text-emerald-600" />
            </div>
            <div className="text-xs text-slate-400">Total Recebido · {mesesLongos[mesAtivo - 1]}</div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalMes)}</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400 mb-1">Fontes ativas</div>
          <div className="text-2xl font-bold text-slate-800">{fonteRendaCategorias.filter(f => f.ativa).length}</div>
          <div className="text-xs text-slate-400">{produtos.filter(p => p.ativo).length} produto(s)</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400 mb-1">Recebimentos no mês</div>
          <div className="text-2xl font-bold text-indigo-600">{relatorioMes.reduce((s, r) => s + r.qtd, 0)}</div>
          <div className="text-xs text-slate-400">confirmados</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown size={18} className="text-red-500" />
            </div>
            <div className="text-xs text-slate-400">Total Investido · {mesesLongos[mesAtivo - 1]}</div>
          </div>
          <div className="text-2xl font-bold text-red-500">{formatCurrency(totalInvestidoMes)}</div>
        </Card>
      </div>

      {/* ROI por Fonte */}
      {roiPorFonte.length > 0 && (
        <Card title="Resultado por Fonte de Renda">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {roiPorFonte.map(f => {
              const maxBar = Math.max(f.receita, f.custos)
              const receitaPct = maxBar > 0 ? (f.receita / maxBar) * 100 : 0
              const custosPct = maxBar > 0 ? (f.custos / maxBar) * 100 : 0
              return (
                <div
                  key={f.id}
                  className="border border-slate-100 rounded-xl p-4 space-y-3 bg-white shadow-sm"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: f.cor }} />
                      <span className="font-semibold text-sm text-slate-700">{f.nome}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roiBadgeClass(f.roi)}`}>
                      {f.roi > 0 ? '+' : ''}{roiLabel(f.roi)} ROI
                    </span>
                  </div>

                  {/* Receita / Custos */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-400 mb-0.5">Receita</div>
                      <div className="font-semibold text-emerald-600">{formatCurrency(f.receita)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Custos</div>
                      <div className="font-semibold text-red-500">{formatCurrency(f.custos)}</div>
                    </div>
                  </div>

                  {/* Resultado */}
                  <div className="text-sm font-bold">
                    <span className={f.resultado >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                      {f.resultado >= 0 ? '+' : ''}{formatCurrency(f.resultado)}
                    </span>
                    <span className="text-xs text-slate-400 font-normal ml-1">resultado</span>
                  </div>

                  {/* Progress bar: receita vs custos */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="text-xs text-slate-400 w-12 shrink-0">Receita</div>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all"
                          style={{ width: `${receitaPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-xs text-slate-400 w-12 shrink-0">Custos</div>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full transition-all"
                          style={{ width: `${custosPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Relatório do mês */}
        <Card title={`Receitas por Fonte · ${mesesLongos[mesAtivo - 1]} ${anoAtivo}`}>
          {relatorioMes.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <div className="text-3xl mb-2">📊</div>
              <div>Nenhum recebimento confirmado este mês</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {relatorioMes.map((r, i) => {
                const pct = totalMes > 0 ? (r.total / totalMes) * 100 : 0
                return (
                  <div key={i} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.cor }} />
                        {r.nome}
                        <span className="text-xs text-slate-400 font-normal">{r.qtd}x</span>
                      </div>
                      <span className="font-semibold text-emerald-600 text-sm">{formatCurrency(r.total)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: r.cor }} />
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{pct.toFixed(1)}% do total</div>
                  </div>
                )
              })}
              <div className="px-5 py-3 bg-slate-50 flex justify-between text-sm font-semibold">
                <span className="text-slate-600">Total</span>
                <span className="text-emerald-600">{formatCurrency(totalMes)}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Produtos por fonte */}
        <Card title="Produtos por Fonte de Renda">
          {fonteRendaCategorias.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <div className="text-2xl mb-2">💡</div>
              <div className="text-sm">Cadastre fontes de renda e produtos em</div>
              <div className="text-sm font-medium text-slate-600">Configurações → Fontes / Produtos</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {fonteRendaCategorias.filter(f => f.ativa).map(f => {
                const prods = produtos.filter(p => p.fonteRendaId === f.id && p.ativo)
                return (
                  <div key={f.id} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: f.cor }} />
                      <span className="font-semibold text-sm text-slate-700">{f.nome}</span>
                      <span className="text-xs text-slate-400">{prods.length} produto(s)</span>
                    </div>
                    {prods.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 ml-5">
                        {prods.map(p => (
                          <span key={p.id} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {p.nome}{p.precoBase ? ` · ${formatCurrency(p.precoBase)}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Top Clientes do Mês */}
      {topClientes.length > 0 && (
        <Card title="Top Clientes do Mês">
          <div className="divide-y divide-slate-50">
            {topClientes.map((c, i) => (
              <div key={c.pessoaId} className="px-5 py-3 flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Award size={14} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-700 truncate">{c.nome}</span>
                </div>
                <span className="font-semibold text-emerald-600 text-sm">{formatCurrency(c.total)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Gráfico evolução — renamed title */}
      {fonteRendaCategorias.length > 0 && (
        <Card title="Receitas por Fonte · Últimos 6 meses">
          <div className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={evolucao6Meses} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `R$${((v as number) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => formatCurrency(v as number)} />
                {fonteRendaCategorias.filter(f => f.ativa).map(f => (
                  <Bar key={f.id} dataKey={f.nome} fill={f.cor} radius={[3, 3, 0, 0]} stackId="a" />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {fonteRendaCategorias.filter(f => f.ativa).map(f => (
                <div key={f.id} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Circle size={8} fill={f.cor} color={f.cor} />
                  {f.nome}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
