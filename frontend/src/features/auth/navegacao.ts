import activityIcon from '../../assets/icons/activity.svg'
import communityIcon from '../../assets/icons/community.svg'
import comunidadeIcon from '../../assets/icons/comunidade.svg'
import inicioIcon from '../../assets/icons/inicio.svg'
import inventoryIcon from '../../assets/icons/inventory.svg'
import mapIcon from '../../assets/icons/map.svg'
import painelIcon from '../../assets/icons/painel.svg'
import perfilIcon from '../../assets/icons/perfil.svg'
import type { UsuarioAutenticado } from '../../api/types'
import type { NavItem } from '../../components/layout/NavigationRail'
import { navVisitante } from './navVisitante'

// A Apresentação (/) aparece no menu de todos os perfis.
const inicio: NavItem = { to: '/', label: 'Início', icon: inicioIcon, end: true }

export const navPaciente: NavItem[] = [
  inicio,
  { to: '/painel', label: 'Meu painel', icon: painelIcon, end: true },
  { to: '/doar', label: 'Doar', icon: mapIcon },
]

// Figma: Web desktop / Médico / Overlay menu (558:5767). No novo escopo o médico tem só a agenda do
// dia e os atendimentos já registrados; o histórico do paciente abre a partir deles.
export const navMedico: NavItem[] = [
  inicio,
  { to: '/medico', label: 'Agenda do dia', icon: painelIcon, end: true },
  { to: '/medico/atendimentos', label: 'Atendimentos', icon: activityIcon },
]

// Admin do hemocentro (assume as funções do antigo representante). Figma: Navegação/desktop/representative (757:8887).
export const navHemocentro: NavItem[] = [
  inicio,
  { to: '/hemocentro', label: 'Horários e vagas', icon: inventoryIcon, end: true },
  { to: '/hemocentro/necessidades', label: 'Necessidades', icon: activityIcon },
  { to: '/hemocentro/atendimentos', label: 'Atendimentos', icon: perfilIcon },
  { to: '/hemocentro/ativacoes', label: 'Ativação de contas', icon: painelIcon },
  { to: '/hemocentro/equipe', label: 'Equipe', icon: communityIcon },
]

// Figma: HemoBridge / NavigationRail / Administrador (558:5608), reduzido ao escopo mínimo:
// lista de hemocentros e cadastro de um novo (RF15).
export const navAdmin: NavItem[] = [
  inicio,
  { to: '/admin', label: 'Hemocentros', icon: comunidadeIcon, end: true },
  { to: '/admin/hemocentros/novo', label: 'Cadastrar hemocentro', icon: mapIcon },
]

const navPrimeiroAcesso: NavItem[] = [inicio, { to: '/primeiro-acesso', label: 'Primeiro acesso', icon: perfilIcon }]

/** Menu de quem está na Apresentação: o da própria área, ou o do visitante. */
export function navDoUsuario(usuario: UsuarioAutenticado | null): NavItem[] {
  if (!usuario) return navVisitante
  if (usuario.senhaProvisoria) return navPrimeiroAcesso
  if (usuario.perfil === 'PACIENTE') return navPaciente
  if (usuario.perfil === 'ADMIN_PLATAFORMA') return navAdmin
  return usuario.papel === 'MEDICO' ? navMedico : navHemocentro
}
