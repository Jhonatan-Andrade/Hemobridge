import type { ReactNode } from 'react'
import dashboardIcon from '../../assets/icons/dashboard.svg'
import inicioIcon from '../../assets/icons/inicio.svg'
import mapIcon from '../../assets/icons/map.svg'
import perfilIcon from '../../assets/icons/perfil.svg'
import { AppShell } from '../../components/layout/AppShell'
import type { NavItem } from '../../components/layout/NavigationRail'

// Figma: "Rail / Visitante / Desktop". Comunidade fica fora do escopo; no lugar entra Locais (consulta pública).
const navVisitante: NavItem[] = [
  { to: '/entrar', label: 'Entrar', icon: inicioIcon },
  { to: '/locais', label: 'Encontrar locais', icon: mapIcon },
  { to: '/doador', label: 'Meu painel', icon: dashboardIcon },
  { to: '/cadastro', label: 'Pré-cadastro', icon: perfilIcon },
]

/** Telas de acesso: coluna única de 720px (Figma: "Área principal / Auto Layout"). */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell nav={navVisitante} contexto="Cuidado, conexão e acompanhamento">
      <div className="mx-auto flex w-full max-w-form flex-col gap-5">{children}</div>
    </AppShell>
  )
}
