import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, Wallet,
  Target, Building2, AlertTriangle, ChevronRight, Clock, ArrowRight
} from 'lucide-react'
import { useFinanceStore } from '../store/useFinanceStore'
import { formatCurrency, meses, grupoLabel } from '../utils/formatters'
import { Card, StatCard } from '../components/ui/Card'
import { Link } from 'react-router-dom'

const COLORS = ['#10b981', '#6366f1', '#f97316', '#ec4899', '#0ea5e9', '#8b5cf6', '#f59e0b', '#84cc16']


export function Dashboard() {
  const {
    contasPagar, contasReceber, dividas, planejamentos,
    fontesRenda, fonteRendaCategorias, contasBancarias, pessoas,
  } = useFinanceStore()

  const saldoTotal   = useMemo(() => contasBancarias.filter(c => c.ativa).reduce((s, c) => s + c.saldo, 0), [contasBancarias])
  const totalPagar   = useMemo(() => contasPagar.filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((s, c) => s + c.valor, 0), [contasPagar])
  const totalReceber = useMemo(() => contasReceber.filter(c => c.status !== 'pago').reduce((s, c) => s + (c.valor - (c.valorRecebido ?? 0)), 0), [contasReceber])
  const totalDividas = useMemo(() => dividas.filter(d => d.status === 'ativa').reduce((s, d) => s + d.valorAtual, 0), [dividas])
  const rendaMensal  = useMemo(() => fontesRenda.filter(f => f.ativa && f.periodicidade === 'mensal').reduce((s, f) => s + f.valor, 0), [fontesRenda])
  const saldoLiquido = rendaMensal - totalPagar

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)

  const parcelasAtrasadas = useMemo(() =>
    contasReceber
      .filter(c => c.status !== 'pago' && new Date(c.vencimento + 'T00:00:00') < hoje)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  , [contasReceber])

  const contasVencidas = useMemo(() => contasPagar.filter(c => c.status === 'vencido').length, [contasPagar])

  const fluxoData = useMemo(() => {
    const hj = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const m = new Date(hj.getFullYear(), hj.getMonth() - 5 + i, 1)
      const mes = m.getMonth(); const ano = m.getFullYear()
      const receita = contasReceber.filter(c => { const d = new Date(c.vencimento); return d.getMonth() === mes && d.getFullYear() === ano }).reduce((s, c) => s + c.valor, 0)
      const despesa = contasPagar.filter(c => { const d = new Date(c.vencimento); return d.getMonth() === mes && d.getFullYear() === ano }).reduce((s, c) => s + c.valor, 0)
      return { mes: meses[mes].substring(0, 3), receita, despesa }
    })
  }, [contasPagar, contasReceber])

  const gastosPorGrupo = useMemo(() => {
    const map: Record<string, number> = {}
    contasPagar.forEach(c => { map[c.grupo] = (map[c.grupo] ?? 0) + c.valor })
    return Object.entries(map).map(([grupo, valor]) => ({ name: grupoLabel[grupo] ?? grupo, value: valor })).sort((a, b) => b.value - a.value).slice(0, 6)
  }, [contasPagar])

  const proximosVencimentos = useMemo(() =>
    [...contasPagar].filter(c => c.status === 'pendente' || c.status === 'vencido').sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 5)
  , [contasPagar])

  const progresos = planejamentos.slice(0, 4)

  const fonteRendaStats = useMemo(() => {
    const ativas = fonteRendaCategorias.filter(fc => fc.ativa)
    if (!ativas.length) return []
    return ativas.map(fc => {
      const investido = contasPagar
        .filter(c => c.fonteRendaId === fc.id)
        .reduce((s, c) => s + c.valor, 0)
      const retorno = contasReceber
        .filter(c => c.fonteRendaId === fc.id)
        .reduce((s, c) => s + c.valor, 0)
      return { ...fc, investido, retorno, resultado: retorno - investido }
    }).filter(fc => fc.investido > 0 || fc.retorno > 0)
  }, [fonteRendaCategorias, contasPagar, contasReceber])
  const metaProgress = useMemo(() => {
    if (!planejamentos.length) return 0
    const t = planejamentos.reduce((s, p) => s + p.valorMeta, 0)
    const a = planejamentos.reduce((s, p) => s + p.valorAtual, 0)
    return t > 0 ? (a / t) * 100 : 0
  }, [planejamentos])

  return (
    <div className="space-y-5">

      {/* ── Alertas ────────────────────────────────────────────── */}
      {(parcelasAtrasadas.length > 0 || contasVencidas > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-100/70 border-b border-red-200">
            <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-red-700 text-sm">
                {parcelasAtrasadas.length + contasVencidas} item{parcelasAtrasadas.length + contasVencidas !== 1 ? 'ns' : ''} precisam de atenção
              </span>
              <div className="flex flex-wrap gap-x-3 mt-0.5">
                {parcelasAtrasadas.length > 0 && <span className="text-xs text-red-600">{parcelasAtrasadas.length} recebimento{parcelasAtrasadas.length > 1 ? 's' : ''} em atraso</span>}
                {contasVencidas > 0 && <span className="text-xs text-red-600">{contasVencidas} conta{contasVencidas > 1 ? 's' : ''} a pagar vencida{contasVencidas > 1 ? 's' : ''}</span>}
              </div>
            </div>
            <Link to="/contas-receber" className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 flex-shrink-0">
              Ver <ChevronRight size={12} />
            </Link>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-red-100">
            {parcelasAtrasadas.slice(0, 6).map(c => {
              const dias = Math.round((hoje.getTime() - new Date(c.vencimento + 'T00:00:00').getTime()) / 86400000)
              const pessoa = c.pessoaId ? pessoas.find(p => p.id === c.pessoaId) : null
              const saldo = c.valor - (c.valorRecebido ?? 0)
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Clock size={12} className="text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-700 font-medium truncate block">{c.descricao}</span>
                    {pessoa && <span className="text-xs text-slate-400">{pessoa.nome}</span>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-red-600">{formatCurrency(saldo)}</div>
                    <div className="text-[10px] text-red-400">{dias}d em atraso</div>
                  </div>
                </div>
              )
            })}
            {parcelasAtrasadas.length > 6 && (
              <div className="px-4 py-2 text-center text-xs text-red-500 font-medium">
                + {parcelasAtrasadas.length - 6} parcela(s) em atraso
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Hero cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/10 -translate-y-6 translate-x-6" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={14} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Saldo em Contas</span>
            </div>
            <div className="text-3xl font-bold tabular-nums leading-none">{formatCurrency(saldoTotal)}</div>
            <div className="text-xs text-slate-400 mt-2">
              {contasBancarias.filter(c => c.ativa).length} conta{contasBancarias.filter(c => c.ativa).length !== 1 ? 's' : ''} ativa{contasBancarias.filter(c => c.ativa).length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className={`rounded-2xl p-5 relative overflow-hidden ${saldoLiquido >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 translate-y-6 -translate-x-6" />
          <div className="relative text-white">
            <div className="flex items-center gap-2 mb-3">
              {saldoLiquido >= 0 ? <TrendingUp size={14} className="text-white/70" /> : <TrendingDown size={14} className="text-white/70" />}
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Saldo Mensal Líquido</span>
            </div>
            <div className="text-3xl font-bold tabular-nums leading-none">{formatCurrency(Math.abs(saldoLiquido))}</div>
            <div className="text-xs text-white/60 mt-2">
              {saldoLiquido >= 0 ? '↑ sobra' : '↓ déficit'} · renda {formatCurrency(rendaMensal)} − pagar {formatCurrency(totalPagar)}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="A Receber" value={formatCurrency(totalReceber)} icon={TrendingUp} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard label="A Pagar" value={formatCurrency(totalPagar)} icon={TrendingDown} iconColor="text-rose-600" iconBg="bg-rose-50" danger={totalPagar > 0} />
        <StatCard label="Total Dívidas" value={formatCurrency(totalDividas)} icon={Wallet} iconColor="text-orange-600" iconBg="bg-orange-50" />
        <StatCard
          label={contasVencidas > 0 || parcelasAtrasadas.length > 0 ? `${contasVencidas + parcelasAtrasadas.length} alertas` : 'Sem alertas'}
          value={contasVencidas > 0 || parcelasAtrasadas.length > 0 ? 'Ver agora' : 'Tudo ok!'}
          icon={contasVencidas > 0 || parcelasAtrasadas.length > 0 ? AlertCircle : CheckCircle}
          iconColor={contasVencidas > 0 || parcelasAtrasadas.length > 0 ? 'text-red-600' : 'text-emerald-600'}
          iconBg={contasVencidas > 0 || parcelasAtrasadas.length > 0 ? 'bg-red-50' : 'bg-emerald-50'}
          danger={contasVencidas > 0 || parcelasAtrasadas.length > 0}
        />
      </div>

      {/* ── Gráficos ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2" title="Fluxo de Caixa" subtitle="Últimos 6 meses">
          <div className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={fluxoData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(v: any, name: any) => [v ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00', name === 'receita' ? 'Receitas' : 'Despesas']} />
                <Area type="monotone" dataKey="receita" stroke="#10b981" fill="url(#gReceita)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="despesa" stroke="#f43f5e" fill="url(#gDespesa)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-5 mt-1 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-3 h-0.5 bg-emerald-500 rounded" /> Receita</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-3 h-0.5 bg-red-400 rounded" /> Despesa</div>
            </div>
          </div>
        </Card>

        <Card title="Gastos por Categoria">
          {gastosPorGrupo.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-slate-400">
              <CheckCircle size={28} className="text-slate-300 mb-2" />
              <p className="text-sm">Sem despesas cadastradas</p>
            </div>
          ) : (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={gastosPorGrupo} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                    {gastosPorGrupo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {gastosPorGrupo.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{item.name}</span>
                    <span className="text-xs font-semibold text-slate-700">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Próximos Vencimentos + Planejamentos ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card
          className="lg:col-span-2"
          title="Próximos Vencimentos"
          action={
            <Link to="/contas-pagar" className="flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:text-emerald-700">
              Ver todos <ArrowRight size={12} />
            </Link>
          }
        >
          {proximosVencimentos.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-slate-400">
              <CheckCircle size={28} className="text-emerald-300 mb-2" />
              <p className="text-sm font-medium">Nenhuma conta pendente</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {proximosVencimentos.map(conta => {
                const dias = Math.ceil((new Date(conta.vencimento + 'T00:00:00').getTime() - hoje.getTime()) / 86400000)
                const isAtrasado = dias < 0
                const isUrgente = !isAtrasado && dias <= 3
                return (
                  <div key={conta.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className={`w-1 h-9 rounded-full flex-shrink-0 ${isAtrasado ? 'bg-red-400' : isUrgente ? 'bg-amber-400' : 'bg-slate-200'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{conta.descricao}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{grupoLabel[conta.grupo] ?? conta.grupo} · {conta.fonte === 'empresa' ? 'Empresa' : 'Pessoal'}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-slate-800">{formatCurrency(conta.valor)}</div>
                      <div className={`text-xs font-medium mt-0.5 ${isAtrasado ? 'text-red-500' : isUrgente ? 'text-amber-500' : 'text-slate-400'}`}>
                        {isAtrasado ? `${Math.abs(dias)}d atraso` : dias === 0 ? 'Hoje' : `em ${dias}d`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card title="Metas e Planejamentos">
          <div className="p-4 space-y-4">
            {progresos.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-slate-400">
                <Target size={24} className="text-slate-300 mb-2" />
                <p className="text-sm">Nenhum planejamento ativo</p>
                <Link to="/planejamentos" className="text-xs text-emerald-600 font-medium mt-1 hover:underline">Criar meta →</Link>
              </div>
            ) : (
              <>
                {progresos.map(p => {
                  const pct = Math.min(100, (p.valorAtual / p.valorMeta) * 100)
                  return (
                    <div key={p.id}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5 min-w-0">
                          <span className="text-base flex-shrink-0">{p.icone}</span>
                          <span className="truncate">{p.nome}</span>
                        </span>
                        <span className="text-xs font-bold text-slate-600 ml-2 flex-shrink-0">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: p.cor }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-slate-400">{formatCurrency(p.valorAtual)}</span>
                        <span className="text-[10px] text-slate-400">{formatCurrency(p.valorMeta)}</span>
                      </div>
                    </div>
                  )
                })}
                <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Target size={12} className="text-emerald-500" />
                    Meta geral <strong className="text-slate-700">{metaProgress.toFixed(1)}%</strong>
                  </span>
                  <Link to="/planejamentos" className="text-[10px] text-emerald-600 font-semibold hover:underline">Ver todos →</Link>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ── Fontes de Renda: Investido vs Retorno ─────────── */}
      {fonteRendaStats.length > 0 && (
        <Card title="Fontes de Renda — Investido vs Retorno"
          subtitle="Comparativo entre custos alocados e receitas por fonte"
          action={<Link to="/rendas" className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1">Ver rendas <ArrowRight size={12} /></Link>}
        >
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fonteRendaStats.map(fc => {
              const pctRetorno = fc.investido > 0 ? Math.min(200, (fc.retorno / fc.investido) * 100) : 0
              const roi = fc.investido > 0 ? ((fc.retorno - fc.investido) / fc.investido) * 100 : null
              return (
                <div key={fc.id} className="rounded-xl border p-3.5" style={{ borderColor: fc.cor + '44', background: fc.cor + '08' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: fc.cor }} />
                      <span className="font-semibold text-slate-800 text-sm truncate">{fc.nome}</span>
                    </div>
                    {roi !== null && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${fc.resultado >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        ROI {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Investido</div>
                      <div className="text-sm font-bold text-slate-700">{formatCurrency(fc.investido)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Retorno</div>
                      <div className="text-sm font-bold text-emerald-600">{formatCurrency(fc.retorno)}</div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pctRetorno)}%`, background: fc.cor }} />
                  </div>
                  <div className={`text-xs font-medium mt-1.5 ${fc.resultado >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {fc.resultado >= 0 ? `+${formatCurrency(fc.resultado)} de resultado` : `${formatCurrency(fc.resultado)} de déficit`}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Dívidas ─────────────────────────────────────────── */}
      {dividas.filter(d => d.status === 'ativa').length > 0 && (
        <Card title="Visão Geral das Dívidas" subtitle={`Saldo devedor total: ${formatCurrency(totalDividas)}`}>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dividas.filter(d => d.status === 'ativa').map(d => {
              const pct = Math.min(100, ((d.valorOriginal - d.valorAtual) / d.valorOriginal) * 100)
              return (
                <div key={d.id} className="bg-slate-50 rounded-xl p-3.5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-700 truncate">{d.descricao}</div>
                      <div className="text-xs text-slate-400">{d.credor}</div>
                    </div>
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg ml-2 flex-shrink-0">{pct.toFixed(0)}% pago</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400">Pago: {formatCurrency(d.valorOriginal - d.valorAtual)}</span>
                    <span className="text-xs font-semibold text-orange-600">Restam: {formatCurrency(d.valorAtual)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
