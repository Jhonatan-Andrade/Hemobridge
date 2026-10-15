import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { Identity, ProfessionalRole } from '../data/fixtures'
import { BrandLogo, Icon, RouteLink } from './ui'
import type { Navigate } from './ui'
import { getPrimaryNavigationItems } from './navigationItems'
import './UnifiedHeader.css'

export type UnifiedHeaderProps = {
  identity: Identity
  route: string
  navigate: Navigate
  professionalRole: ProfessionalRole
  onTour?: () => void
}

const professionalSections: Record<ProfessionalRole, { to: string; label: string; icon: 'calendar' | 'activity' | 'exams' }[]> = {
  doctor: [
    { to: 'professional', label: 'Minha agenda', icon: 'calendar' },
    { to: 'professional/attendance', label: 'Atendimento', icon: 'activity' },
    { to: 'professional/exams', label: 'Exames', icon: 'exams' },
  ],
  representative: [{ to: 'professional/needs', label: 'Necessidades', icon: 'activity' }],
  administrator: [],
}

function activePrimaryRoute(route: string) {
  if (route.startsWith('post/')) return 'community'
  if (route.startsWith('external-')) return 'dashboard'
  if (route.startsWith('professional/')) return 'professional'
  return route
}

export function UnifiedHeader({ identity, route, navigate, professionalRole, onTour }: UnifiedHeaderProps) {
  const railId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const railRef = useRef<HTMLElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCompact, setIsCompact] = useState(() => window.matchMedia('(max-width: 899px)').matches)
  const primary = getPrimaryNavigationItems(identity)
  const active = activePrimaryRoute(route)
  const roleLabel = identity === 'patient' ? 'Área do paciente'
    : identity === 'professional' ? professionalRole === 'doctor' ? 'Área do médico'
      : professionalRole === 'representative' ? 'Área do hospital' : 'Área administrativa'
      : 'Explorar HemoBridge'

  useLayoutEffect(() => {
    const bar = document.querySelector<HTMLElement>('.demo-bar')
    if (!bar) return
    const updateTop = () => document.documentElement.style.setProperty('--hb-rail-top', `${Math.max(0, bar.getBoundingClientRect().bottom)}px`)
    const observer = new ResizeObserver(updateTop)
    observer.observe(bar)
    window.addEventListener('scroll', updateTop, { passive: true })
    window.addEventListener('resize', updateTop)
    updateTop()
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', updateTop)
      window.removeEventListener('resize', updateTop)
      document.documentElement.style.removeProperty('--hb-rail-top')
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 899px)')
    const updateCompact = () => setIsCompact(media.matches)
    media.addEventListener('change', updateCompact)
    return () => media.removeEventListener('change', updateCompact)
  }, [])

  useLayoutEffect(() => {
    if (!isExpanded || !isCompact) return
    const background = Array.from(document.querySelectorAll<HTMLElement>('.demo-bar, .hb-unified-header, #app'))
    const previouslyInert = background.map((element) => element.inert)
    background.forEach((element) => { element.inert = true })
    if (!railRef.current?.contains(document.activeElement)) toggleRef.current?.focus()
    return () => background.forEach((element, index) => { element.inert = previouslyInert[index] })
  }, [isExpanded, isCompact])

  useEffect(() => {
    if (!isExpanded) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false)
        toggleRef.current?.focus()
      }
      if (event.key === 'Tab' && isCompact) {
        const focusable = Array.from(railRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      if (isCompact && !railRef.current?.contains(event.target as Node)) setIsExpanded(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [isExpanded, isCompact])

  function followRoute() {
    setIsExpanded(false)
  }

  return <>
    {isExpanded && <div className="hb-unified-rail-scrim" aria-hidden="true" />}
    <aside ref={railRef} className="hb-unified-rail" data-expanded={isExpanded} role={isExpanded && isCompact ? 'dialog' : undefined} aria-modal={isExpanded && isCompact ? true : undefined} aria-label="Navegação HemoBridge">
      <div className="hb-unified-rail-inner" id={railId}>
        <button ref={toggleRef} className="hb-unified-rail-toggle" type="button" aria-label={isExpanded ? 'Recolher navegação' : 'Expandir navegação'} aria-controls={railId} aria-expanded={isExpanded} onClick={() => setIsExpanded((current) => !current)}>
          <span className="hb-unified-menu-lines" aria-hidden="true"><span /><span /><span /></span>
          <span className="hb-unified-rail-label">Menu</span>
        </button>
        <p className="hb-unified-rail-role">{roleLabel}</p>
        <nav className="hb-unified-rail-nav" aria-label="Navegação principal">
          {primary.map(({ to, label, icon }) => <RouteLink key={to} to={to} navigate={navigate} aria-label={label} title={!isExpanded ? label : undefined} aria-current={active === to ? 'page' : undefined} onClick={followRoute}><Icon name={icon} /><span className="hb-unified-rail-label">{label}</span></RouteLink>)}
        </nav>
        {identity === 'professional' && professionalSections[professionalRole].length > 0 && <div className="hb-unified-rail-group">
          <p className="hb-unified-rail-group-title">Área profissional</p>
          <nav className="hb-unified-rail-nav" aria-label="Áreas profissionais">
            {professionalSections[professionalRole].map(({ to, label, icon }) => <RouteLink key={to} to={to} navigate={navigate} aria-label={label} title={!isExpanded ? label : undefined} aria-current={route === to ? 'page' : undefined} onClick={followRoute}><Icon name={icon} /><span className="hb-unified-rail-label">{label}</span></RouteLink>)}
          </nav>
        </div>}
        <div className="hb-unified-rail-group hb-unified-rail-more">
          <p className="hb-unified-rail-group-title">Mais opções</p>
          <nav className="hb-unified-rail-nav" aria-label="Mais opções">
            <RouteLink to="accessibility" navigate={navigate} aria-label="Acessibilidade" title={!isExpanded ? 'Acessibilidade' : undefined} aria-current={route === 'accessibility' ? 'page' : undefined} onClick={followRoute}><Icon name="accessibility" /><span className="hb-unified-rail-label">Acessibilidade</span></RouteLink>
            {identity === 'visitor' && <RouteLink to="register" navigate={navigate} aria-label="Fazer pré-cadastro" title={!isExpanded ? 'Fazer pré-cadastro' : undefined} aria-current={route === 'register' ? 'page' : undefined} onClick={followRoute}><Icon name="register" /><span className="hb-unified-rail-label">Fazer pré-cadastro</span></RouteLink>}
            {onTour && <button type="button" aria-label="Ver tour de orientação" title={!isExpanded ? 'Ver tour de orientação' : undefined} onClick={() => { setIsExpanded(false); onTour() }}><Icon name="help" /><span className="hb-unified-rail-label">Ver tour</span></button>}
          </nav>
        </div>
      </div>
    </aside>
    <header className="hb-unified-header">
      <div className="hb-unified-header-inner">
        <BrandLogo navigate={navigate} />
        <div className="hb-unified-header-actions">
          <span className="hb-unified-header-context">{roleLabel}</span>
          {onTour && <button className="hb-unified-tour-button" type="button" onClick={onTour}>Ver tour</button>}
        </div>
      </div>
    </header>
  </>
}
