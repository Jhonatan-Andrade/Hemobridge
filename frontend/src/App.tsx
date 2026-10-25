import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { PreCadastroPage } from './features/auth/PreCadastroPage'
import { PrimeiroAcessoPage } from './features/auth/PrimeiroAcessoPage'
import { ProtectedRoute, PublicOnlyRoute } from './features/auth/ProtectedRoute'
import { RecuperarSenhaPage } from './features/auth/RecuperarSenhaPage'
import { SemAcessoPage } from './features/auth/SemAcessoPage'
import { NeedsPage } from './features/bloodbank/NeedsPage'
import { DonorDashboardPage } from './features/donor/DonorDashboardPage'
import { HospitalDetailPage } from './features/donor/HospitalDetailPage'
import { RecommendedPage } from './features/donor/RecommendedPage'
import { SearchPage } from './features/donor/SearchPage'

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/cadastro" element={<PreCadastroPage />} />
        <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
      </Route>

      {/* Consulta pública de bancos de sangue */}
      <Route path="/locais" element={<SearchPage />} />
      <Route path="/locais/:id" element={<HospitalDetailPage />} />

      <Route element={<ProtectedRoute perfis={['PACIENTE']} />}>
        <Route path="/doador" element={<DonorDashboardPage />} />
        <Route path="/doador/recomendados" element={<RecommendedPage />} />
      </Route>

      <Route element={<ProtectedRoute perfis={['REPRESENTANTE']} />}>
        <Route path="/hospital" element={<Navigate to="/hospital/necessidades" replace />} />
        <Route path="/hospital/necessidades" element={<NeedsPage />} />
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
