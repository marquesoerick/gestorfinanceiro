import { useMemo } from 'react'
import { TrendingUp, Circle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency, mesesLongos } from '../utils/formatters'
import { getMesRef, getAnoRef } from '../utils/helpers'
import { Card } from '../components/ui/Card'
import { MesNavigator } from '../components/ui/MesNavigator'

export function Rendas() {
  const { fonteRendaCategorias, produtos, contasReceber, mesAtivo, anoAtivo } = useFinanceStore()

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <MesNavigator />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp size={18} className="text-emerald-600" /></div>
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
      </div>

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

      {/* Gráfico evolução */}
      {fonteRendaCategorias.length > 0 && (
        <Card title="Evolução · Últimos 6 meses por Fonte de Renda">
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
