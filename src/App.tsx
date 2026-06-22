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

function App() {
  const { currentUserId } = useAuthStore()

  if (!currentUserId) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
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
      </Routes>
    </BrowserRouter>
  )
}

export default App
