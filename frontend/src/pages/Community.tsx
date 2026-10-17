import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { communityRoleLabels, communitySessionAuthors } from '../data/fixtures'
import type { CommunityParticipantRole, DemoResponse, Identity, Publication } from '../data/fixtures'
import { demoService } from '../services/demoService'
import { Alert, Icon, Intro, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'

type CommunityProps = {
  route: string; navigate: Navigate; identity: Identity; participantRole: CommunityParticipantRole; publications: Publication[]; response: DemoResponse
  onLike: (id: string, trigger: HTMLElement) => void
  onOpenPost: (id: string, comments?: boolean) => void
  onInvite: (id: string, trigger: HTMLElement) => void
  onSendComment: (id: string, text: string) => Promise<void>
  onCreatePublication: (title: string, content: string) => Promise<void>
  drafts: Record<string, string>; onDraft: (id: string, value: string) => void
  postOrigin: 'home' | 'community'
  onTour: () => void
}

function PublicationArt() {
  return <svg className="post-image" viewBox="0 0 600 160" role="img" aria-label="Três etapas conectadas em sequência" style={{ color: 'var(--hb-accent)' }}><rect width="600" height="160" fill="var(--soft)" /><path d="M100 80h400" stroke="currentColor" strokeWidth="3" />{[100, 300, 500].map((x, index) => <g key={x}><circle cx={x} cy="80" r="28" fill="var(--surface)" stroke="currentColor" strokeWidth="2" /><text x={x} y="87" textAnchor="middle" fontSize="20" fill="currentColor">{index + 1}</text></g>)}</svg>
}

function PublicationCard({ publication: post, full = false, onLike, onOpenPost }: { publication: Publication; full?: boolean; onLike: CommunityProps['onLike']; onOpenPost: CommunityProps['onOpenPost'] }) {
  const initials = post.author.split(' ').map((part) => part[0]).slice(0, 2).join('')
  return <article className={`post-card${full ? ' post-full' : ''}`} data-post={post.id}><div className="post-meta"><span className="public-avatar" aria-hidden="true">{initials}</span><div><strong>{post.author}</strong><time dateTime={post.date}>{post.date.split('-').reverse().join('/')}</time></div></div>
    <div className="post-labels"><span className="post-role">{communityRoleLabels[post.role ?? 'editorial']}</span><span className="post-example">{post.example ? 'Publicação ilustrativa' : 'Publicação desta sessão'}</span></div>
    {full ? <h1 tabIndex={-1}>{post.title}</h1> : <h3>{post.title}</h3>}
    <p>{full ? post.content : post.content.slice(0, 145) + (post.content.length > 145 ? '…' : '')}</p>
    {post.image && <PublicationArt />}
    <div className="post-actions"><button type="button" aria-label={`Curtir publicação: ${post.title}`} aria-pressed={post.liked} onClick={(event) => onLike(post.id, event.currentTarget)}><Icon name="heart" filled={post.liked} /><span>{post.likes}</span></button><a href={`#post/${post.id}/comments`} aria-label={`Ler ${post.comments.length} ${post.comments.length === 1 ? 'comentário' : 'comentários'}: ${post.title}`} onClick={(event) => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onOpenPost(post.id, true) } }}><Icon name="comment" /><span>{post.comments.length}</span></a>{!full && <a href={`#post/${post.id}`} className="post-read" onClick={(event) => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onOpenPost(post.id) } }}>Ler publicação</a>}</div>
  </article>
}

