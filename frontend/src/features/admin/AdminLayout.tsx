import type { ReactNode } from 'react'
import comunidadeIcon from '../../assets/icons/comunidade.svg'
import inicioIcon from '../../assets/icons/inicio.svg'
import mapIcon from '../../assets/icons/map.svg'
import painelIcon from '../../assets/icons/painel.svg'
import { AppShell } from '../../components/layout/AppShell'
import type { NavItem } from '../../components/layout/NavigationRail'
import { SairButton } from '../auth/SairButton'

// Figma: HemoBridge / NavigationRail / Administrador (558:5608) — Visão geral, Hospitais, Usuários e
// Relatórios. Relatórios, mapa IBGE, moderação e privacidade ficam fora do escopo (sem API).
// "Cadastrar instituição" é uma tela própria; o layout só é usado nas rotas do perfil Administrador.
const navAdmin: NavItem[] = [
  { to: '/admin', label: 'Painel geral', icon: inicioIcon, end: true },
  { to: '/admin/instituicoes', label: 'Instituições', icon: comunidadeIcon, end: true },
  { to: '/admin/instituicoes/nova', label: 'Cadastrar instituição', icon: mapIcon },
  { to: '/admin/usuarios', label: 'Usuários', icon: painelIcon },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell nav={navAdmin} contexto="Área do administrador" acoes={<SairButton />}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-6">{children}</div>
    </AppShell>
  )
}
