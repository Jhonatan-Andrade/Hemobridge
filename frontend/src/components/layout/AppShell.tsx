import { useCallback, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import logo from '../../assets/brand/logo-horizontal.png'
import menuIcon from '../../assets/icons/menu.svg'
import { NavigationRail, type NavItem } from './NavigationRail'

type AppShellProps = {
  nav: NavItem[]
  /** Texto ao lado da marca no cabeçalho (ex.: "Área do paciente"). */
  contexto: string
  acoes?: ReactNode
  children: ReactNode
}

/**
 * Estrutura comum das telas do Figma: rail de 76px à esquerda, cabeçalho branco com a marca
 * e área de conteúdo sobre o fundo claro. Abaixo de `md` o rail vira menu sobreposto.
 */
export function AppShell({ nav, contexto, acoes, children }: AppShellProps) {
  const [aberto, setAberto] = useState(false)
  const fechar = useCallback(() => setAberto(false), [])

  return (
    <div className="min-h-svh bg-background">
      <a href="#conteudo" className="sr-only z-50 rounded-control bg-surface p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Pular para o conteúdo
      </a>
      <NavigationRail items={nav} aberto={aberto} onToggle={() => setAberto((v) => !v)} onClose={fechar} />
      <div className={`transition-[margin] duration-rail ease-rail ${aberto ? 'md:ml-rail-open' : 'md:ml-rail'}`}>
        <header className="flex flex-wrap items-center gap-3 bg-surface px-4 py-4 md:p-12">
          <button
            type="button"
            onClick={() => setAberto(true)}
            aria-label="Abrir menu"
            className="flex size-12 items-center justify-center rounded-control bg-ink md:hidden"
          >
            <img src={menuIcon} alt="" width={24} height={24} />
          </button>
          <Link to="/" className="shrink-0 rounded">
            <img src={logo} alt="HemoBridge — página inicial" width={184} height={52} className="h-10 w-auto md:h-13" />
          </Link>
          <p className="flex-1 text-body text-muted">{contexto}</p>
          {acoes}
        </header>
        <main id="conteudo" tabIndex={-1} className="px-4 py-8 outline-none md:p-12">
          {children}
        </main>
      </div>
    </div>
  )
}

/** Cabeçalho de página: título e descrição (Figma: 32px Medium + Body muted). */
export function PageTitle({ titulo, descricao, sobretitulo }: { titulo: string; descricao?: ReactNode; sobretitulo?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {sobretitulo && <p className="text-small font-semibold uppercase text-brand">{sobretitulo}</p>}
      <h1 className="text-heading font-semibold text-ink md:text-title">{titulo}</h1>
      {descricao && <p className="text-body text-muted">{descricao}</p>}
    </div>
  )
}
