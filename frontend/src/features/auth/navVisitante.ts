import activityIcon from '../../assets/icons/activity.svg'
import inicioIcon from '../../assets/icons/inicio.svg'
import mapIcon from '../../assets/icons/map.svg'
import perfilIcon from '../../assets/icons/perfil.svg'
import type { NavItem } from '../../components/layout/NavigationRail'

// Figma: "Overlay menu / Visitante" (468:5148). Comunidade e Acessibilidade ficam fora do escopo;
// no lugar entra Encontrar locais (consulta pública).
export const navVisitante: NavItem[] = [
  { to: '/', label: 'Início', icon: inicioIcon, end: true },
  { to: '/locais', label: 'Encontrar locais', icon: mapIcon },
  { to: '/entrar', label: 'Entrar', icon: perfilIcon },
  { to: '/cadastro', label: 'Fazer pré-cadastro', icon: activityIcon },
]
