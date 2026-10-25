import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { PreCadastroPage } from './features/auth/PreCadastroPage'
import { PrimeiroAcessoPage } from './features/auth/PrimeiroAcessoPage'
import { ProtectedRoute, PublicOnlyRoute } from './features/auth/ProtectedRoute'
import { RecuperarSenhaPage } from './features/auth/RecuperarSenhaPage'
import { SemAcessoPage } from './features/auth/SemAcessoPage'

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/cadastro" element={<PreCadastroPage />} />
        <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/primeiro-acesso" element={<PrimeiroAcessoPage />} />
        <Route path="/sem-acesso" element={<SemAcessoPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/entrar" replace />} />
    </Routes>
  )
}

export default App
