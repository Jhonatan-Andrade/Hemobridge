import { useEffect, useId, useRef, useState } from 'react'
import type { Identity, ProfessionalRole } from '../types/domain'
import { BrandLogo, Icon, RouteLink } from './ui'
import type { Navigate } from './ui'
import { getPrimaryNavigationItems } from './navigation-items'
import '../styles/unified-header.css'

export type UnifiedHeaderProps = {
  identity: Identity
  route: string
  navigate: Navigate
  professionalRole: ProfessionalRole
  onTour?: () => void
}

type NavigationItem = {
  to: string
  label: string
  icon: 'home' | 'community' | 'dashboard' | 'profile' | 'calendar' | 'activity' | 'exams' | 'map'
}

const professionalSections: Record<ProfessionalRole, NavigationItem[]> = {
  doctor: [
    { to: 'professional', label: 'Minha agenda', icon: 'calendar' },
    { to: 'professional/attendance', label: 'Atendimento', icon: 'activity' },
    { to: 'professional/exams', label: 'Exames', icon: 'exams' },
  ],
  representative: [
    { to: 'professional/needs', label: 'Necessidades', icon: 'activity' },
    { to: 'professional/stock', label: 'Estoque', icon: 'activity' },
  ],
  administrator: [
    { to: 'professional/admin', label: 'Mapa regional', icon: 'map' },
    { to: 'professional/moderation', label: 'Moderação', icon: 'community' },
  ],
}

function activePrimaryRoute(route: string) {
  if (route.startsWith('post/')) return 'community'
  if (route === 'external-locations') return 'external-locations'
  if (route.startsWith('external-')) return 'dashboard'
  return route
}

