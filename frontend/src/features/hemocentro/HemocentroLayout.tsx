import type { ReactNode } from 'react'
import activityIcon from '../../assets/icons/activity.svg'
import communityIcon from '../../assets/icons/community.svg'
import inicioIcon from '../../assets/icons/inicio.svg'
import painelIcon from '../../assets/icons/painel.svg'
import { AppShell } from '../../components/layout/AppShell'
import type { NavItem } from '../../components/layout/NavigationRail'
import { useAuth } from '../auth/authState'
import { SairButton } from '../auth/SairButton'

// Admin do hemocentro (assume as funções do antigo representante). Figma: Navegação/desktop/representative (757:8887).
const navHemocentro: NavItem[] = [
  { to: '/hemocentro', label: 'Horários e vagas', icon: inicioIcon, end: true },
  { to: '/hemocentro/necessidades', label: 'Necessidades', icon: activityIcon },
  { to: '/hemocentro/ativacoes', label: 'Ativação de contas', icon: painelIcon },
  { to: '/hemocentro/equipe', label: 'Equipe', icon: communityIcon },
]

export function HemocentroLayout({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  return (
    <AppShell nav={navHemocentro} contexto={`Admin · ${usuario?.hemocentro?.nome ?? ''}`} acoes={<SairButton />}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-6">{children}</div>
    </AppShell>
  )
}
