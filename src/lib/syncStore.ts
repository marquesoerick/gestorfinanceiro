import { supabase } from './supabase'
import { useFinanceStore } from '../store/useFinanceStore'

// Campos do store que devem ser sincronizados (exclui funções)
const SYNC_KEYS = [
  'contasPagar', 'contasReceber', 'transacoesBancarias', 'dividas',
  'planejamentos', 'fontesRenda', 'fonteRendaCategorias', 'produtos',
  'pessoas', 'provisionamentos', 'contasBancarias', 'mesesFechados',
  'mesAtivo', 'anoAtivo',
] as const

type SyncKey = typeof SYNC_KEYS[number]

export async function loadFromCloud(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_snapshots')
    .select('data')
    .eq('user_id', userId)
    .single()

  if (error || !data?.data) {
    // Nenhum dado na nuvem — faz upload do localStorage atual
    await saveToCloud(userId)
    return false
  }

  const snapshot = data.data as Record<string, unknown>
  const update: Partial<Record<SyncKey, unknown>> = {}
  for (const key of SYNC_KEYS) {
    if (key in snapshot) update[key] = snapshot[key]
  }
  useFinanceStore.setState(update as Parameters<typeof useFinanceStore.setState>[0])
  return true
}

export async function saveToCloud(userId: string): Promise<void> {
  const state = useFinanceStore.getState() as Record<string, unknown>
  const snapshot: Partial<Record<SyncKey, unknown>> = {}
  for (const key of SYNC_KEYS) {
    snapshot[key] = state[key]
  }

  await supabase.from('user_snapshots').upsert(
    { user_id: userId, data: snapshot, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
}
