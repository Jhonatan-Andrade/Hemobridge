import type { ReactNode } from 'react'
import comunidadeIcon from '../../assets/icons/comunidade.svg'
import inicioIcon from '../../assets/icons/inicio.svg'
import painelIcon from '../../assets/icons/painel.svg'
import { AppShell } from '../../components/layout/AppShell'
import type { NavItem } from '../../components/layout/NavigationRail'
import { SairButton } from '../auth/SairButton'

// Figma: Web desktop / Médico / Overlay menu (558:5767) — Agenda, Atendimento, Exames e Perfil.
// Perfil fica fora do escopo (sem API); o botão Sair fica no cabeçalho.
const navMedico: NavItem[] = [
  { to: '/medico', label: 'Agenda', icon: inicioIcon, end: true },
  { to: '/medico/atendimentos', label: 'Atendimento', icon: comunidadeIcon },
  { to: '/medico/exames', label: 'Exames', icon: painelIcon },
]

export function MedicoLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell nav={navMedico} contexto="Área do médico" acoes={<SairButton />}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-6">{children}</div>
    </AppShell>
  )
}
