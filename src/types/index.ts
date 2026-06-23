export type FonteRenda = 'empresa' | 'pessoal'
export type TipoPessoa = 'cliente' | 'fornecedor' | 'ambos'

export interface Pessoa {
  id: string
  nome: string
  tipo: TipoPessoa
  telefone?: string
  email?: string
  cpfCnpj?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  observacoes?: string
  ativa: boolean
}

export interface FonteRendaCategoria {
  id: string
  nome: string
  descricao?: string
  cor: string
  ativa: boolean
}

export interface Produto {
  id: string
  nome: string
  fonteRendaId: string
  descricao?: string
  precoBase?: number
  ativo: boolean
}
export type StatusConta = 'pendente' | 'pago' | 'vencido' | 'parcial'
export type StatusDivida = 'ativa' | 'quitada' | 'renegociada'
export type GrupoGasto = 'casa' | 'carro' | 'viagens' | 'alimentacao' | 'saude' | 'educacao' | 'lazer' | 'outros'
export type TipoPlano = 'reserva_emergencia' | 'compra_carro' | 'viagem' | 'aposentadoria' | 'outros'
export type StatusConciliacao = 'conciliado' | 'pendente' | 'divergente'
export type Prioridade = 'alta' | 'media' | 'baixa'
export type OrigemConta = 'manual' | 'planejamento' | 'divida' | 'carryover' | 'recorrente'

export interface ContaPagar {
  id: string
  descricao: string
  valor: number
  vencimento: string
  status: StatusConta
  grupo: GrupoGasto
  fonte: FonteRenda
  categoria: string
  fornecedor?: string
  parcelas?: number
  parcelaAtual?: number
  observacoes?: string
  dataPagamento?: string
  valorPago?: number
  prioridade?: Prioridade
  mesReferencia?: number
  anoReferencia?: number
  origem?: OrigemConta
  origemId?: string
  fonteRendaId?: string
  pessoaId?: string
  recorrente?: boolean
}

export interface PagamentoRecebido {
  id: string
  data: string
  valor: number
  contaBancariaId?: string
  observacoes?: string
}

export interface ContaReceber {
  id: string
  descricao: string
  valor: number
  vencimento: string
  status: StatusConta
  fonte: FonteRenda
  cliente?: string
  categoria: string
  parcelas?: number
  parcelaAtual?: number
  observacoes?: string
  dataRecebimento?: string
  valorRecebido?: number
  prioridade?: Prioridade
  mesReferencia?: number
  anoReferencia?: number
  pessoaId?: string
  produtoId?: string
  fonteRendaId?: string
  contaBancariaRecebidaId?: string
  diaPagamento?: number
  pagamentosRecebidos?: PagamentoRecebido[]
}

export interface TransacaoBancaria {
  id: string
  data: string
  descricao: string
  valor: number
  tipo: 'credito' | 'debito'
  contaId?: string
  conciliado: boolean
  statusConciliacao: StatusConciliacao
  banco: string
  categoria?: string
}

export interface Divida {
  id: string
  descricao: string
  credor: string
  valorOriginal: number
  valorAtual: number
  taxaJuros: number
  dataInicio: string
  dataVencimento: string
  status: StatusDivida
  fonte: FonteRenda
  parcelas: number
  parcelaAtual: number
  valorParcela: number
  historicoPagamentos: PagamentoDivida[]
  observacoes?: string
}

export interface PagamentoDivida {
  id: string
  data: string
  valor: number
  observacoes?: string
}

export interface Planejamento {
  id: string
  nome: string
  tipo: TipoPlano
  descricao: string
  valorMeta: number
  valorAtual: number
  dataInicio: string
  dataAlvo: string
  aporteMensal: number
  fonte: FonteRenda
  ativo: boolean
  historico: AportePlanejamento[]
  cor: string
  icone: string
}

export interface AportePlanejamento {
  id: string
  data: string
  valor: number
  observacoes?: string
}

export interface FonteRendaItem {
  id: string
  nome: string
  tipo: FonteRenda
  valor: number
  recorrente: boolean
  periodicidade: 'mensal' | 'semanal' | 'quinzenal' | 'anual' | 'unico'
  ativa: boolean
  dataInicio: string
  descricao?: string
  categoria: string
}

