import { Alert, RouteLink } from '../components/ui'
import { PublicationCard } from './community'
import type { CommunityProps } from './community'
export function HomePage(props: CommunityProps) {
  const { identity, navigate, publications, response, onLike, onOpenPost, onTour } = props
  return (
    <div className="public-home">
      <main className="home-grid" aria-label="Conheça o HemoBridge">
        <section className="home-hero">
          <div className="home-hero-copy">
            <h1 tabIndex={-1}>
              <span className="hero-title-brand">HemoBridge:</span>{' '}
              <span className="hero-title-journey">A ponte que</span>{' '}
              <span className="hero-title-end">conecta vidas.</span>
            </h1>
            <p className="home-lead">
              Consulte sua situação, veja os próximos passos e acompanhe suas consultas em um só
              lugar.
            </p>
            <div className="home-actions">
              {identity === 'visitor' ? (
                <>
                  <RouteLink className="button" to="register" navigate={navigate}>
                    Fazer pré-cadastro
                  </RouteLink>
                  <RouteLink className="button secondary" to="login" navigate={navigate}>
                    Já tenho conta
                  </RouteLink>
                </>
              ) : (
                <RouteLink
                  className="button"
                  to={identity === 'patient' ? 'dashboard' : 'professional'}
                  navigate={navigate}
                >
                  {identity === 'patient' ? 'Acessar meu painel' : 'Acessar área profissional'}
                </RouteLink>
              )}
            </div>
            <p className="home-context">
              O pré-cadastro inicia o processo. A avaliação acontece nas etapas seguintes.
            </p>
            <button className="button secondary home-tour-button" type="button" onClick={onTour}>
              Como funciona? Ver tour
            </button>
          </div>
          <aside className="home-hero-explainer" aria-labelledby="home-explainer-title">
            <span className="home-explainer-kicker">Conheça a plataforma</span>
            <h2 id="home-explainer-title">O que é o HemoBridge?</h2>
            <p>
              O HemoBridge conecta quem deseja doar sangue a hospitais e hemocentros que precisam
              de doações. Você encontra orientações para se cadastrar, acompanhar sua avaliação e
              descobrir onde sua doação pode ajudar.
            </p>
            <p>
              Depois de entrar, você encontra sua situação, os próximos passos e as informações de
              suas consultas no painel. A comunidade reúne publicações e conversas sobre doação de
              sangue.
            </p>
          </aside>
          <span className="home-hero-mark" aria-hidden="true">
            <img src="/hemobridge/simbolo-1024.png" alt="" />
          </span>
        </section>
        <section className="home-community">
          <div className="community-heading">
            <div>
              <h2>Comunidade HemoBridge</h2>
              <p className="muted">Informações, novidades e conversas sobre doação de sangue.</p>
            </div>
            <RouteLink className="button secondary" to="community" navigate={navigate}>
              Ver comunidade
            </RouteLink>
          </div>
          {response === 'success' && !publications.length ? (
            <p className="empty">Nenhuma publicação por aqui.</p>
          ) : response === 'loading' ? (
            <p className="empty" aria-busy="true">
              Carregando publicações…
            </p>
          ) : response === 'loadError' ? (
            <Alert tone="error">
              Publicações indisponíveis. Abra a comunidade para tentar novamente.
            </Alert>
          ) : (
            <div className="post-preview">
              {publications.slice(0, 3).map((post) => (
                <PublicationCard
                  key={post.id}
                  publication={post}
                  onLike={onLike}
                  onOpenPost={onOpenPost}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
