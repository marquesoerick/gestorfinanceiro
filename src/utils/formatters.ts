export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export const formatDateInput = (dateStr: string): string => dateStr || ''

export const toDateInput = (date: Date = new Date()): string =>
  date.toISOString().split('T')[0]

export const grupoLabel: Record<string, string> = {
  casa: 'Casa',
  carro: 'Carro',
  viagens: 'Viagens',
  alimentacao: 'Alimentação',
  saude: 'Saúde',
  educacao: 'Educação',
  lazer: 'Lazer',
  outros: 'Outros',
  reserva_emergencia: 'Reserva de Emergência',
  aposentadoria: 'Aposentadoria',
  divida: 'Dívida',
}

export const statusLabel: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
  parcial: 'Parcial',
  ativa: 'Ativa',
  quitada: 'Quitada',
  renegociada: 'Renegociada',
  conciliado: 'Conciliado',
  divergente: 'Divergente',
}

export const statusColor: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  pago: 'bg-emerald-100 text-emerald-700',
  vencido: 'bg-red-100 text-red-700',
  parcial: 'bg-blue-100 text-blue-700',
  ativa: 'bg-orange-100 text-orange-700',
  quitada: 'bg-emerald-100 text-emerald-700',
  renegociada: 'bg-purple-100 text-purple-700',
  conciliado: 'bg-emerald-100 text-emerald-700',
  pendente_conc: 'bg-amber-100 text-amber-700',
  divergente: 'bg-red-100 text-red-700',
}

export const fonteColor: Record<string, string> = {
  empresa: 'bg-indigo-100 text-indigo-700',
  pessoal: 'bg-teal-100 text-teal-700',
}

export const grupoColor: Record<string, string> = {
  casa: 'bg-blue-100 text-blue-700',
  carro: 'bg-orange-100 text-orange-700',
  viagens: 'bg-cyan-100 text-cyan-700',
  alimentacao: 'bg-green-100 text-green-700',
  saude: 'bg-red-100 text-red-700',
  educacao: 'bg-purple-100 text-purple-700',
  lazer: 'bg-pink-100 text-pink-700',
  outros: 'bg-gray-100 text-gray-700',
  reserva_emergencia: 'bg-emerald-100 text-emerald-700',
  aposentadoria: 'bg-indigo-100 text-indigo-700',
  divida: 'bg-rose-100 text-rose-700',
}

export const isVencido = (vencimento: string): boolean => {
  return new Date(vencimento) < new Date()
}

export const diasRestantes = (vencimento: string): number => {
  const diff = new Date(vencimento).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export const mesesLongos = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export const prioridadeLabel: Record<string, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

export const prioridadeColor: Record<string, string> = {
  alta: 'bg-red-100 text-red-700 border border-red-200',
  media: 'bg-amber-100 text-amber-700 border border-amber-200',
  baixa: 'bg-blue-100 text-blue-600 border border-blue-200',
}

export const prioridadeIcone: Record<string, string> = {
  alta: '🔴',
  media: '🟡',
  baixa: '🟢',
}

export const origemLabel: Record<string, string> = {
  manual: 'Manual',
  planejamento: 'Planejamento',
  divida: 'Dívida',
  carryover: 'Carry-over',
}

export const formatMesAno = (mes: number, ano: number): string =>
  `${mesesLongos[mes - 1]} ${ano}`