export function UnifiedHeader({
  identity,
  route,
  navigate,
  professionalRole,
  onTour,
}: UnifiedHeaderProps) {
  const railId = useId()
  const menuId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const railToggleRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCompact, setIsCompact] = useState(() => window.matchMedia('(max-width: 899px)').matches)
  const primary = getPrimaryNavigationItems(identity)
  const active = activePrimaryRoute(route)
  const roleLabel =
    identity === 'patient'
      ? 'Área do paciente'
      : identity === 'professional'
        ? professionalRole === 'doctor'
          ? 'Área do médico'
          : professionalRole === 'representative'
            ? 'Área do hospital'
            : 'Área administrativa'
        : 'Explorar HemoBridge'

  useEffect(() => {
    const media = window.matchMedia('(max-width: 899px)')
    const update = () => {
      setIsCompact(media.matches)
      setIsExpanded(false)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!isExpanded) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false)
        const toggle = isCompact ? toggleRef.current : railToggleRef.current
        toggle?.focus()
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      if (
        isCompact &&
        !menuRef.current?.contains(event.target as Node) &&
        !toggleRef.current?.contains(event.target as Node)
      )
        setIsExpanded(false)
    }
    const media = window.matchMedia('(max-width: 899px)')
    const onResize = () => setIsExpanded(false)
    const onHistory = () => setIsExpanded(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('popstate', onHistory)
    window.addEventListener('hashchange', onHistory)
    media.addEventListener('change', onResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('popstate', onHistory)
      window.removeEventListener('hashchange', onHistory)
      media.removeEventListener('change', onResize)
    }
  }, [isExpanded, isCompact])

  function followRoute() {
    setIsExpanded(false)
  }

  return (
    <>
      <aside
        className="hb-unified-rail"
        data-expanded={isExpanded}
        aria-label="Navegação HemoBridge"
      >
        <div className="hb-unified-rail-inner" id={railId}>
          <button
            ref={railToggleRef}
            className="hb-unified-rail-toggle"
            type="button"
            aria-label={isExpanded ? 'Recolher navegação' : 'Expandir navegação'}
            aria-controls={railId}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <span className="hb-unified-menu-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="hb-unified-rail-label">Menu</span>
          </button>
          <p className="hb-unified-rail-role">{roleLabel}</p>
          <nav className="hb-unified-rail-nav" aria-label="Navegação principal">
            {primary.map(({ to, label, icon }) => (
              <RouteLink
                key={to}
                to={to}
                navigate={navigate}
                aria-label={label}
                aria-current={active === to ? 'page' : undefined}
                onClick={followRoute}
              >
                <Icon name={icon} />
                <span className="hb-unified-rail-label">{label}</span>
              </RouteLink>
            ))}
          </nav>
          {identity === 'professional' && professionalSections[professionalRole].length > 0 && (
            <div className="hb-unified-rail-group">
              <p className="hb-unified-rail-group-title">Área profissional</p>
              <nav className="hb-unified-rail-nav" aria-label="Áreas profissionais">
                {professionalSections[professionalRole].map(({ to, label, icon }) => (
                  <RouteLink
                    key={to}
                    to={to}
                    navigate={navigate}
                    aria-label={label}
                    aria-current={route === to ? 'page' : undefined}
                    onClick={followRoute}
                  >
                    <Icon name={icon} />
                    <span className="hb-unified-rail-label">{label}</span>
                  </RouteLink>
                ))}
              </nav>
            </div>
          )}
          <div className="hb-unified-rail-group hb-unified-rail-more">
            <p className="hb-unified-rail-group-title">Mais opções</p>
            <nav className="hb-unified-rail-nav" aria-label="Mais opções">
              <RouteLink
                to="accessibility"
                navigate={navigate}
                aria-label="Acessibilidade"
                aria-current={route === 'accessibility' ? 'page' : undefined}
                onClick={followRoute}
              >
                <Icon name="accessibility" />
                <span className="hb-unified-rail-label">Acessibilidade</span>
              </RouteLink>
              {identity === 'visitor' && (
                <RouteLink
                  to="register"
                  navigate={navigate}
                  aria-label="Fazer pré-cadastro"
                  aria-current={route === 'register' ? 'page' : undefined}
                  onClick={followRoute}
                >
                  <Icon name="register" />
                  <span className="hb-unified-rail-label">Fazer pré-cadastro</span>
                </RouteLink>
              )}
              {onTour && (
                <button
                  type="button"
                  aria-label="Ver tour de orientação"
                  onClick={() => {
                    followRoute()
                    onTour()
                  }}
                >
                  <Icon name="help" />
                  <span className="hb-unified-rail-label">Ver tour</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      </aside>
      <header className="hb-unified-header">
        <div className="hb-unified-header-inner">
          <div className="hb-unified-header-brand" onClickCapture={() => setIsExpanded(false)}>
            <button
              ref={toggleRef}
              className="hb-unified-menu-button"
              type="button"
              aria-label={isExpanded ? 'Fechar menu' : 'Abrir menu'}
              aria-controls={menuId}
              aria-expanded={isExpanded}
              onClick={() => {
                const next = !isExpanded
                setIsExpanded(next)
                if (next)
                  requestAnimationFrame(() =>
                    menuRef.current?.querySelector<HTMLElement>('a, button')?.focus(),
                  )
              }}
            >
              <span className="hb-unified-menu-lines" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
            <BrandLogo navigate={navigate} />
          </div>
          <div className="hb-unified-header-actions">
            <span className="hb-unified-header-context">{roleLabel}</span>
            <RouteLink
              to="accessibility"
              navigate={navigate}
              className="hb-unified-header-accessibility"
              aria-label="Acessibilidade"
              title="Acessibilidade"
              aria-current={route === 'accessibility' ? 'page' : undefined}
              onClick={followRoute}
            >
              <Icon name="accessibility" />
              <span>Acessibilidade</span>
            </RouteLink>
            {onTour && (
              <button
                className="hb-unified-tour-button"
                type="button"
                aria-label="Ver tour"
                onClick={() => {
                  followRoute()
                  onTour()
                }}
              >
                <Icon name="help" />
                <span>Ver tour</span>
              </button>
            )}
          </div>
        </div>
        <nav
          ref={menuRef}
          id={menuId}
          className="hb-unified-menu"
          aria-label="Menu principal"
          hidden={!isExpanded}
        >
          <p className="hb-unified-menu-role">{roleLabel}</p>
          <div className="hb-unified-menu-links">
            {primary.map(({ to, label, icon }) => (
              <RouteLink
                key={to}
                to={to}
                navigate={navigate}
                aria-current={active === to ? 'page' : undefined}
                onClick={followRoute}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </RouteLink>
            ))}
          </div>
          {identity === 'professional' && professionalSections[professionalRole].length > 0 && (
            <>
              <p className="hb-unified-menu-group-title">Área profissional</p>
              <div className="hb-unified-menu-links">
                {professionalSections[professionalRole].map(({ to, label, icon }) => (
                  <RouteLink
                    key={to}
                    to={to}
                    navigate={navigate}
                    aria-current={route === to ? 'page' : undefined}
                    onClick={followRoute}
                  >
                    <Icon name={icon} />
                    <span>{label}</span>
                  </RouteLink>
                ))}
              </div>
            </>
          )}
          <p className="hb-unified-menu-group-title">Mais opções</p>
          <div className="hb-unified-menu-links">
            {identity === 'visitor' && (
              <RouteLink
                to="register"
                navigate={navigate}
                aria-current={route === 'register' ? 'page' : undefined}
                onClick={followRoute}
              >
                <Icon name="register" />
                <span>Fazer pré-cadastro</span>
              </RouteLink>
            )}
            {onTour && (
              <button
                type="button"
                onClick={() => {
                  followRoute()
                  onTour()
                }}
              >
                <Icon name="help" />
                <span>Ver tour</span>
              </button>
            )}
          </div>
        </nav>
      </header>
    </>
  )
}
