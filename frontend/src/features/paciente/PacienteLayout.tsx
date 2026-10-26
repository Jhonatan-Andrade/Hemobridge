import type { ReactNode } from 'react'
import inicioIcon from '../../assets/icons/inicio.svg'
import mapIcon from '../../assets/icons/map.svg'
import { AppShell } from '../../components/layout/AppShell'
import type { NavItem } from '../../components/layout/NavigationRail'
import { useAuth } from '../auth/authState'
import { PublicLayout } from '../auth/PublicLayout'
import { SairButton } from '../auth/SairButton'

// As duas áreas logadas do paciente; a Apresentação (/) é pública.
const navPaciente: NavItem[] = [
  { to: '/painel', label: 'Meu painel', icon: inicioIcon, end: true },
  { to: '/doar', label: 'Doar', icon: mapIcon },
]

type Largura = 'form' | 'page'
const larguras: Record<Largura, string> = { form: 'max-w-form', page: 'max-w-page' }

export function PacienteLayout({ children, largura = 'form' }: { children: ReactNode; largura?: Largura }) {
  return (
    <AppShell nav={navPaciente} contexto="Área do paciente" acoes={<SairButton />}>
      <div className={`mx-auto flex w-full flex-col gap-5 ${larguras[largura]}`}>{children}</div>
    </AppShell>
  )
}

/** Páginas públicas (Doar): o paciente logado as vê com o menu da sua área. */
export function LayoutDoar({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  if (usuario?.perfil === 'PACIENTE') return <PacienteLayout largura="page">{children}</PacienteLayout>
  return <PublicLayout largura="page">{children}</PublicLayout>
}
