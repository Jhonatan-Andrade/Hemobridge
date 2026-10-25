import type { ReactNode } from 'react'
import activityIcon from '../../assets/icons/activity.svg'
import dashboardIcon from '../../assets/icons/dashboard.svg'
import mapIcon from '../../assets/icons/map.svg'
import { AppShell } from '../../components/layout/AppShell'
import type { NavItem } from '../../components/layout/NavigationRail'
import { SairButton } from '../auth/SairButton'

// Figma: Navegação/desktop/patient (757:8484 / 757:8547). Comunidade e Perfil ficam fora do escopo.
const navDoador: NavItem[] = [
  { to: '/doador', label: 'Meu painel', icon: dashboardIcon, end: true },
  { to: '/doador/recomendados', label: 'Locais recomendados', icon: activityIcon },
  { to: '/locais', label: 'Encontrar locais', icon: mapIcon },
]

type Largura = 'form' | 'wide' | 'page'
const larguras: Record<Largura, string> = { form: 'max-w-form', wide: 'max-w-wide', page: 'max-w-page' }

export function DonorLayout({ children, largura = 'form' }: { children: ReactNode; largura?: Largura }) {
  return (
    <AppShell nav={navDoador} contexto="Área do paciente" acoes={<SairButton />}>
      <div className={`mx-auto flex w-full flex-col gap-5 ${larguras[largura]}`}>{children}</div>
    </AppShell>
  )
}
