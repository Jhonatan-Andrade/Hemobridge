import type { ReactNode } from 'react'
import comunidadeIcon from '../../assets/icons/comunidade.svg'
import mapIcon from '../../assets/icons/map.svg'
import { AppShell } from '../../components/layout/AppShell'
import type { NavItem } from '../../components/layout/NavigationRail'
import { SairButton } from '../auth/SairButton'

// Figma: HemoBridge / NavigationRail / Administrador (558:5608), reduzido ao escopo mínimo:
// lista de hemocentros e cadastro de um novo (RF15).
const navAdmin: NavItem[] = [
  { to: '/admin', label: 'Hemocentros', icon: comunidadeIcon, end: true },
  { to: '/admin/hemocentros/novo', label: 'Cadastrar hemocentro', icon: mapIcon },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell nav={navAdmin} contexto="Administrador da plataforma" acoes={<SairButton />}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-6">{children}</div>
    </AppShell>
  )
}
