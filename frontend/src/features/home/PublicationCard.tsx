import { Link } from 'react-router-dom'
import heartIcon from '../../assets/icons/heart.svg'
import ilustracaoEtapas from '../../assets/home/ilustracao-etapas.svg'
import type { Publicacao } from './publicacoes'

const pilula =
  'inline-flex h-12 items-center rounded-pill border border-input bg-surface px-3 text-label font-semibold text-ink transition-colors hover:bg-background'

// Figma: HemoBridge / PublicationCard (49:13030) + HemoBridge / Like (49:13029) + ações da publicação.
// Visitantes não curtem nem comentam: os contadores são estáticos e as ações levam ao login.
export function PublicationCard({ publicacao: p }: { publicacao: Publicacao }) {
  const comentarios = p.comentarios === 1 ? '1 comentário' : `${p.comentarios} comentários`
  return (
    <article className="flex flex-col items-start gap-3" aria-labelledby={`publicacao-${p.id}`}>
      <div
        className={`flex w-full flex-col gap-4 rounded-card bg-surface p-5 text-ink shadow-publication ${p.destaque ? 'border-t-4 border-coral' : ''}`}
      >
        <p className="text-caption text-muted">
          {p.autor} · {p.data}
        </p>
        <h3 id={`publicacao-${p.id}`} className="text-section font-semibold">
          {p.titulo}
        </h3>
        <p className="text-body">{p.resumo}</p>
      </div>
      {p.destaque && <img src={ilustracaoEtapas} alt="" width={310} height={85} className="h-auto w-77.5 max-w-full" />}
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center gap-2 rounded-like border border-line bg-surface px-3 py-2 text-label font-medium text-ink">
          <img src={heartIcon} alt="" width={24} height={24} />
          <span>
            {p.curtidas}
            <span className="sr-only"> curtidas</span>
          </span>
        </span>
        <Link to="/entrar" className={pilula}>
          {comentarios}
        </Link>
      </div>
      <Link to="/entrar" className={pilula}>
        Ler publicação<span className="sr-only">: {p.titulo}</span>
      </Link>
    </article>
  )
}