function CommunityComposer({ identity, participantRole, navigate, onCreatePublication }: Pick<CommunityProps, 'identity' | 'participantRole' | 'navigate' | 'onCreatePublication'>) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [feedback, setFeedback] = useState('')
  const [tone, setTone] = useState<'error' | 'success'>('error')
  const [invalidField, setInvalidField] = useState<'title' | 'content' | null>(null)
  const [sending, setSending] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending || identity === 'visitor') return
    const cleanTitle = title.trim()
    const cleanContent = content.trim()
    if (cleanTitle.length < 8 || cleanTitle.length > 120) {
      setTone('error'); setInvalidField('title'); setFeedback('Escreva um título entre 8 e 120 caracteres.'); titleRef.current?.focus(); return
    }
    if (cleanContent.length < 20 || cleanContent.length > 2000) {
      setTone('error'); setInvalidField('content'); setFeedback('Escreva um texto entre 20 e 2.000 caracteres.'); contentRef.current?.focus(); return
    }
    setSending(true); setFeedback(''); setInvalidField(null)
    try {
      await onCreatePublication(cleanTitle, cleanContent)
      setTitle(''); setContent(''); setTone('success')
      setFeedback('Publicação adicionada ao início do feed nesta sessão. Ela desaparece ao recarregar a página.')
    } catch (error) {
      setTone('error'); setFeedback(error instanceof Error ? error.message : 'Não foi possível publicar.')
    } finally { setSending(false) }
  }

  return <section className="community-composer surface" aria-labelledby="community-composer-title">
    <div className="community-composer-intro"><div><span className="community-composer-kicker">Participe da conversa</span><h2 id="community-composer-title">Criar publicação</h2></div><p>Publicações e comentários criados aqui aparecem apenas nesta sessão. Não inclua dados pessoais, exames ou pedidos de avaliação individual.</p></div>
    {identity === 'visitor' ? <RouteLink className="button" to="login" navigate={navigate}>Entrar para publicar</RouteLink> : <form noValidate onSubmit={publish}>
      <p className="community-composer-author">Publicando como <strong>{communitySessionAuthors[participantRole]}</strong> · {communityRoleLabels[participantRole]}</p>
      <div className="community-composer-fields"><div><label htmlFor="community-post-title">Título</label><input id="community-post-title" ref={titleRef} value={title} onChange={(event) => { setTitle(event.target.value); if (invalidField === 'title') setInvalidField(null) }} maxLength={120} aria-invalid={invalidField === 'title'} aria-describedby="community-composer-help community-composer-feedback" placeholder="Sobre o que você quer conversar?" /></div>
        <div><label htmlFor="community-post-content">Texto</label><textarea id="community-post-content" ref={contentRef} value={content} onChange={(event) => { setContent(event.target.value); if (invalidField === 'content') setInvalidField(null) }} maxLength={2000} rows={4} aria-invalid={invalidField === 'content'} aria-describedby="community-composer-help community-composer-feedback" placeholder="Compartilhe uma informação ou pergunta geral" /></div></div>
      <p id="community-composer-help" className="help">Título: 8 a 120 caracteres. Texto: 20 a 2.000 caracteres. Conteúdo público nesta prévia local, sem envio a outros usuários.</p>
      <div id="community-composer-feedback" aria-live="polite">{feedback && <Alert tone={tone}>{feedback}</Alert>}</div>
      <button className="button" type="submit" disabled={sending} aria-busy={sending}>{sending ? 'Publicando…' : 'Publicar nesta sessão'}</button>
    </form>}
  </section>
}

