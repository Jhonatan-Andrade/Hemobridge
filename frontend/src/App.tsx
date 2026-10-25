import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { PreCadastroPage } from './features/auth/PreCadastroPage'
import { PrimeiroAcessoPage } from './features/auth/PrimeiroAcessoPage'
import { ProtectedRoute, PublicOnlyRoute } from './features/auth/ProtectedRoute'
import { RecuperarSenhaPage } from './features/auth/RecuperarSenhaPage'
import { SemAcessoPage } from './features/auth/SemAcessoPage'
import { InstituicoesPage } from './features/admin/InstituicoesPage'
import { PainelGeralPage } from './features/admin/PainelGeralPage'
import { UsuariosPage } from './features/admin/UsuariosPage'
import { DashboardPage } from './features/bloodbank/DashboardPage'
import { NeedsPage } from './features/bloodbank/NeedsPage'
import { DonorDashboardPage } from './features/donor/DonorDashboardPage'
import { HospitalDetailPage } from './features/donor/HospitalDetailPage'
import { RecommendedPage } from './features/donor/RecommendedPage'
import { SearchPage } from './features/donor/SearchPage'
import { BoasVindasPage } from './features/home/BoasVindasPage'
import { HomePage } from './features/home/HomePage'

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/cadastro" element={<PreCadastroPage />} />
        <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
      </Route>

      {/* Home pública e orientação do visitante (estáticas) */}
      <Route path="/" element={<HomePage />} />
      <Route path="/boas-vindas" element={<BoasVindasPage />} />

      {/* Consulta pública de bancos de sangue */}
      <Route path="/locais" element={<SearchPage />} />
      <Route path="/locais/:id" element={<HospitalDetailPage />} />

      <Route element={<ProtectedRoute perfis={['PACIENTE']} />}>
        <Route path="/doador" element={<DonorDashboardPage />} />
        <Route path="/doador/recomendados" element={<RecommendedPage />} />
      </Route>

      <Route element={<ProtectedRoute perfis={['REPRESENTANTE']} />}>
        <Route path="/hospital" element={<DashboardPage />} />
        <Route path="/hospital/necessidades" element={<NeedsPage />} />
      </Route>

      <Route element={<ProtectedRoute perfis={['ADMINISTRADOR']} />}>
        <Route path="/admin" element={<PainelGeralPage />} />
        <Route path="/admin/instituicoes" element={<InstituicoesPage />} />
        <Route path="/admin/usuarios" element={<UsuariosPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/primeiro-acesso" element={<PrimeiroAcessoPage />} />
        <Route path="/sem-acesso" element={<SemAcessoPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
