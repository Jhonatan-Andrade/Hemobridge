import { useEffect, useRef, useState } from 'react'
import './styles/hemobridge-base.css'
import './styles/hemobridge-home.css'
import './styles/hemobridge-community.css'
import './styles/hemobridge-react.css'
import './styles/hemobridge-polish.css'
import './styles/hemobridge-editorial.css'
import './styles/production.css'
import { ApiError, api, messageOf } from './services/api-client'
import { expirePinnedPublications, nextPinExpiryDelay } from './services/feed-expiration'
import {
  completeFirstAccess,
  loadVlibras,
  readFirstAccess,
  readFontScale,
  readVlibrasAuto,
  saveFontScale,
  saveVlibrasAuto,
} from './services/accessibility-preferences'
import type { FontScale } from './services/accessibility-preferences'
import { entryRouteOf, professionalRoleOf } from './types/domain'
import type {
  Comment,
  CommunityParticipantRole,
  Identity,
  Publication,
  SessionUser,
} from './types/domain'
import { Alert, RouteLink } from './components/ui'
import type { Navigate } from './components/ui'
import { UnifiedHeader } from './components/unified-header'
import { GuidedTour } from './components/guided-tour'
import { HomePage } from './pages/home'
import { FeedPage, PostPage } from './pages/community'
import { AuthPage } from './pages/auth'
import { PatientPage } from './pages/patient'
import { PatientJourneyPage } from './pages/patient-journey'
import { ProfessionalPage } from './pages/professional'
import { ProfessionalProfilePage } from './pages/professional-profile'
import { LocalDiscovery } from './pages/local-discovery'
import { AccessibilityPage } from './pages/accessibility'
import { LegalContent, LegalPage } from './pages/legal'
const routeFromHash = () => {
  const route = decodeURIComponent(location.hash.slice(1).split('?')[0] || 'home')
  const aliases: Record<string, string> = {
    'redefinir-senha': 'reset',
    'external-P03': 'external-pre-triage',
    'external-P04': 'external-consultations',
    'external-P05': 'external-exams',
    'external-P06': 'external-notifications',
    'external-P08': 'external-locations',
  }
  return aliases[route] ?? route
}
const protectedRoute = (r: string) =>
  r === 'dashboard' ||
  r === 'profile' ||
  r.startsWith('professional') ||
  (r.startsWith('external-') && r !== 'external-locations') ||
  r === 'first' ||
  r === 'change'
