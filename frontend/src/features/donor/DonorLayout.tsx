import type { ReactNode } from 'react'
import activityIcon from '../../assets/icons/activity.svg'
import comunidadeIcon from '../../assets/icons/comunidade.svg'
import inicioIcon from '../../assets/icons/inicio.svg'
import mapIcon from '../../assets/icons/map.svg'
import painelIcon from '../../assets/icons/painel.svg'
import { AppShell } from '../../components/layout/AppShell'
import type { NavItem } from '../../components/layout/NavigationRail'
import { SairButton } from '../auth/SairButton'

// Figma: Navegação/desktop/patient (757:8484 / 757:8547) e Overlay menu (468:5150). Comunidade e Perfil
// ficam fora do escopo; Minhas consultas e Meus exames seguem os frames 8:2449 e 8:2461.
const navDoador: NavItem[] = [
  { to: '/doador', label: 'Meu painel', icon: inicioIcon, end: true },
  { to: '/doador/consultas', label: 'Minhas consultas', icon: comunidadeIcon },
  { to: '/doador/exames', label: 'Meus exames', icon: painelIcon },
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
