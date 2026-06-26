import { supabase } from './supabase'
import { useFinanceStore } from '../store/useFinanceStore'

const storeHasData = () => {
  const s = useFinanceStore.getState()
  return (
    s.contasPagar.length > 0 || s.contasReceber.length > 0 ||
    s.dividas.length > 0    || s.planejamentos.length > 0  ||
    s.pessoas.length > 0    || s.contasBancarias.length > 0
  )
}

export async function loadFromCloud(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('user_snapshots')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle()         // retorna null sem erro se não há linha

  if (error) {
    console.error('[sync] erro ao buscar snapshot:', error.message)
    return
  }

  if (!data) {
    // Nenhuma linha na nuvem — sobe dados locais se existirem
    if (storeHasData()) await saveToCloud(userId)
    return
  }

  const snapshot = data.data as Record<string, unknown>
  const cloudHasData = Object.values(snapshot).some(
    v => Array.isArray(v) && v.length > 0
  )

  if (!cloudHasData && storeHasData()) {
    // Nuvem vazia mas local tem dados — não sobrescreve, sobe local
    await saveToCloud(userId)
    return
  }

  // Hidrata o store com dados da nuvem
  useFinanceStore.setState(snapshot as Parameters<typeof useFinanceStore.setState>[0])
}

export async function saveToCloud(userId: string): Promise<void> {
  const s = useFinanceStore.getState()
  const snapshot = {
    contasPagar:          s.contasPagar,
    contasReceber:        s.contasReceber,
    transacoesBancarias:  s.transacoesBancarias,
    dividas:              s.dividas,
    planejamentos:        s.planejamentos,
    fontesRenda:          s.fontesRenda,
    fonteRendaCategorias: s.fonteRendaCategorias,
    produtos:             s.produtos,
    pessoas:              s.pessoas,
    provisionamentos:     s.provisionamentos,
    contasBancarias:      s.contasBancarias,
    mesesFechados:        s.mesesFechados,
    mesAtivo:             s.mesAtivo,
    anoAtivo:             s.anoAtivo,
  }

  const { error } = await supabase
    .from('user_snapshots')
    .upsert(
      { user_id: userId, data: snapshot, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) console.error('[sync] erro ao salvar snapshot:', error.message)
}
