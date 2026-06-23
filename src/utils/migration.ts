import { supabase } from '../lib/supabase'

export async function migrateLocalStorageToSupabase(userId: string) {
  try {
    const raw = localStorage.getItem('gestor-financeiro-v2')
    if (!raw) return { success: true, message: 'Nenhum dado local encontrado' }

    const parsed = JSON.parse(raw)
    const state = parsed.state

    if (!state) return { success: true, message: 'Estado local vazio' }

    console.log('Iniciando migração de dados...')

    // Mapeamento de IDs antigos (string aleatória) para novos UUIDs
    const idMap = new Map<string, string>()
    const mapId = (oldId: string | null | undefined): string | null => {
      if (!oldId) return null
      // Se já for UUID válido, retorna ele mesmo
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(oldId)) return oldId
      if (!idMap.has(oldId)) {
        idMap.set(oldId, crypto.randomUUID())
      }
      return idMap.get(oldId)!
    }

    // 1. Fonte Renda Categorias
    if (state.fonteRendaCategorias?.length) {
      const { error } = await supabase.from('fonte_renda_categorias').upsert(
        state.fonteRendaCategorias.map((c: any) => ({
          id: mapId(c.id),
          user_id: userId,
          nome: c.nome,
          descricao: c.descricao,
          cor: c.cor,
          ativa: c.ativa
        }))
      )
      if (error) throw new Error(`Erro categorias: ${error.message}`)
    }

    // 2. Fontes de Renda (Rendas Fixas/Variáveis)
    if (state.fontesRenda?.length) {
      const { error } = await supabase.from('fontes_renda').upsert(
        state.fontesRenda.map((f: any) => ({
          id: mapId(f.id),
          user_id: userId,
          nome: f.nome,
          tipo: f.tipo,
          valor_mensal: f.valorMensal,
          dia_recebimento: f.diaRecebimento,
          ativo: f.ativo
        }))
      )
      if (error) throw new Error(`Erro fontes renda: ${error.message}`)
    }

    // 3. Pessoas
    if (state.pessoas?.length) {
      const { error } = await supabase.from('pessoas').upsert(
        state.pessoas.map((p: any) => ({
          id: mapId(p.id),
          user_id: userId,
          nome: p.nome,
          tipo: p.tipo,
          telefone: p.telefone,
          email: p.email,
          cpf_cnpj: p.cpfCnpj,
          endereco: p.endereco,
          cidade: p.cidade,
          estado: p.estado,
          cep: p.cep,
          observacoes: p.observacoes,
          ativa: p.ativa !== false
        }))
      )
      if (error) throw new Error(`Erro pessoas: ${error.message}`)
    }

    // 4. Produtos
    if (state.produtos?.length) {
      const { error } = await supabase.from('produtos').upsert(
        state.produtos.map((p: any) => ({
          id: mapId(p.id),
          user_id: userId,
          nome: p.nome,
          fonte_renda_id: mapId(p.fonteRendaId),
          descricao: p.descricao,
          preco_base: p.precoBase,
          ativo: p.ativo !== false
        }))
      )
      if (error) throw new Error(`Erro produtos: ${error.message}`)
    }

    // 5. Contas Bancárias
    if (state.contasBancarias?.length) {
      const { error } = await supabase.from('contas_bancarias').upsert(
        state.contasBancarias.map((c: any) => ({
          id: mapId(c.id),
          user_id: userId,
          nome: c.nome,
          banco: c.banco,
          agencia: c.agencia,
          conta: c.conta,
          tipo: c.tipo,
          saldo: c.saldo,
          fonte: c.fonte || 'pessoal',
          ativa: c.ativa !== false,
          cor: c.cor
        }))
      )
      if (error) throw new Error(`Erro contas bancarias: ${error.message}`)
    }

    // 6. Transações
    if (state.transacoesBancarias?.length) {
      const { error } = await supabase.from('transacoes_bancarias').upsert(
        state.transacoesBancarias.map((t: any) => ({
          id: mapId(t.id),
          user_id: userId,
          conta_bancaria_id: mapId(t.contaBancariaId),
          data: t.data,
          tipo: t.tipo,
          valor: t.valor,
          descricao: t.descricao,
          categoria: t.categoria,
          conciliada: t.conciliada !== false
        }))
      )
      if (error) throw new Error(`Erro transacoes: ${error.message}`)
    }

    // 7. Planejamentos e Aportes
    if (state.planejamentos?.length) {
      const { error } = await supabase.from('planejamentos').upsert(
        state.planejamentos.map((p: any) => ({
          id: mapId(p.id),
          user_id: userId,
          nome: p.nome,
          tipo: p.tipo,
          descricao: p.descricao,
          valor_meta: p.valorMeta,
          valor_atual: p.valorAtual,
          data_inicio: p.dataInicio,
          data_alvo: p.dataAlvo,
          aporte_mensal: p.aporteMensal,
          fonte: p.fonte,
          cor: p.cor,
          icone: p.icone,
          ativo: p.ativo !== false
        }))
      )
      if (error) throw new Error(`Erro planejamentos: ${error.message}`)

      // Aportes de planejamento
      const aportes: any[] = []
      state.planejamentos.forEach((p: any) => {
        if (p.historico?.length) {
          p.historico.forEach((a: any) => {
            aportes.push({
              id: mapId(a.id),
              planejamento_id: mapId(p.id),
              data: a.data,
              valor: a.valor,
              descricao: a.descricao
            })
          })
        }
      })

      if (aportes.length) {
        const { error: errAportes } = await supabase.from('planejamento_aportes').upsert(aportes)
        if (errAportes) throw new Error(`Erro aportes: ${errAportes.message}`)
      }
    }

    // 8. Contas Pagar
    if (state.contasPagar?.length) {
      const { error } = await supabase.from('contas_pagar').upsert(
        state.contasPagar.map((c: any) => ({
          id: mapId(c.id),
          user_id: userId,
          descricao: c.descricao,
          valor: c.valor,
          vencimento: c.vencimento,
          status: c.status,
          categoria: c.categoria,
          conta_bancaria_id: mapId(c.contaBancariaId),
          data_pagamento: c.dataPagamento || null,
          valor_pago: c.valorPago || null,
          comprovante_url: c.comprovanteUrl || null,
          observacoes: c.observacoes || null,
          mes_referencia: c.mesReferencia || null,
          ano_referencia: c.anoReferencia || null,
          origem: c.origem || 'manual',
          origem_id: mapId(c.origemId),
          fonte_renda_id: mapId(c.fonteRendaId),
          pessoa_id: mapId(c.pessoaId),
          recorrente: c.recorrente === true
        }))
      )
      if (error) throw new Error(`Erro contas_pagar: ${error.message}`)
    }

    // 9. Contas Receber & Pagamentos Recebidos
    if (state.contasReceber?.length) {
      const { error } = await supabase.from('contas_receber').upsert(
        state.contasReceber.map((c: any) => ({
          id: mapId(c.id),
          user_id: userId,
          descricao: c.descricao,
          valor: c.valor,
          vencimento: c.vencimento,
          status: c.status,
          pessoa_id: mapId(c.pessoaId),
          conta_bancaria_id: mapId(c.contaBancariaId),
          valor_recebido: c.valorRecebido || 0,
          data_recebimento: c.dataRecebimento || null,
          observacoes: c.observacoes || null,
          itens: c.itens || [],
          parcela_atual: c.parcelaAtual || 1,
          total_parcelas: c.totalParcelas || 1,
          grupo_id: mapId(c.grupoId)
        }))
      )
      if (error) throw new Error(`Erro contas_receber: ${error.message}`)

      const pagamentosReceber: any[] = []
      state.contasReceber.forEach((c: any) => {
        if (c.pagamentosRecebidos?.length) {
          c.pagamentosRecebidos.forEach((p: any) => {
            pagamentosReceber.push({
              id: mapId(p.id),
              conta_receber_id: mapId(c.id),
              data: p.data,
              valor: p.valor,
              forma_pagamento: p.formaPagamento,
              observacao: p.observacao || null
            })
          })
        }
      })
      if (pagamentosReceber.length) {
        const { error: errPR } = await supabase.from('pagamentos_recebidos').upsert(pagamentosReceber)
        if (errPR) throw new Error(`Erro pagamentos recebidos: ${errPR.message}`)
      }
    }

    // Limpar o localStorage antigo após migração bem sucedida!
    localStorage.removeItem('gestor-financeiro-v2')
    localStorage.setItem('migrated-to-supabase', 'true')

    return { success: true }
  } catch (error: any) {
    console.error('Migration failed:', error)
    return { success: false, message: error.message }
  }
}
