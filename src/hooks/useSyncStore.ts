import { useEffect, useRef, useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { loadFromCloud, saveToCloud } from '../lib/syncStore'

export function useSyncStore(userId: string | null) {
  const [synced, setSynced] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canSave = useRef(false)

  useEffect(() => {
    if (!userId) { setSynced(false); canSave.current = false; return }

    canSave.current = false
    setSynced(false)

    // 1. Carrega dados da nuvem ao logar
    loadFromCloud(userId).then(() => {
      canSave.current = true
      setSynced(true)
    })

    // 2. Qualquer mudança no store → debounce de 2s → salva na nuvem
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