export function HomePage(props: CommunityProps) {
  const { identity, navigate, publications, response, onLike, onOpenPost, onTour } = props
  return <div className="public-home">
    <main className="home-grid" aria-label="Conheça o HemoBridge">
      <section className="home-hero">
        <div className="home-hero-copy">
          <h1 tabIndex={-1}><span className="hero-title-brand">HemoBridge:</span>{' '}<span className="hero-title-journey">A ponte que</span>{' '}<span className="hero-title-end">conecta vidas.</span></h1>
          <p className="home-lead">Consulte sua situação, veja os próximos passos e acompanhe suas consultas em um só lugar.</p>
          <div className="home-actions">{identity === 'visitor' ? <>
            <RouteLink className="button" to="register" navigate={navigate}>Fazer pré-cadastro</RouteLink>
            <RouteLink className="button secondary" to="login" navigate={navigate}>Já tenho conta</RouteLink>
          </> : <RouteLink className="button" to={identity === 'patient' ? 'dashboard' : 'professional'} navigate={navigate}>{identity === 'patient' ? 'Acessar meu painel' : 'Acessar área profissional'}</RouteLink>}</div>
          <p className="home-context">O pré-cadastro inicia o processo. A avaliação acontece nas etapas seguintes.</p>
          <button className="button secondary home-tour-button" type="button" onClick={onTour}>Como funciona? Ver tour</button>
        </div>
        <aside className="home-hero-explainer" aria-labelledby="home-explainer-title">
          <span className="home-explainer-kicker">Conheça a plataforma</span>
          <h2 id="home-explainer-title">O que é o HemoBridge?</h2>
          <p>Uma plataforma para aproximar pessoas interessadas em doar sangue das equipes de hospitais e instituições que acompanham esse processo. O pré-cadastro é o primeiro passo; depois, você acompanha as orientações em cada etapa.</p>
          <p>Depois de entrar, você encontra sua situação, os próximos passos e as informações de suas consultas no painel. A comunidade reúne publicações e conversas sobre doação de sangue.</p>
        </aside>
        <span className="home-hero-mark" aria-hidden="true"><img src="/hemobridge/simbolo-1024.png" alt="" /></span>
      </section>
      <section className="home-community"><div className="community-heading"><div><h2>Comunidade HemoBridge</h2><p className="muted">Informações, novidades e conversas sobre doação de sangue.</p></div><RouteLink className="button secondary" to="community" navigate={navigate}>Ver comunidade</RouteLink></div>{response === 'empty' ? <p className="empty">Nenhuma publicação por aqui.</p> : response === 'loading' ? <p className="empty" aria-busy="true">Carregando publicações…</p> : response === 'loadError' ? <Alert tone="error">Publicações indisponíveis. Abra a comunidade para tentar novamente.</Alert> : <div className="post-preview">{publications.slice(0, 3).map((post) => <PublicationCard key={post.id} publication={post} onLike={onLike} onOpenPost={onOpenPost} />)}</div>}</section>
    </main>
  </div>
}

export function FeedPage(props: CommunityProps) {
  const { publications, response, onLike, onOpenPost } = props
  const visiblePublications = response === 'empty' ? publications.filter((post) => !post.example) : publications
  const [retrying, setRetrying] = useState(false)
  const [loadFeedback, setLoadFeedback] = useState('')
  async function retryLoad() {
    if (retrying) return
    setRetrying(true); setLoadFeedback('')
    try { await demoService.retryLoad(response) }
    catch (error) { setLoadFeedback(error instanceof Error ? error.message : 'A leitura continua indisponível.') }
    finally { setRetrying(false) }
  }
  return <><main className="community-page"><div className="community-intro"><Intro title="Comunidade HemoBridge" description="Informações, novidades e conversas sobre doação de sangue." /><figure className="community-art"><img src="/hemobridge/editorial-ondas-unsplash-960.jpg" width="960" height="540" alt="Formas abstratas em vermelho e rosa com curvas suaves" decoding="async" /></figure></div>{response !== 'loading' && response !== 'loadError' && <CommunityComposer identity={props.identity} participantRole={props.participantRole} navigate={props.navigate} onCreatePublication={props.onCreatePublication} />}{response === 'loading' ? <div className="state-panel surface" aria-busy="true">Carregando publicações…</div> : response === 'loadError' ? <div className="surface state-panel"><Alert tone="error">Não conseguimos carregar as publicações.</Alert>{loadFeedback && <Alert tone="error">{loadFeedback}</Alert>}<button className="button" type="button" disabled={retrying} aria-busy={retrying} onClick={retryLoad}>{retrying ? 'Tentando…' : 'Tentar novamente'}</button></div> : visiblePublications.length ? <div className="feed-list">{visiblePublications.map((post) => <PublicationCard key={post.id} publication={post} onLike={onLike} onOpenPost={onOpenPost} />)}</div> : <div className="surface state-panel"><h2>Nenhuma publicação por aqui</h2><p>Você pode iniciar a conversa acima.</p></div>}</main></>
}