type Feed = { items: Publication[]; hasMore: boolean; page: number }
function App() {
  const [route, setRoute] = useState(routeFromHash),
    [user, setUser] = useState<SessionUser | null>(null),
    [sessionReady, setSessionReady] = useState(false),
    [sessionRevision, setSessionRevision] = useState(0),
    [error, setError] = useState(''),
    [feed, setFeed] = useState<Feed>({ items: [], hasMore: false, page: 1 }),
    [feedRevision, setFeedRevision] = useState(0),
    [loadedRevision, setLoadedRevision] = useState(-1),
    [feedError, setFeedError] = useState(false),
    [drafts, setDrafts] = useState<Record<string, string>>({}),
    [tourRequested, setTourRequested] = useState(false),
    [tourCompleted, setTourCompleted] = useState(''),
    [legalOpen, setLegalOpen] = useState(false)
  const [fontScale, setFontScale] = useState<FontScale>(readFontScale),
    [vlibrasAuto, setVlibrasAuto] = useState(readVlibrasAuto),
    [widgetState, setWidgetState] = useState<'off' | 'loading' | 'ready' | 'error'>('off'),
    [widgetError, setWidgetError] = useState('')
  const legalRef = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLElement | null>(null),
    feedBusy = useRef(false),
    commentPages = useRef<Record<string, number>>({}),
    commentsBusy = useRef(new Set<string>())
  const role = professionalRoleOf(user),
    identity: Identity = !user
      ? 'visitor'
      : user.perfil === 'PACIENTE'
        ? 'patient'
        : 'professional',
    participantRole: CommunityParticipantRole = identity === 'professional' ? role : 'patient'
  const navigate: Navigate = (next, options) => {
    if (options?.replace) history.replaceState(null, '', `#${next}`)
    else if (route !== next) history.pushState(null, '', `#${next}`)
    setRoute(next)
    window.scrollTo(0, 0)
  }
  useEffect(() => {
    const onHistory = () => setRoute(routeFromHash())
    window.addEventListener('popstate', onHistory)
    window.addEventListener('hashchange', onHistory)
    return () => {
      window.removeEventListener('popstate', onHistory)
      window.removeEventListener('hashchange', onHistory)
    }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    api<SessionUser>('/auth/me', { signal: controller.signal })
      .then((u) => {
        setUser(u)
        setSessionReady(true)
      })
      .catch((e) => {
        if (controller.signal.aborted) return
        setUser(null)
        setSessionReady(true)
        if (!(e instanceof ApiError && e.status === 401)) setError(messageOf(e))
      })
    return () => controller.abort()
  }, [sessionRevision])
  useEffect(() => {
    const controller = new AbortController()
    api<Feed>('/comunidade/publicacoes?pagina=1', { signal: controller.signal })
      .then((result) => {
        setFeed(result)
        commentPages.current = {}
        setFeedError(false)
        setLoadedRevision(feedRevision)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFeedError(true)
          setLoadedRevision(feedRevision)
        }
      })
    return () => controller.abort()
  }, [feedRevision])
  useEffect(() => {
    const delay = nextPinExpiryDelay(feed.items, Date.now())
    if (delay === null) return
    const timer = window.setTimeout(() => {
      setFeed((current) => ({
        ...current,
        items: expirePinnedPublications(current.items, Date.now()),
      }))
    }, delay)
    return () => window.clearTimeout(timer)
  }, [feed.items])
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    api<{ publicacaoId: string }[]>('/comunidade/minhas-reacoes', { signal: controller.signal })
      .then((items) => {
        const ids = new Set(items.map((p) => p.publicacaoId))
        setFeed((f) => ({ ...f, items: f.items.map((p) => ({ ...p, liked: ids.has(p.id) })) }))
      })
      .catch(() => {})
    return () => controller.abort()
  }, [user, loadedRevision, feed.page])
  useEffect(() => {
    if (!route.startsWith('post/')) return
    const controller = new AbortController()
    Promise.all([
      api<Publication>(`/comunidade/publicacoes/${route.split('/')[1]}`, {
        signal: controller.signal,
      }),
      user
        ? api<{ publicacaoId: string }[]>('/comunidade/minhas-reacoes', {
            signal: controller.signal,
          })
        : Promise.resolve([]),
    ])
      .then(([value, reactions]) => ({
        ...value,
        liked: reactions.some((r) => r.publicacaoId === value.id),
      }))
      .then((post) => {
        commentPages.current[post.id] = 1
        setFeed((f) => ({ ...f, items: [...f.items.filter((p) => p.id !== post.id), post] }))
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(messageOf(e))
      })
    return () => controller.abort()
  }, [route, user])
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = route.endsWith('/comments')
        ? document.querySelector<HTMLElement>('#comments h2')
        : document.querySelector<HTMLElement>('main h1')
      target?.focus({ preventScroll: true })
      if (route.endsWith('/comments')) target?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [route])
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`
  }, [fontScale])
  useEffect(() => {
    if (!vlibrasAuto) return
    let active = true
    loadVlibras()
      .then(() => {
        if (active) setWidgetState('ready')
      })
      .catch((e) => {
        if (active) {
          setWidgetState('error')
          setWidgetError(messageOf(e))
        }
      })
    return () => {
      active = false
    }
  }, [vlibrasAuto])
  useEffect(() => {
    if (legalOpen) {
      opener.current = document.activeElement as HTMLElement
      legalRef.current?.showModal()
    } else {
      legalRef.current?.close()
      opener.current?.focus()
    }
  }, [legalOpen])
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
      setUser(null)
      navigate('home')
    } catch (e) {
      setError(messageOf(e))
    }
  }
  async function authDone(kind: string) {
    if (kind === 'login' || kind === 'first') {
      const u = await api<SessionUser>('/auth/me')
      setUser(u)
      navigate(entryRouteOf(u))
      setSessionRevision((v) => v + 1)
    } else
      navigate(
        kind === 'register' ? 'registered' : kind === 'forgot' ? 'neutral' : 'passwordSuccess',
      )
  }
  const invite = () => navigate('login')
  async function like(id: string) {
    if (!user) {
      invite()
      return
    }
    const post = feed.items.find((p) => p.id === id)
    if (!post) return
    try {
      const result = await api<{ likes: number; liked: boolean }>(
        `/comunidade/publicacoes/${id}/reacao`,
        { method: post.liked ? 'DELETE' : 'PUT' },
      )
      setFeed((f) => ({ ...f, items: f.items.map((p) => (p.id === id ? { ...p, ...result } : p)) }))
    } catch (e) {
      setError(messageOf(e))
    }
  }
  async function sendComment(id: string, text: string) {
    const comment = await api<Comment>(`/comunidade/publicacoes/${id}/comentarios`, {
      method: 'POST',
      body: { texto: text, aceiteNormas: true, versaoNormas: '2026-10' },
    })
    setFeed((f) => ({
      ...f,
      items: f.items.map((p) =>
        p.id === id
          ? { ...p, comments: [...p.comments, comment], commentsTotal: p.commentsTotal + 1 }
          : p,
      ),
    }))
  }
  async function createPublication(
    title: string,
    content: string,
    topic: string,
    critical: boolean,
    expires: string,
  ) {
    await api('/comunidade/publicacoes', {
      method: 'POST',
      body: {
        titulo: title,
        texto: content,
        tema: topic,
        tipo: critical ? 'AVISO_CRITICO' : 'COMUM',
        ...(critical ? { fixadaAte: new Date(expires).toISOString() } : {}),
        aceiteNormas: true,
        versaoNormas: '2026-10',
      },
    })
    setFeedRevision((v) => v + 1)
  }
  async function morePosts() {
    if (feedBusy.current) return
    feedBusy.current = true
    try {
      const more = await api<Feed>(`/comunidade/publicacoes?pagina=${feed.page + 1}`)
      setFeed((f) => ({
        ...more,
        items: [...f.items, ...more.items.filter((p) => !f.items.some((old) => old.id === p.id))],
      }))
    } catch (e) {
      setError(messageOf(e))
    } finally {
      feedBusy.current = false
    }
  }
  async function moreComments(id: string) {
    if (commentsBusy.current.has(id)) return
    commentsBusy.current.add(id)
    try {
      const post = feed.items.find((p) => p.id === id)
      if (!post) return
      const more = await api<{ items: Comment[] }>(
        `/comunidade/publicacoes/${id}/comentarios?pagina=${(commentPages.current[id] ?? 1) + 1}`,
      )
      commentPages.current[id] = (commentPages.current[id] ?? 1) + 1
      setFeed((f) => ({
        ...f,
        items: f.items.map((p) =>
          p.id === id
            ? {
                ...p,
                comments: [
                  ...p.comments,
                  ...more.items.filter((c) => !p.comments.some((old) => old.id === c.id)),
                ].sort((a, b) => a.date.localeCompare(b.date)),
              }
            : p,
        ),
      }))
    } catch (e) {
      setError(messageOf(e))
    } finally {
      commentsBusy.current.delete(id)
    }
  }
  const common = {
    route,
    navigate,
    identity,
    participantRole,
    userName: user?.nome ?? '',
    publications: feed.items,
    response:
      loadedRevision !== feedRevision
        ? ('loading' as const)
        : feedError
          ? ('loadError' as const)
          : ('success' as const),
    hasMore: feed.hasMore,
    onLoadMore: () => void morePosts(),
    onReload: () => setFeedRevision((v) => v + 1),
    onLike: (id: string) => void like(id),
    onOpenPost: (id: string, comments = false) =>
      navigate(`post/${id}${comments ? '/comments' : ''}`),
    onInvite: invite,
    onSendComment: sendComment,
    onMoreComments: moreComments,
    onCreatePublication: createPublication,
    drafts,
    onDraft: (id: string, value: string) => setDrafts((d) => ({ ...d, [id]: value })),
    postOrigin: 'community' as const,
    onTour: () => setTourRequested(true),
  }
  const mandatory =
    !!user && !user.senhaProvisoria && tourCompleted !== user.id && readFirstAccess(user.id)
  const denied =
    user &&
    ((identity === 'patient' && route.startsWith('professional')) ||
      (identity === 'professional' &&
        (route === 'dashboard' ||
          route === 'profile' ||
          (route.startsWith('external-') && route !== 'external-locations'))))
  return (
    <>
      <UnifiedHeader
        identity={identity}
        route={route}
        navigate={navigate}
        professionalRole={role}
        onTour={() => setTourRequested(true)}
      />
      {user && (
        <div className="session-actions">
          <span>{user.nome}</span>
          <button type="button" className="text-button" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      )}
      {error && (
        <div className="app-error">
          <Alert tone="error">
            {error}{' '}
            <button type="button" className="text-button" onClick={() => setError('')}>
              Fechar aviso
            </button>
          </Alert>
        </div>
      )}
      <div id="app">
        {protectedRoute(route) && !sessionReady ? (
          <main className="community-page" aria-busy="true">
            Carregando sua sessão…
          </main>
        ) : protectedRoute(route) && !user ? (
          <main className="community-page">
            <h1 tabIndex={-1}>Entre para acessar sua área</h1>
            <RouteLink className="button" to="login" navigate={navigate}>
              Entrar
            </RouteLink>
          </main>
        ) : denied ? (
          <main className="community-page">
            <h1 tabIndex={-1}>Acesso restrito ao perfil autorizado</h1>
            <RouteLink to={entryRouteOf(user!)} navigate={navigate}>
              Abrir minha área
            </RouteLink>
          </main>
        ) : route === 'home' ? (
          <HomePage {...common} />
        ) : route === 'community' ? (
          <FeedPage {...common} />
        ) : route.startsWith('post/') ? (
          <PostPage key={route.split('/')[1]} {...common} />
        ) : ['privacy', 'terms', 'community-rules'].includes(route) ? (
          <LegalPage route={route} navigate={navigate} />
        ) : route === 'accessibility' ? (
          <AccessibilityPage
            navigate={navigate}
            backTo="home"
            fontScale={fontScale}
            onFontScale={(v) => {
              saveFontScale(v)
              setFontScale(v)
            }}
            vlibrasAuto={vlibrasAuto}
            widgetState={widgetState}
            widgetError={widgetError}
            onVlibras={(enabled) => {
              saveVlibrasAuto(enabled)
              setVlibrasAuto(enabled)
              if (!enabled) location.reload()
            }}
            onTour={() => setTourRequested(true)}
          />
        ) : route === 'external-locations' ? (
          <LocalDiscovery />
        ) : route.startsWith('external-') ? (
          <PatientJourneyPage key={route} route={route} navigate={navigate} />
        ) : route === 'dashboard' || route === 'profile' ? (
          <PatientPage
            key={route}
            route={route}
            user={user!}
            navigate={navigate}
            onLogout={() => void logout()}
          />
        ) : route === 'professional/profile' ? (
          <ProfessionalProfilePage navigate={navigate} />
        ) : route.startsWith('professional') ? (
          <ProfessionalPage
            key={`${role}:${route}`}
            route={route}
            navigate={navigate}
            role={role}
          />
        ) : (
          <AuthPage
            key={route}
            route={route}
            navigate={navigate}
            onDone={authDone}
            onTerm={() => setLegalOpen(true)}
          />
        )}
      </div>
      <footer className="app-footer">
        <RouteLink to="privacy" navigate={navigate}>
          Privacidade
        </RouteLink>
        <RouteLink to="terms" navigate={navigate}>
          Termos de uso
        </RouteLink>
        <RouteLink to="community-rules" navigate={navigate}>
          Normas da comunidade
        </RouteLink>
      </footer>
      <dialog
        ref={legalRef}
        className="legal-dialog"
        aria-label="Termos e privacidade"
        onCancel={(e) => {
          e.preventDefault()
          setLegalOpen(false)
        }}
      >
        <LegalContent />
        <button className="button" onClick={() => setLegalOpen(false)}>
          Fechar
        </button>
      </dialog>
      {(mandatory || tourRequested) && (
        <GuidedTour
          key={user?.id ?? 'visitor'}
          user={user}
          mandatory={mandatory}
          onComplete={() => {
            if (user) {
              completeFirstAccess(user.id)
              setTourCompleted(user.id)
            }
            setTourRequested(false)
          }}
          onClose={() => setTourRequested(false)}
        />
      )}
    </>
  )
}
export default App
