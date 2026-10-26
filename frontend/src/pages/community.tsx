import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { communityRoleLabels } from '../types/domain'
import type { CommunityParticipantRole, Identity, Publication, RequestState } from '../types/domain'
import { api, messageOf } from '../services/api-client'
import { isInstitutionalPin, isVerifiedAuthor } from '../services/feed-expiration'
import { localDateTimeValue } from '../services/local-date-time'
import { Alert, Icon, Intro, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'
export type CommunityProps = {
  route: string
  navigate: Navigate
  identity: Identity
  needsIntroduction?: boolean
  onPrepareAccount?: () => void
  participantRole: CommunityParticipantRole
  userName: string
  publications: Publication[]
  response: RequestState
  hasMore: boolean
  onLoadMore: () => void
  onReload: () => void
  onLike: (id: string, trigger: HTMLElement) => void
  onOpenPost: (id: string, comments?: boolean) => void
  onInvite: (id: string, trigger: HTMLElement) => void
  onSendComment: (id: string, text: string) => Promise<void>
  onMoreComments: (id: string) => Promise<void>
  onCreatePublication: (
    title: string,
    content: string,
    topic: string,
    critical: boolean,
    expires: string,
  ) => Promise<void>
  drafts: Record<string, string>
  onDraft: (id: string, value: string) => void
  postOrigin: 'home' | 'community'
  onTour: () => void
}
const dateOf = (date: string) =>
  Number.isFinite(Date.parse(date))
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(date),
      )
    : 'Data indisponível'
