import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import menuIcon from '../../assets/icons/menu.svg'

export type NavItem = { to: string; label: string; icon: string; end?: boolean }

type NavigationRailProps = {
  items: NavItem[]
  aberto: boolean
  onToggle: () => void
  onClose: () => void
}

// Figma: HemoBridge / NavigationRail (515:5330 fechado, 515:5355 aberto) e Navegação/desktop/*.
// Ícones sempre visíveis; o botão de menu expande os rótulos. No mobile a barra sobrepõe o
// conteúdo com fundo de proteção. Esc fecha e devolve o foco ao botão.
export function NavigationRail({ items, aberto, onToggle, onClose }: NavigationRailProps) {
  const botaoRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        botaoRef.current?.focus()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto, onClose])

  return (
    <>
      {aberto && <div className="fixed inset-0 z-30 bg-ink/50 md:hidden" aria-hidden="true" onClick={onClose} />}
      <nav
        aria-label="Navegação principal"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col gap-2.5 bg-ink px-3 py-4 transition-[width,transform] duration-rail ease-rail ${
          aberto ? 'w-rail-open translate-x-0' : 'w-rail -translate-x-full max-md:invisible md:translate-x-0'
        }`}
      >
        <button
          ref={botaoRef}
          type="button"
          onClick={onToggle}
          aria-expanded={aberto}
          aria-label={aberto ? 'Recolher menu' : 'Expandir menu'}
          className="flex h-12 items-center gap-3.5 overflow-hidden rounded-control bg-surface/8 pl-3.5 pr-2.5 text-label font-semibold text-surface"
        >
          <img src={menuIcon} alt="" width={24} height={24} className="shrink-0" />
          <span className={`whitespace-nowrap transition-opacity duration-140 ${aberto ? 'opacity-100' : 'opacity-0'}`}>Menu</span>
        </button>
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={() => window.matchMedia('(max-width: 767px)').matches && onClose()}
                title={aberto ? undefined : item.label}
                className={({ isActive }) =>
                  `flex h-12 items-center gap-3.5 overflow-hidden rounded-control border pl-3.5 pr-2.5 text-label text-surface transition-colors ${
                    isActive ? 'border-brand-soft bg-brand font-semibold' : 'border-transparent font-medium hover:bg-surface/8'
                  }`
                }
              >
                <img src={item.icon} alt="" width={24} height={24} className="shrink-0" />
                <span className={`whitespace-nowrap transition-opacity duration-140 ${aberto ? 'opacity-100' : 'sr-only md:not-sr-only md:opacity-0'}`}>
                  {item.label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
