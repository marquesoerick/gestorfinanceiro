import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import { Layout } from './components/Layout/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { ContasPagar } from './pages/ContasPagar'
import { ContasReceber } from './pages/ContasReceber'
import { Conciliacao } from './pages/Conciliacao'
import { Dividas } from './pages/Dividas'
import { Planejamentos } from './pages/Planejamentos'
import { Rendas } from './pages/Rendas'
import { Provisionamento } from './pages/Provisionamento'
import { ContasBancarias } from './pages/ContasBancarias'
import { Configuracoes } from './pages/Configuracoes'
import { ImportarExtrato } from './pages/ImportarExtrato'
import { Pessoas } from './pages/Pessoas'
import { Admin } from './pages/Admin'
import { ResetSenha } from './pages/ResetSenha'
import { migrateLocalStorageToSupabase } from './utils/migration'
import { CloudUpload } from 'lucide-react'

function App() {
  const { currentUserId, initializeAuth, loading } = useAuthStore()
  const [migrating, React_useState] = React.useState(false)
  const [migrationStatus, setMigrationStatus] = React.useState('')
  const [migrationError, setMigrationError] = React.useState('')

  const setMigrating = React_useState

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    if (currentUserId) {
      const hasLocalData = localStorage.getItem('gestor-financeiro-v2') !== null && 
                           localStorage.getItem('migrated-to-supabase') === null
      
      if (hasLocalData) {
        setMigrating(true)
        setMigrationStatus('Sincronizando seus dados antigos com a nuvem...')
        
        migrateLocalStorageToSupabase(currentUserId).then(res => {
          if (res.success) {
            setMigrationStatus('Tudo pronto! Entrando...')
            setTimeout(() => {
              setMigrating(false)
            }, 1500)
          } else {
            setMigrationError('Erro ao migrar dados: ' + res.message)
          }
        })
      }
    }
  }, [currentUserId, setMigrating])

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500 font-bold">Carregando...</div>
  }

  if (migrating) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <CloudUpload size={48} className="text-emerald-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-white text-xl font-bold mb-2">Migração em andamento</h2>
          <p className="text-emerald-400 mb-4">{migrationStatus}</p>
          {migrationError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl max-w-md mx-auto text-sm">
              {migrationError}
              <button onClick={() => setMigrating(false)} className="block mt-4 mx-auto px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors">
                Ignorar e Continuar
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Always accessible */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/reset-senha" element={<ResetSenha />} />

        {/* Auth-gated routes */}
        {!currentUserId ? (
          <Route path="*" element={<Login />} />
        ) : (
          <>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="contas-pagar" element={<ContasPagar />} />
              <Route path="contas-receber" element={<ContasReceber />} />
              <Route path="conciliacao" element={<Conciliacao />} />
              <Route path="dividas" element={<Dividas />} />
              <Route path="planejamentos" element={<Planejamentos />} />
              <Route path="rendas" element={<Rendas />} />
              <Route path="provisionamento" element={<Provisionamento />} />
              <Route path="contas-bancarias" element={<ContasBancarias />} />
              <Route path="importar-extrato" element={<ImportarExtrato />} />
              <Route path="pessoas" element={<Pessoas />} />
              <Route path="configuracoes" element={<Configuracoes />} />
            </Route>
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App