export interface Provisionamento {
  id: string
  descricao: string
  tipo: 'faturamento' | 'despesa'
  fonte: FonteRenda
  valor: number
  mes: number
  ano: number
  realizado: number
  status: 'previsto' | 'parcial' | 'realizado'
  categoria: string
}

export interface ContaBancaria {
  id: string
  nome: string
  banco: string
  agencia: string
  conta: string
  tipo: 'corrente' | 'poupanca' | 'investimento' | 'carteira'
  saldo: number
  fonte: FonteRenda
  ativa: boolean
  cor: string
}

export interface MesFechado {
  id: string
  mes: number
  ano: number
  fechadoEm: string
  totalPendente: number
  contasCarryover: number
}

export interface FinanceStore {
  contasPagar: ContaPagar[]
  contasReceber: ContaReceber[]
  transacoesBancarias: TransacaoBancaria[]
  dividas: Divida[]
  planejamentos: Planejamento[]
  fontesRenda: FonteRendaItem[]
  fonteRendaCategorias: FonteRendaCategoria[]
  produtos: Produto[]
  pessoas: Pessoa[]
  provisionamentos: Provisionamento[]
  contasBancarias: ContaBancaria[]
  mesesFechados: MesFechado[]
  mesAtivo: number
  anoAtivo: number

  addPessoa: (p: Omit<Pessoa, 'id'>) => void
  updatePessoa: (id: string, p: Partial<Pessoa>) => void
  deletePessoa: (id: string) => void

  addFonteRendaCategoria: (f: Omit<FonteRendaCategoria, 'id'>) => void
  updateFonteRendaCategoria: (id: string, f: Partial<FonteRendaCategoria>) => void
  deleteFonteRendaCategoria: (id: string) => void

  addProduto: (p: Omit<Produto, 'id'>) => void
  updateProduto: (id: string, p: Partial<Produto>) => void
  deleteProduto: (id: string) => void

  addContaPagar: (c: Omit<ContaPagar, 'id'>) => void
  updateContaPagar: (id: string, c: Partial<ContaPagar>) => void
  deleteContaPagar: (id: string) => void

  addContaReceber: (c: Omit<ContaReceber, 'id'>) => void
  updateContaReceber: (id: string, c: Partial<ContaReceber>) => void
  deleteContaReceber: (id: string) => void
  addPagamentoRecebido: (contaId: string, pagamento: Omit<PagamentoRecebido, 'id'>) => void

  addTransacao: (t: Omit<TransacaoBancaria, 'id'>) => void
  updateTransacao: (id: string, t: Partial<TransacaoBancaria>) => void
  deleteTransacao: (id: string) => void

  addDivida: (d: Omit<Divida, 'id'>) => void
  updateDivida: (id: string, d: Partial<Divida>) => void
  deleteDivida: (id: string) => void
  addPagamentoDivida: (dividaId: string, pagamento: Omit<PagamentoDivida, 'id'>) => void

  addPlanejamento: (p: Omit<Planejamento, 'id'>) => void
  updatePlanejamento: (id: string, p: Partial<Planejamento>) => void
  deletePlanejamento: (id: string) => void
  addAportePlanejamento: (planejamentoId: string, aporte: Omit<AportePlanejamento, 'id'>) => void

  addFonteRenda: (f: Omit<FonteRendaItem, 'id'>) => void
  updateFonteRenda: (id: string, f: Partial<FonteRendaItem>) => void
  deleteFonteRenda: (id: string) => void

  addProvisionamento: (p: Omit<Provisionamento, 'id'>) => void
  updateProvisionamento: (id: string, p: Partial<Provisionamento>) => void
  deleteProvisionamento: (id: string) => void

  addContaBancaria: (c: Omit<ContaBancaria, 'id'>) => void
  updateContaBancaria: (id: string, c: Partial<ContaBancaria>) => void
  deleteContaBancaria: (id: string) => void

  setMesAtivo: (mes: number, ano: number) => void
  fecharMes: (mes: number, ano: number) => void
  reabrirMes: (mes: number, ano: number) => void
}
