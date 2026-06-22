import { useFinanceStore } from '../store/useFinanceStore'

export const seedDemoData = () => {
  const store = useFinanceStore.getState()

  // Contas Bancárias
  store.addContaBancaria({ nome: 'Conta Corrente PF', banco: 'Itaú', agencia: '1234', conta: '12345-6', tipo: 'corrente', saldo: 8500, fonte: 'pessoal', ativa: true, cor: '#f97316' })
  store.addContaBancaria({ nome: 'Conta Empresa', banco: 'Bradesco', agencia: '5678', conta: '98765-4', tipo: 'corrente', saldo: 45000, fonte: 'empresa', ativa: true, cor: '#6366f1' })
  store.addContaBancaria({ nome: 'Poupança', banco: 'Caixa', agencia: '0001', conta: '11111-0', tipo: 'poupanca', saldo: 15200, fonte: 'pessoal', ativa: true, cor: '#10b981' })

  // Fontes de Renda
  store.addFonteRenda({ nome: 'Salário', tipo: 'pessoal', valor: 12000, recorrente: true, periodicidade: 'mensal', ativa: true, dataInicio: '2024-01-01', categoria: 'Emprego', descricao: 'Salário mensal CLT' })
  store.addFonteRenda({ nome: 'Faturamento Empresa', tipo: 'empresa', valor: 38000, recorrente: true, periodicidade: 'mensal', ativa: true, dataInicio: '2023-06-01', categoria: 'Prestação de Serviços', descricao: 'Receita bruta da empresa' })
  store.addFonteRenda({ nome: 'Freelance Design', tipo: 'pessoal', valor: 3500, recorrente: false, periodicidade: 'mensal', ativa: true, dataInicio: '2025-01-01', categoria: 'Freelance', descricao: 'Projetos esporádicos' })
  store.addFonteRenda({ nome: 'Aluguel Sala', tipo: 'empresa', valor: 2800, recorrente: true, periodicidade: 'mensal', ativa: true, dataInicio: '2024-03-01', categoria: 'Imóvel', descricao: 'Aluguel de sala comercial' })

  // Contas a Pagar
  const hoje = new Date()
  const m = (d: number) => { const dt = new Date(hoje); dt.setDate(dt.getDate() + d); return dt.toISOString().split('T')[0] }

  store.addContaPagar({ descricao: 'Aluguel Apartamento', valor: 2800, vencimento: m(5), status: 'pendente', grupo: 'casa', fonte: 'pessoal', categoria: 'Moradia', fornecedor: 'Imobiliária ABC' })
  store.addContaPagar({ descricao: 'Condomínio', valor: 650, vencimento: m(10), status: 'pendente', grupo: 'casa', fonte: 'pessoal', categoria: 'Moradia' })
  store.addContaPagar({ descricao: 'IPTU Parcelado', valor: 380, vencimento: m(3), status: 'pendente', grupo: 'casa', fonte: 'pessoal', categoria: 'Imposto', parcelas: 10, parcelaAtual: 4 })
  store.addContaPagar({ descricao: 'Seguro Auto', valor: 420, vencimento: m(-3), status: 'vencido', grupo: 'carro', fonte: 'pessoal', categoria: 'Seguro', fornecedor: 'Porto Seguro' })
  store.addContaPagar({ descricao: 'Financiamento Carro', valor: 1250, vencimento: m(15), status: 'pendente', grupo: 'carro', fonte: 'pessoal', categoria: 'Financiamento', parcelas: 48, parcelaAtual: 18 })
  store.addContaPagar({ descricao: 'Passagem Aérea Europa', valor: 4800, vencimento: m(20), status: 'pendente', grupo: 'viagens', fonte: 'pessoal', categoria: 'Transporte' })
  store.addContaPagar({ descricao: 'Hotel - Lisboa', valor: 2200, vencimento: m(25), status: 'pendente', grupo: 'viagens', fonte: 'pessoal', categoria: 'Hospedagem' })
  store.addContaPagar({ descricao: 'Fornecedor TI', valor: 8500, vencimento: m(7), status: 'pendente', grupo: 'outros', fonte: 'empresa', categoria: 'Fornecedor', fornecedor: 'Tech Solutions' })
  store.addContaPagar({ descricao: 'Contabilidade', valor: 1800, vencimento: m(12), status: 'pendente', grupo: 'outros', fonte: 'empresa', categoria: 'Serviços', fornecedor: 'Escritório Contábil XYZ' })
  store.addContaPagar({ descricao: 'Luz e Água', valor: 320, vencimento: m(2), status: 'pendente', grupo: 'casa', fonte: 'pessoal', categoria: 'Utilidades' })
  store.addContaPagar({ descricao: 'Internet', valor: 180, vencimento: m(8), status: 'pago', grupo: 'casa', fonte: 'pessoal', categoria: 'Telecomunicações', dataPagamento: m(-2), valorPago: 180 })
  store.addContaPagar({ descricao: 'Academia', valor: 150, vencimento: m(-10), status: 'vencido', grupo: 'saude', fonte: 'pessoal', categoria: 'Saúde' })

  // Contas a Receber
  store.addContaReceber({ descricao: 'NF Serviço Consultoria', valor: 15000, vencimento: m(10), status: 'pendente', fonte: 'empresa', cliente: 'Cliente Alpha Ltda', categoria: 'Serviços' })
  store.addContaReceber({ descricao: 'NF Desenvolvimento Site', valor: 8000, vencimento: m(5), status: 'pendente', fonte: 'empresa', cliente: 'Beta Comércio', categoria: 'Desenvolvimento', parcelas: 2, parcelaAtual: 1 })
  store.addContaReceber({ descricao: 'Freelance Logo', valor: 1200, vencimento: m(-5), status: 'vencido', fonte: 'pessoal', cliente: 'João Silva', categoria: 'Design' })
  store.addContaReceber({ descricao: 'Reembolso Despesas', valor: 850, vencimento: m(3), status: 'pendente', fonte: 'empresa', cliente: 'Gamma SA', categoria: 'Reembolso' })
  store.addContaReceber({ descricao: 'Aluguel Sala Comercial', valor: 2800, vencimento: m(5), status: 'pendente', fonte: 'empresa', cliente: 'Delta Corp', categoria: 'Imóvel' })

  // Dívidas
  store.addDivida({
    descricao: 'Empréstimo Pessoal', credor: 'Banco Itaú', valorOriginal: 30000, valorAtual: 22500,
    taxaJuros: 1.8, dataInicio: '2024-01-15', dataVencimento: '2026-01-15', status: 'ativa', fonte: 'pessoal',
    parcelas: 24, parcelaAtual: 8, valorParcela: 1450,
    historicoPagamentos: [
      { id: '1', data: '2024-02-15', valor: 1450 }, { id: '2', data: '2024-03-15', valor: 1450 },
      { id: '3', data: '2024-04-15', valor: 1450 }, { id: '4', data: '2024-05-15', valor: 1450 },
    ]
  })
  store.addDivida({
    descricao: 'Cartão Crédito PF', credor: 'Bradesco Visa', valorOriginal: 8000, valorAtual: 5200,
    taxaJuros: 2.5, dataInicio: '2025-03-01', dataVencimento: '2026-09-01', status: 'ativa', fonte: 'pessoal',
    parcelas: 12, parcelaAtual: 5, valorParcela: 720,
    historicoPagamentos: []
  })
  store.addDivida({
    descricao: 'Financiamento Equipamentos', credor: 'BNDES', valorOriginal: 120000, valorAtual: 95000,
    taxaJuros: 0.9, dataInicio: '2023-06-01', dataVencimento: '2028-06-01', status: 'ativa', fonte: 'empresa',
    parcelas: 60, parcelaAtual: 24, valorParcela: 2200,
    historicoPagamentos: []
  })

  // Planejamentos
  store.addPlanejamento({
    nome: 'Reserva de Emergência', tipo: 'reserva_emergencia', descricao: '6 meses de despesas',
    valorMeta: 45000, valorAtual: 18500, dataInicio: '2025-01-01', dataAlvo: '2026-12-31',
    aporteMensal: 2000, fonte: 'pessoal', ativo: true, cor: '#10b981', icone: '🛡️', historico: [
      { id: '1', data: '2025-01-01', valor: 2000 }, { id: '2', data: '2025-02-01', valor: 2000 },
      { id: '3', data: '2025-03-01', valor: 2500 }, { id: '4', data: '2025-04-01', valor: 2000 },
      { id: '5', data: '2025-05-01', valor: 2500 }, { id: '6', data: '2025-06-01', valor: 2000 },
      { id: '7', data: '2025-07-01', valor: 1500 }, { id: '8', data: '2025-08-01', valor: 2000 },
      { id: '9', data: '2025-09-01', valor: 2000 },
    ]
  })
  store.addPlanejamento({
    nome: 'Compra do Carro Novo', tipo: 'compra_carro', descricao: 'Toyota Corolla 2026',
    valorMeta: 120000, valorAtual: 35000, dataInicio: '2025-01-01', dataAlvo: '2027-06-30',
    aporteMensal: 3000, fonte: 'pessoal', ativo: true, cor: '#f97316', icone: '🚗', historico: [
      { id: '1', data: '2025-01-01', valor: 3000 }, { id: '2', data: '2025-02-01', valor: 3000 },
      { id: '3', data: '2025-03-01', valor: 4000 }, { id: '4', data: '2025-04-01', valor: 3000 },
      { id: '5', data: '2025-05-01', valor: 3000 }, { id: '6', data: '2025-06-01', valor: 5000 },
    ]
  })
  store.addPlanejamento({
    nome: 'Viagem Europa 2026', tipo: 'viagem', descricao: 'Portugal, Espanha e França - 20 dias',
    valorMeta: 35000, valorAtual: 12000, dataInicio: '2025-06-01', dataAlvo: '2026-10-01',
    aporteMensal: 2500, fonte: 'pessoal', ativo: true, cor: '#6366f1', icone: '✈️', historico: [
      { id: '1', data: '2025-06-01', valor: 2500 }, { id: '2', data: '2025-07-01', valor: 2500 },
      { id: '3', data: '2025-08-01', valor: 2500 }, { id: '4', data: '2025-09-01', valor: 2500 },
      { id: '5', data: '2025-10-01', valor: 2000 },
    ]
  })

  // Provisionamentos
  const ano = new Date().getFullYear()
  const mes = new Date().getMonth() + 1
  for (let i = 0; i < 6; i++) {
    const m2 = ((mes - 1 + i) % 12) + 1
    const a2 = ano + Math.floor((mes - 1 + i) / 12)
    store.addProvisionamento({ descricao: 'Faturamento Empresa', tipo: 'faturamento', fonte: 'empresa', valor: 38000, mes: m2, ano: a2, realizado: i === 0 ? 32000 : 0, status: i === 0 ? 'parcial' : 'previsto', categoria: 'Receita' })
    store.addProvisionamento({ descricao: 'Salário', tipo: 'faturamento', fonte: 'pessoal', valor: 12000, mes: m2, ano: a2, realizado: i === 0 ? 12000 : 0, status: i === 0 ? 'realizado' : 'previsto', categoria: 'Renda' })
    store.addProvisionamento({ descricao: 'Despesas Fixas', tipo: 'despesa', fonte: 'pessoal', valor: 8500, mes: m2, ano: a2, realizado: i === 0 ? 7200 : 0, status: i === 0 ? 'parcial' : 'previsto', categoria: 'Custo' })
  }

  // Transações Bancárias
  for (let i = 1; i <= 15; i++) {
    const dt = new Date(hoje); dt.setDate(dt.getDate() - i)
    const dateStr = dt.toISOString().split('T')[0]
    store.addTransacao({ data: dateStr, descricao: i % 3 === 0 ? 'TED Recebido' : i % 3 === 1 ? 'Pagamento Fornecedor' : 'Débito Automático', valor: Math.round(Math.random() * 5000 + 200), tipo: i % 3 === 0 ? 'credito' : 'debito', conciliado: i > 7, statusConciliacao: i > 7 ? 'conciliado' : 'pendente', banco: i % 2 === 0 ? 'Itaú' : 'Bradesco', categoria: i % 3 === 0 ? 'Receita' : 'Despesa' })
  }
}