export function PostPage(props: CommunityProps) {
  const { route, identity, navigate, publications, onLike, onOpenPost, onInvite, onSendComment, drafts, onDraft, postOrigin } = props
  const postId = route.split('/')[1]
  const post = publications.find((item) => item.id === postId)
  const [feedback, setFeedback] = useState('')
  const [tone, setTone] = useState<'error' | 'success'>('error')
  const [sending, setSending] = useState(false)
  const [visibleCommentCounts, setVisibleCommentCounts] = useState<Record<string, number>>({})
  const visibleComments = visibleCommentCounts[postId] ?? 10
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (route.endsWith('/comments')) requestAnimationFrame(() => { const section = document.getElementById('comments'); section?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true }); section?.scrollIntoView({ block: 'start' }) })
  }, [route])
  if (!post) return <><main className="community-page"><Intro title="Publicação não encontrada" description="Volte à comunidade para continuar lendo." /><RouteLink className="button" to="community" navigate={navigate}>Ver comunidade</RouteLink></main></>
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!post || sending) return
    if (identity === 'visitor') { onInvite(post.id, event.currentTarget.querySelector('button')!); return }
    const text = (drafts[post.id] ?? '').trim()
    if (!text) { setTone('error'); setFeedback('Escreva um comentário antes de enviar.'); textareaRef.current?.focus(); return }
    setSending(true); setFeedback('')
    try { await onSendComment(post.id, text); onDraft(post.id, ''); setVisibleCommentCounts((current) => ({ ...current, [post.id]: Math.max(current[post.id] ?? 10, post.comments.length + 1) })); setTone('success'); setFeedback('Comentário adicionado nesta sessão.'); textareaRef.current?.focus({ preventScroll: true }) }
    catch (error) { setTone('error'); setFeedback(error instanceof Error ? error.message : 'Não foi possível enviar.'); textareaRef.current?.focus({ preventScroll: true }) }
    finally { setSending(false) }
  }
  return <><main className="publication-page"><RouteLink className="back-link" to={postOrigin} navigate={navigate}><Icon name="back" />Voltar {postOrigin === 'home' ? 'ao início' : 'à comunidade'}</RouteLink><PublicationCard publication={post} full onLike={onLike} onOpenPost={onOpenPost} /><section id="comments" className="comments-section"><h2 tabIndex={-1}>Comentários ({post.comments.length})</h2><div className="comment-list" id="comment-list">{post.comments.length ? post.comments.slice(0, visibleComments).map((comment) => <article className="comment" key={comment.id}><strong>{comment.author}</strong><span className="comment-role">{communityRoleLabels[comment.role ?? 'patient']}{comment.example ? ' · Exemplo' : ' · Nesta sessão'}</span><time dateTime={comment.date}>{comment.date.split('-').reverse().join('/')}</time><p>{comment.text}</p></article>) : <p className="empty">Ainda não há comentários. Que tal começar a conversa?</p>}</div>{post.comments.length > 10 && <button className="button secondary" type="button" aria-controls="comment-list" disabled={visibleComments >= post.comments.length} onClick={() => setVisibleCommentCounts((current) => ({ ...current, [post.id]: (current[post.id] ?? 10) + 10 }))}>{visibleComments >= post.comments.length ? 'Todos os comentários exibidos' : `Mostrar mais comentários (${post.comments.length - visibleComments} restantes)`}</button>}<form noValidate onSubmit={send}><label htmlFor="comment-text">Escrever um comentário</label><p id="comment-public" className="help">Seu comentário aparecerá nesta conversa enquanto a sessão estiver aberta.</p><textarea id="comment-text" ref={textareaRef} value={drafts[post.id] ?? ''} onChange={(event) => onDraft(post.id, event.target.value)} onFocus={(event) => requestAnimationFrame(() => event.target.scrollIntoView({ block: 'center' }))} aria-describedby="comment-public comment-feedback" aria-invalid={tone === 'error' && !!feedback} rows={4} maxLength={2000} placeholder="Compartilhe sua mensagem" /><div id="comment-feedback" aria-live="polite">{feedback && <Alert tone={tone}>{feedback}</Alert>}</div><button className="button" type="submit" disabled={sending} aria-busy={sending}>{sending ? 'Enviando…' : tone === 'error' && feedback.startsWith('Não foi possível') ? 'Tentar novamente' : 'Enviar comentário'}</button></form></section></main></>
}
