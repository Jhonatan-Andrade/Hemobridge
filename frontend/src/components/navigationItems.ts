export type NavigationIdentity = 'visitor' | 'patient' | 'professional'
export type PrimaryNavigationItem = { to: string; label: string; icon: 'home' | 'community' | 'dashboard' | 'profile' | 'map' }

export function getPrimaryNavigationItems(identity: NavigationIdentity): PrimaryNavigationItem[] {
  if (identity === 'patient') return [
    { to: 'home', label: 'Início', icon: 'home' },
    { to: 'community', label: 'Comunidade', icon: 'community' },
    { to: 'dashboard', label: 'Meu painel', icon: 'dashboard' },
    { to: 'external-locations', label: 'Locais', icon: 'map' },
    { to: 'profile', label: 'Perfil', icon: 'profile' },
  ]
  if (identity === 'professional') return [
    { to: 'home', label: 'Início', icon: 'home' },
    { to: 'community', label: 'Comunidade', icon: 'community' },
    { to: 'professional', label: 'Área profissional', icon: 'profile' },
  ]
  return [
    { to: 'home', label: 'Início', icon: 'home' },
    { to: 'community', label: 'Comunidade', icon: 'community' },
    { to: 'login', label: 'Entrar', icon: 'profile' },
  ]
}
