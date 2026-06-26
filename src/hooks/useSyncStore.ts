import { useEffect, useRef, useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { loadFromCloud, saveToCloud } from '../lib/syncStore'

export function useSyncStore(userId: string | null) {
  const [synced, setSynced] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canSave = useRef(false)

  useEffect(() => {
    if (!userId) {
      setSynced(false)
      canSave.current = false
      return
    }

    canSave.current = false
    setSynced(false)

    // Carrega da nuvem; mesmo se falhar, libera o app (fallback para localStorage)
    loadFromCloud(userId)
      .catch(err => console.error('[sync] loadFromCloud inesperado:', err))
      .finally(() => {
        canSave.current = true
        setSynced(true)
      })

    // Salva na nuvem 2s após qualquer mudança no store
    const unsub = useFinanceStore.subscribe(() => {
      if (!canSave.current) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveToCloud(userId), 2000)
    })

    return () => {
      unsub()
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [userId])

  return synced
}
