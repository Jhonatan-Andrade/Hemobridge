import type { ReactNode } from 'react'
import inicioIcon from '../../assets/icons/inicio.svg'
import { AppShell } from '../../components/layout/AppShell'
import type { NavItem } from '../../components/layout/NavigationRail'
import { useAuth } from '../auth/authState'
import { SairButton } from '../auth/SairButton'

// Figma: Web desktop / Médico / Overlay menu (558:5767). No novo escopo o médico tem só a agenda do
// dia; o histórico do paciente abre a partir dela. O botão Sair fica no cabeçalho.
const navMedico: NavItem[] = [{ to: '/medico', label: 'Agenda do dia', icon: inicioIcon, end: true }]

export function MedicoLayout({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  return (
    <AppShell nav={navMedico} contexto={`Médico · ${usuario?.hemocentro?.nome ?? ''}`} acoes={<SairButton />}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-6">{children}</div>
    </AppShell>
  )
}