export function PublicationCard({
  publication: post,
  full = false,
  onLike,
  onOpenPost,
}: {
  publication: Publication
  full?: boolean
  onLike: CommunityProps['onLike']
  onOpenPost: CommunityProps['onOpenPost']
}) {
  const titleId = useId()
  const verified = isVerifiedAuthor(post)
  const pinned = isInstitutionalPin(post)
  const verifiedDoctor = verified && post.role === 'doctor'
  return (
    <article
      className={`post-card${full ? ' post-full' : ''}${verified ? ' post-verified' : ''}${verifiedDoctor ? ' post-doctor' : ''}${pinned ? ' post-pinned' : ''}`}
      data-post={post.id}
      aria-labelledby={titleId}
    >
      {pinned && (
        <div className="post-pinned-label">
          <Icon name="pin" />
          <div>
            <strong>Aviso crítico · fixado no topo</strong>
            <span>
              Até <time dateTime={post.pinnedUntil}>{dateOf(post.pinnedUntil!)}</time>
            </span>
          </div>
        </div>
      )}
      <div className="post-meta">
        <span className="public-avatar" aria-hidden="true">
          {post.author
            .split(' ')
            .map((p) => p[0])
            .slice(0, 2)
            .join('')}
        </span>
        <div>
          <strong>{post.author}</strong>
          <time dateTime={post.date}>{dateOf(post.date)}</time>
        </div>
      </div>
      <div className="post-labels">
        <span className="post-role">{communityRoleLabels[post.role]}</span>
        {verified && (
          <span
            className="verified-badge"
            title={verifiedDoctor ? 'Registro profissional conferido' : 'Instituição verificada'}
          >
            <Icon name="verified" /> Perfil Verificado
          </span>
        )}
      </div>
      {full ? (
        <h1 id={titleId} tabIndex={-1}>
          {post.title}
        </h1>
      ) : (
        <h3 id={titleId}>{post.title}</h3>
      )}
      <p className="post-body">
        {full ? post.content : post.content.slice(0, 180) + (post.content.length > 180 ? '…' : '')}
      </p>
      <div className="post-actions">
        <button
          type="button"
          aria-label={`Curtir publicação: ${post.title}`}
          aria-pressed={post.liked}
          onClick={(e) => onLike(post.id, e.currentTarget)}
        >
          <Icon name="heart" filled={post.liked} />
          <span>{post.likes}</span>
        </button>
        <button
          type="button"
          aria-label={`Ler ${post.commentsTotal} comentários: ${post.title}`}
          onClick={() => onOpenPost(post.id, true)}
        >
          <Icon name="comment" />
          <span>{post.commentsTotal}</span>
        </button>
        {!full && (
          <button
            className="text-button post-read"
            type="button"
            onClick={() => onOpenPost(post.id)}
          >
            Ler publicação
          </button>
        )}
      </div>
    </article>
  )
}
function NormsConsent({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="checkbox-row">
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        Li e concordo com as <a href="#community-rules">normas da comunidade</a>. Meu conteúdo trata
        de saúde ou doação e não expõe dados pessoais.
      </span>
    </label>
  )
}
function CommunityComposer(p: CommunityProps) {
  const [title, setTitle] = useState(''),
    [content, setContent] = useState(''),
    [topic, setTopic] = useState('DOACAO'),
    [critical, setCritical] = useState(false),
    [expires, setExpires] = useState(''),
    [agreed, setAgreed] = useState(false),
    [sending, setSending] = useState(false),
    [feedback, setFeedback] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  async function publish(e: FormEvent) {
    e.preventDefault()
    if (sending) return
    if (!formRef.current?.reportValidity()) return
    setSending(true)
    setFeedback('')
    try {
      await p.onCreatePublication(title, content, topic, critical, expires)
      setTitle('')
      setContent('')
      setFeedback('Publicação enviada.')
      setAgreed(false)
    } catch (error) {
      setFeedback(messageOf(error))
    } finally {
      setSending(false)
    }
  }
  return (
    <section className="community-composer surface" aria-labelledby="composer-title">
      <div className="community-composer-intro">
        <div>
          <span className="community-composer-kicker">Participe da conversa</span>
          <h2 id="composer-title">Criar publicação</h2>
        </div>
        <p>
          Compartilhe informações sobre saúde e doação. Preserve a privacidade de pacientes e
          profissionais.
        </p>
      </div>
      {p.needsIntroduction ? (
        <div className="community-journey-notice">
          <p>Você pode ler a Comunidade agora. Para publicar, conheça o HemoBridge e conclua a apresentação da sua jornada.</p>
          <button type="button" className="button" onClick={p.onPrepareAccount}>Conhecer minha jornada</button>
        </div>
      ) : p.identity === 'visitor' ? (
        <RouteLink className="button" to="login" navigate={p.navigate}>
          Entrar para publicar
        </RouteLink>
      ) : (
        <form ref={formRef} onSubmit={publish}>
          <p>
            Publicando como <strong>{p.userName}</strong> · {communityRoleLabels[p.participantRole]}
          </p>
          <div className="community-composer-fields">
            <label>
              Título
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                minLength={8}
                maxLength={120}
                required
              />
            </label>
            <label>
              Texto
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                minLength={20}
                maxLength={2000}
                rows={4}
                required
              />
            </label>
            <label>
              Assunto
              <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option value="DOACAO">Doação de sangue</option>
                <option value="SAUDE">Saúde</option>
                {p.participantRole !== 'patient' && (
                  <option value="AVISO_INSTITUCIONAL">Aviso institucional</option>
                )}
              </select>
            </label>
          </div>
          {p.participantRole === 'representative' && (
            <>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={critical}
                  onChange={(e) => {
                    setCritical(e.target.checked)
                    if (e.target.checked) setTopic('AVISO_INSTITUCIONAL')
                  }}
                />
                Aviso crítico ou urgência de estoque da instituição
              </label>
              {critical && (
                <label>
                  Fixar até
                  <input
                    type="datetime-local"
                    required
                    value={expires}
                    min={localDateTimeValue()}
                    onChange={(e) => setExpires(e.target.value)}
                  />
                  <span className="help">
                    Instituição verificada; validade máxima de sete dias. A urgência deve ser
                    confirmada pela unidade.
                  </span>
                </label>
              )}
            </>
          )}
          <NormsConsent checked={agreed} onChange={setAgreed} />
          {feedback && <p role="status">{feedback}</p>}
          <button className="button" disabled={sending || !agreed}>
            {sending ? 'Publicando…' : 'Publicar'}
          </button>
        </form>
      )}
    </section>
  )
}
export function FeedPage(p: CommunityProps) {
  const priority = p.publications.filter(isInstitutionalPin)
  const recent = p.publications.filter((post) => !isInstitutionalPin(post))
  const card = (post: Publication) => (
    <PublicationCard key={post.id} publication={post} onLike={p.onLike} onOpenPost={p.onOpenPost} />
  )
  return (
    <main className="community-page">
      <div className="community-intro">
        <Intro
          title="Comunidade HemoBridge"
          description="Informações, novidades e conversas sobre doação de sangue."
        />
        <figure className="community-art">
          <img
            src="/hemobridge/editorial-ondas-unsplash-960.jpg"
            width="960"
            height="540"
            alt="Curvas abstratas em vermelho"
            decoding="async"
          />
        </figure>
      </div>
      <CommunityComposer {...p} />
      <p className="feed-order">
        Avisos críticos ativos aparecem primeiro. As demais publicações seguem da mais recente para
        a mais antiga.
      </p>
      <button
        type="button"
        className="button secondary"
        onClick={p.onReload}
        disabled={p.response === 'loading'}
      >
        Atualizar publicações
      </button>
      {p.response === 'loading' ? (
        <p aria-busy="true">Carregando publicações…</p>
      ) : p.response === 'loadError' ? (
        <Alert tone="error">
          Não foi possível carregar a comunidade.{' '}
          <button type="button" className="text-button" onClick={p.onReload}>
            Tentar novamente
          </button>
        </Alert>
      ) : p.publications.length ? (
        <>
          {priority.length > 0 && (
            <section className="feed-section feed-priority" aria-labelledby="priority-feed-title">
              <h2 id="priority-feed-title">Avisos prioritários</h2>
              <p>Avisos críticos e urgências de estoque de hospitais e hemocentros verificados.</p>
              <div className="feed-list">{priority.map(card)}</div>
            </section>
          )}
          {recent.length > 0 && (
            <section className="feed-section" aria-labelledby="recent-feed-title">
              <h2 id="recent-feed-title">Publicações recentes</h2>
              <div className="feed-list">{recent.map(card)}</div>
            </section>
          )}
          {p.hasMore && (
            <button type="button" className="button secondary" onClick={p.onLoadMore}>
              Carregar mais publicações
            </button>
          )}
        </>
      ) : (
        <div className="surface state-panel">
          <h2>A conversa começa aqui</h2>
          <p>As publicações aparecerão neste espaço.</p>
        </div>
      )}
    </main>
  )
}
export function PostPage(p: CommunityProps) {
  const post = p.publications.find((item) => item.id === p.route.split('/')[1])
  const [agreed, setAgreed] = useState(false),
    [sending, setSending] = useState(false),
    [feedback, setFeedback] = useState(''),
    [report, setReport] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  if (!post)
    return (
      <main className="community-page">
        <Intro
          title={p.response === 'loading' ? 'Carregando publicação…' : 'Publicação indisponível'}
          description="Volte à comunidade para continuar."
        />
        <RouteLink to="community" navigate={p.navigate}>
          Ver comunidade
        </RouteLink>
      </main>
    )
  async function send(e: FormEvent) {
    e.preventDefault()
    if (!post || sending || !agreed) return
    setSending(true)
    try {
      await p.onSendComment(post.id, p.drafts[post.id] ?? '')
      p.onDraft(post.id, '')
      setFeedback('Comentário enviado.')
      setAgreed(false)
      textareaRef.current?.focus()
    } catch (error) {
      setFeedback(messageOf(error))
    } finally {
      setSending(false)
    }
  }
  async function reportPost(e: FormEvent) {
    e.preventDefault()
    if (!post) return
    try {
      await api(`/comunidade/publicacoes/${post.id}/denuncias`, {
        method: 'POST',
        body: { motivo: report },
      })
      setReport('')
      setFeedback('Denúncia recebida para análise.')
    } catch (error) {
      setFeedback(messageOf(error))
    }
  }
  return (
    <main className="publication-page">
      <RouteLink className="back-link" to={p.postOrigin} navigate={p.navigate}>
        ← {p.postOrigin === 'home' ? 'Voltar ao início' : 'Voltar à comunidade'}
      </RouteLink>
      <PublicationCard publication={post} full onLike={p.onLike} onOpenPost={p.onOpenPost} />
      <section id="comments" className="comments-section">
        <h2 tabIndex={-1}>Comentários ({post.commentsTotal})</h2>
        <div className="comment-list">
          {post.comments.map((c) => (
            <article className="comment" key={c.id}>
              <strong>{c.author}</strong>
              <span className="comment-role">
                {communityRoleLabels[c.role ?? 'patient']}
                {c.verified ? ' · Perfil Verificado' : ''}
              </span>
              <time dateTime={c.date}>{dateOf(c.date)}</time>
              <p>{c.text}</p>
            </article>
          ))}
        </div>
        {post.comments.length < post.commentsTotal && (
          <button
            type="button"
            className="button secondary"
            onClick={() => void p.onMoreComments(post.id)}
          >
            Mostrar mais comentários
          </button>
        )}
        {p.needsIntroduction ? (
          <div className="community-journey-notice">
            <p>Para comentar, conheça o HemoBridge e conclua a apresentação da sua jornada. A leitura continua disponível.</p>
            <button type="button" className="button" onClick={p.onPrepareAccount}>Conhecer minha jornada</button>
          </div>
        ) : p.identity === 'visitor' ? (
          <RouteLink className="button" to="login" navigate={p.navigate}>
            Entrar para comentar
          </RouteLink>
        ) : (
          <>
            <form onSubmit={send}>
              <label htmlFor="comment-text">Escrever um comentário</label>
              <textarea
                id="comment-text"
                ref={textareaRef}
                value={p.drafts[post.id] ?? ''}
                onChange={(e) => p.onDraft(post.id, e.target.value)}
                rows={4}
                maxLength={2000}
                required
              />
              <NormsConsent checked={agreed} onChange={setAgreed} />
              <button className="button" disabled={sending || !agreed}>
                {sending ? 'Enviando…' : 'Enviar comentário'}
              </button>
            </form>
            <details>
              <summary>Denunciar publicação</summary>
              <form onSubmit={reportPost}>
                <label>
                  Motivo
                  <textarea
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                    minLength={10}
                    maxLength={500}
                    required
                  />
                </label>
                <button className="button secondary">Enviar denúncia</button>
              </form>
            </details>
          </>
        )}
        {feedback && <p role="status">{feedback}</p>}
      </section>
    </main>
  )
}
