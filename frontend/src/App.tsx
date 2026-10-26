import { Navigate, Route, Routes } from 'react-router-dom'
import { CadastroHemocentroPage } from './features/admin/CadastroHemocentroPage'
import { HemocentrosPage } from './features/admin/HemocentrosPage'
import { CadastroPage } from './features/auth/CadastroPage'
import { LoginPage } from './features/auth/LoginPage'
import { PrimeiroAcessoPage } from './features/auth/PrimeiroAcessoPage'
import { ProtectedRoute, PublicOnlyRoute } from './features/auth/ProtectedRoute'
import { RecuperarSenhaPage } from './features/auth/RecuperarSenhaPage'
import { AtivacoesPage } from './features/hemocentro/AtivacoesPage'
import { EquipePage } from './features/hemocentro/EquipePage'
import { HorariosPage } from './features/hemocentro/HorariosPage'
import { NecessidadesPage } from './features/hemocentro/NecessidadesPage'
import { HomePage } from './features/home/HomePage'
import { AgendaPage } from './features/medico/AgendaPage'
import { AtendimentosPage } from './features/medico/AtendimentosPage'
import { HistoricoPacientePage } from './features/medico/HistoricoPacientePage'
import { DoarPage } from './features/paciente/DoarPage'
import { HemocentroPage } from './features/paciente/HemocentroPage'
import { PainelPage } from './features/paciente/PainelPage'

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
      </Route>

      {/* As 3 áreas do paciente: Apresentação e Doar são públicas; o Painel exige login. */}
      <Route path="/" element={<HomePage />} />
      <Route path="/doar" element={<DoarPage />} />
      <Route path="/doar/:id" element={<HemocentroPage />} />

      <Route element={<ProtectedRoute perfis={['PACIENTE']} />}>
        <Route path="/painel" element={<PainelPage />} />
      </Route>

      <Route element={<ProtectedRoute papeis={['MEDICO']} />}>
        <Route path="/medico" element={<AgendaPage />} />
        <Route path="/medico/atendimentos" element={<AtendimentosPage />} />
        <Route path="/medico/pacientes/:id" element={<HistoricoPacientePage />} />
      </Route>

      <Route element={<ProtectedRoute papeis={['ADMIN_HEMOCENTRO']} />}>
        <Route path="/hemocentro" element={<HorariosPage />} />
        <Route path="/hemocentro/necessidades" element={<NecessidadesPage />} />
        <Route path="/hemocentro/atendimentos" element={<AtendimentosPage />} />
        <Route path="/hemocentro/ativacoes" element={<AtivacoesPage />} />
        <Route path="/hemocentro/equipe" element={<EquipePage />} />
        <Route path="/hemocentro/pacientes/:id" element={<HistoricoPacientePage />} />
      </Route>

      <Route element={<ProtectedRoute perfis={['ADMIN_PLATAFORMA']} />}>
        <Route path="/admin" element={<HemocentrosPage />} />
        <Route path="/admin/hemocentros/novo" element={<CadastroHemocentroPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/primeiro-acesso" element={<PrimeiroAcessoPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
