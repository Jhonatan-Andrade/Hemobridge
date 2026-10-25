import type { ReactNode } from 'react'
import activityIcon from '../../assets/icons/activity.svg'
import communityIcon from '../../assets/icons/community.svg'
import dashboardIcon from '../../assets/icons/dashboard.svg'
import { AppShell } from '../../components/layout/AppShell'
import type { NavItem } from '../../components/layout/NavigationRail'
import { SairButton } from '../auth/SairButton'

// Figma: Navegação/desktop/representative (757:8887 / 757:8944). Estoque, doações e
// relatórios ficam fora do escopo desta entrega.
const navHospital: NavItem[] = [
  { to: '/hospital', label: 'Painel do hospital', icon: dashboardIcon, end: true },
  { to: '/hospital/necessidades', label: 'Necessidades', icon: activityIcon },
  { to: '/hospital/equipe-medica', label: 'Equipe médica', icon: communityIcon },
]

export function BloodBankLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell nav={navHospital} contexto="Área do hospital" acoes={<SairButton />}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-6">{children}</div>
    </AppShell>
  )
}
