import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './hemobridge-base.css'
import './hemobridge-home.css'
import './hemobridge-community.css'
import './hemobridge-react.css'
import './hemobridge-polish.css'
import './hemobridge-editorial.css'
import type { DemoProfile, DemoResponse, Identity, PatientStatus, ProfessionalRole, Publication } from './data/fixtures'
import { demoJourneyNotifications } from './data/patientJourneyFixtures'
import type { JourneyNotification } from './data/patientJourneyFixtures'
import { demoService } from './services/demoService'
import { checkBackendHealth } from './services/healthService'
import { hasSeenTour, loadVlibras, markTourSeen, readFontScale, readVlibrasAuto, saveFontScale, saveVlibrasAuto } from './services/accessibilityPreferences'
import type { FontScale } from './services/accessibilityPreferences'
import { ActionButton, Alert } from './components/ui'
import type { Navigate } from './components/ui'
import { GuidedTour } from './components/GuidedTour'
import { UnifiedHeader } from './components/UnifiedHeader'
import { AuthPage } from './pages/Auth'
import { AccessibilityPage } from './pages/Accessibility'
import { FeedPage, HomePage, PostPage } from './pages/Community'
import { PatientPage } from './pages/Patient'
import { PatientJourneyPage } from './pages/PatientJourney'
import { ProfessionalPage } from './pages/Professional'

type Origin = 'home' | 'community'
type DialogKind = 'invite' | 'term' | 'close-password' | 'close-confirm' | null
type EntryState = { hemRoute: string; hemY: number; hemOrigin: Origin }
const routeFromHash = () => decodeURIComponent(window.location.hash.slice(1) || 'home')
const isMainRoute = (route: string) => ['home', 'community', 'dashboard', 'profile', 'accessibility'].includes(route) || route.startsWith('post/') || route.startsWith('external-') || route === 'professional' || route.startsWith('professional/')
const isAuthRoute = (route: string) => ['register', 'registered', 'login', 'forgot', 'neutral', 'reset', 'change', 'first', 'passwordSuccess', 'closed'].includes(route)

function DemoBar({ route, identity, setIdentity, professionalRole, setProfessionalRole, response, setResponse, status, setStatus, fill, reset, navigate }: { route: string; identity: Identity; setIdentity: (value: Identity) => void; professionalRole: ProfessionalRole; setProfessionalRole: (value: ProfessionalRole) => void; response: DemoResponse; setResponse: (value: DemoResponse) => void; status: PatientStatus; setStatus: (value: PatientStatus) => void; fill: () => void; reset: () => void; navigate: Navigate }) {
  const [expanded, setExpanded] = useState(false)
  const [health, setHealth] = useState('Não verificado')
  const [checking, setChecking] = useState(false)
  async function check() {
    if (checking) return
    setChecking(true); setHealth('Consultando GET /app…')
    try { const result = await checkBackendHealth(); setHealth(`GET /app: ${result.message}. Somente conectividade.`) }
    catch (error) { setHealth(`GET /app indisponível: ${error instanceof Error ? error.message : 'erro desconhecido'}`) }
    finally { setChecking(false) }
  }
  const resetDemo = () => { reset(); setHealth('Não verificado'); setExpanded(false) }
  return <aside className="demo-bar" aria-label="Controles de demonstração"><div><strong>HEM-19</strong><span>Frontend em demonstração · dados fictícios em memória · sem autenticação real</span></div><button id="demo-toggle" className="demo-button" type="button" aria-expanded={expanded} aria-controls="demo-controls" onClick={() => setExpanded(!expanded)}>Demonstração e revisão</button><div id="demo-controls" hidden={!expanded}>
    <label>Ir para <select value={['home', 'register', 'login', 'dashboard', 'profile', 'forgot', 'reset', 'first', 'community', 'professional', 'professional/needs', 'accessibility'].includes(route) ? route : 'home'} onChange={(event) => { const to = event.target.value; if (to === 'dashboard' || to === 'profile') setIdentity('patient'); if (to.startsWith('professional')) setIdentity('professional'); navigate(to) }}><option value="home">Home pública</option><option value="community">Comunidade</option><option value="register">T02 · Pré-cadastro</option><option value="login">T01 · Entrar</option><option value="dashboard">P01 · Meu painel</option><option value="profile">P02 · Perfil e privacidade</option><option value="professional">M01 · Agenda fictícia</option><option value="professional/needs">H02 · Necessidades fictícias</option><option value="accessibility">Acessibilidade</option><option value="forgot">Recuperar senha</option><option value="reset">Redefinir senha</option><option value="first">Primeiro acesso profissional</option></select></label>
    <label>Resposta simulada <select value={response} onChange={(event) => setResponse(event.target.value as DemoResponse)}><option value="success">Sucesso</option><option value="network">Falha temporária</option><option value="invalid">Credenciais / senha atual inválidas</option><option value="blocked">Conta bloqueada</option><option value="inactive">Conta desativada</option><option value="expired">Link / senha provisória expirados</option><option value="duplicate">CPF ou e-mail já cadastrado</option><option value="first">Login com senha provisória</option><option value="loadError">Falha ao carregar dados</option><option value="loading">Carregamento de dados</option><option value="empty">Feed vazio</option></select></label>
    <label>Situação do paciente <select value={status} onChange={(event) => setStatus(event.target.value as PatientStatus)}><option value="PRE_CADASTRADO">Pré-cadastrado</option><option value="CONSULTA_AGENDADA">Consulta agendada</option><option value="AGUARDANDO_EXAME">Aguardando exame</option><option value="EM_ANALISE">Em análise</option><option value="APROVADO">Aprovado</option><option value="REPROVADO_EXAME">Reprovado · exame</option><option value="REPROVADO_ATENDIMENTO">Reprovado · atendimento</option></select></label>
    <label>Sessão de demonstração <select value={identity} onChange={(event) => setIdentity(event.target.value as Identity)}><option value="visitor">Visitante</option><option value="patient">Paciente fictício</option><option value="professional">Profissional fictício</option></select></label>
    {identity === 'professional' && <label>Papel profissional fictício <select value={professionalRole} onChange={(event) => { const value = event.target.value as ProfessionalRole; setProfessionalRole(value); if (route.startsWith('professional')) navigate(value === 'representative' ? 'professional/needs' : value === 'administrator' ? 'professional/admin' : 'professional') }}><option value="doctor">Médico</option><option value="representative">Representante de hospital</option><option value="administrator">Administrador</option></select></label>}
    <button id="demo-fill" className="demo-button" type="button" onClick={fill}>Preencher exemplo fictício</button><button id="demo-reset" className="demo-button" type="button" onClick={resetDemo}>Reiniciar demonstração</button>{import.meta.env.DEV && <><button id="demo-health-check" className="demo-button" type="button" disabled={checking} onClick={check}>Verificar backend</button><span className="demo-health" role="status">{health}</span></>}<p>Controles exclusivos da demonstração. {import.meta.env.DEV && 'GET /app não verifica login, banco nem dados de pacientes. '}Não use dados reais.</p>
  </div></aside>
}

function App() {
  const [route, setRoute] = useState(routeFromHash)
  const [identity, setIdentity] = useState<Identity>(() => {
    const initial = routeFromHash()
    return initial === 'dashboard' || initial === 'profile' || initial.startsWith('external-') ? 'patient' : initial.startsWith('professional') ? 'professional' : 'visitor'
  })
  const [professionalRole, setProfessionalRole] = useState<ProfessionalRole>(() => routeFromHash().endsWith('/needs') ? 'representative' : routeFromHash().endsWith('/admin') ? 'administrator' : 'doctor')
  const [response, setResponse] = useState<DemoResponse>('success')
  const [status, setStatus] = useState<PatientStatus>('PRE_CADASTRADO')
  const [publications, setPublications] = useState<Publication[]>(demoService.initialPublications)
  const [profile, setProfile] = useState<DemoProfile>(demoService.initialProfile)
  const [notifications, setNotifications] = useState<JourneyNotification[]>(() => demoJourneyNotifications.map((item) => ({ ...item })))
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [pendingPost, setPendingPost] = useState<string | null>(null)
  const [postOrigin, setPostOrigin] = useState<Origin>('home')
  const [dialogKind, setDialogKind] = useState<DialogKind>(null)
  const [dialogError, setDialogError] = useState('')
  const [closePassword, setClosePassword] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [fillRequest, setFillRequest] = useState<{ route: string; nonce: number }>({ route: '', nonce: 0 })
  const [targetScroll, setTargetScroll] = useState(0)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [fontScale, setFontScale] = useState<FontScale>(readFontScale)
  const [vlibrasAuto, setVlibrasAuto] = useState(readVlibrasAuto)
  const [widgetState, setWidgetState] = useState<'off' | 'loading' | 'ready' | 'error'>('off')
  const [widgetError, setWidgetError] = useState('')
  const [tourOpen, setTourOpen] = useState(false)
  const [accessibilityReturn, setAccessibilityReturn] = useState('home')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const listPositions = useRef<Record<Origin, number>>({ home: 0, community: 0 })
  const routeRef = useRef(route)
  const restoringHistory = useRef(false)

  useLayoutEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`
    document.documentElement.dataset.fontScale = String(fontScale)
  }, [fontScale])

  useEffect(() => {
    if (!vlibrasAuto) return
    let active = true
    loadVlibras().then(() => { if (active) setWidgetState('ready') }).catch((error: unknown) => {
      if (active) { setWidgetState('error'); setWidgetError(error instanceof Error ? error.message : 'VLibras indisponível.') }
    })
    return () => { active = false }
  }, [vlibrasAuto])

  useEffect(() => {
    const audience = identity === 'professional' ? `professional.${professionalRole}` : identity
    const atEntry = identity === 'visitor' ? route === 'home' : identity === 'patient' ? route === 'dashboard' : route.startsWith('professional')
    if (!atEntry || hasSeenTour(audience)) return
    const timer = window.setTimeout(() => { markTourSeen(audience); setTourOpen(true) }, 700)
    return () => window.clearTimeout(timer)
  }, [identity, professionalRole, route])

  useEffect(() => {
    window.history.scrollRestoration = 'manual'
    const initial: EntryState = { hemRoute: routeFromHash(), hemY: window.scrollY, hemOrigin: 'home' }
    window.history.replaceState(initial, '')
    const onPop = () => {
      const state = window.history.state as EntryState | null
      const next = routeFromHash()
      if (routeRef.current === next && state?.hemRoute === next) return
      const y = state?.hemY ?? 0
      restoringHistory.current = true
      routeRef.current = next
      if (state?.hemOrigin) setPostOrigin(state.hemOrigin)
      setTargetScroll(y)
      setRoute(next)
      window.setTimeout(() => {
        if (routeRef.current === next) {
          window.scrollTo(0, y)
          const current = window.history.state as EntryState | null
          if (current?.hemRoute === next) window.history.replaceState({ ...current, hemY: y }, '')
        }
        restoringHistory.current = false
      }, 160)
    }
    const onScroll = () => {
      const state = window.history.state as EntryState | null
      if (!restoringHistory.current && state?.hemRoute === routeRef.current) window.history.replaceState({ ...state, hemY: window.scrollY }, '')
    }
    const viewport = window.visualViewport
    const onViewport = () => setKeyboardOpen(!!viewport && viewport.height < window.innerHeight - 120)
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    window.addEventListener('scroll', onScroll, { passive: true })
    viewport?.addEventListener('resize', onViewport)
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onPop); window.removeEventListener('scroll', onScroll); viewport?.removeEventListener('resize', onViewport) }
  }, [])

  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      if (!route.endsWith('/comments')) window.scrollTo(0, targetScroll)
      document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
    })
  }, [route, targetScroll])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (document.activeElement === document.body || !document.activeElement?.isConnected) {
        const target = route.endsWith('/comments')
          ? document.querySelector<HTMLElement>('.comments-section h2')
          : document.querySelector<HTMLElement>('main h1')
        target?.focus({ preventScroll: true })
      }
    }, 220)
    return () => window.clearTimeout(timer)
  }, [route])

  useEffect(() => {
    document.body.classList.toggle('keyboard-open', keyboardOpen)
    return () => { document.body.classList.remove('keyboard-open') }
  }, [route, keyboardOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialogKind && dialog) {
      if (!dialog.open) dialog.showModal()
      requestAnimationFrame(() => {
        if (dialogKind === 'term') {
          dialog.focus({ preventScroll: true })
          dialog.scrollTop = 0
        } else dialog.querySelector<HTMLElement>(dialogKind === 'close-password' ? 'input' : 'button')?.focus()
      })
    }
    if (!dialogKind && dialog?.open) dialog.close()
  }, [dialogKind])

  const navigate: Navigate = (next, options) => {
    const current = routeRef.current
    if (next === 'accessibility' && current !== 'accessibility') setAccessibilityReturn(current)
    const state = window.history.state as EntryState | null
    if (state?.hemRoute === current) window.history.replaceState({ ...state, hemY: window.scrollY }, '')
    if (current === 'home' || current === 'community') listPositions.current[current] = window.scrollY
    const origin = options?.origin ?? (current === 'home' || current === 'community' ? current : postOrigin)
    if (next.startsWith('post/')) setPostOrigin(origin)
    if (next === pendingPost) setPendingPost(null)
    const y = next === 'home' || next === 'community' ? listPositions.current[next] : 0
    const entry: EntryState = { hemRoute: next, hemY: y, hemOrigin: origin }
    if (options?.replace) window.history.replaceState(entry, '', `#${next}`)
    else if (next !== current) window.history.pushState(entry, '', `#${next}`)
    routeRef.current = next
    setTargetScroll(y)
    setRoute(next)
    if (current.startsWith('post/') && (next === 'home' || next === 'community')) {
      window.setTimeout(() => { if (routeRef.current === next) window.scrollTo(0, y) }, 160)
    }
    if (options?.scrollToComments && next.startsWith('post/')) requestAnimationFrame(() => document.getElementById('comments')?.scrollIntoView({ block: 'start' }))
  }
  const closeDialog = (returnFocus = true) => {
    setDialogKind(null); setDialogError(''); setClosePassword('')
    if (returnFocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }
  const openDialog = (kind: DialogKind, trigger: HTMLElement) => { triggerRef.current = trigger; setDialogError(''); setDialogKind(kind) }
  const invite = (id: string, trigger: HTMLElement) => {
    if (route === 'home' || route === 'community') { listPositions.current[route] = window.scrollY; setPostOrigin(route) }
    setPendingPost(`post/${id}`)
    openDialog('invite', trigger)
  }
  const like = (id: string, trigger: HTMLElement) => {
    if (identity === 'visitor') { invite(id, trigger); return }
    setPublications((current) => current.map((post) => post.id === id ? demoService.toggleLike(post) : post))
    setAnnouncement(publications.find((post) => post.id === id)?.liked ? 'Curtida removida.' : 'Curtida adicionada.')
  }
  const openPost = (id: string, comments = false) => navigate(`post/${id}${comments ? '/comments' : ''}`, { scrollToComments: comments })
  const sendComment = async (id: string, text: string) => {
    const comment = await demoService.sendComment(id, text, response)
    setPublications((current) => current.map((post) => post.id === id ? { ...post, comments: [...post.comments, comment] } : post))
    setAnnouncement('Comentário enviado.')
  }
  const onDone = (kind: string) => {
    if (kind === 'register') navigate('registered')
    if (kind === 'login') {
      if (response === 'first') navigate('first')
      else { setIdentity('patient'); const to = pendingPost ?? 'dashboard'; setPendingPost(null); navigate(to) }
    }
    if (kind === 'forgot') navigate('neutral')
    if (kind === 'reset') navigate('passwordSuccess')
    if (kind === 'change') navigate('passwordSuccess')
    if (kind === 'first') { setIdentity('professional'); setPendingPost(null); navigate('professional') }
  }
  const logout = () => { setIdentity('visitor'); setPendingPost(null); navigate('home') }
  const resetDemo = () => {
    window.history.replaceState({ hemRoute: 'home', hemY: 0, hemOrigin: 'home' } satisfies EntryState, '', '#home')
    window.location.reload()
  }
  const changeFontScale = (value: FontScale) => { setFontScale(value); saveFontScale(value) }
  const changeVlibras = async (enabled: boolean) => {
    if (!enabled) {
      saveVlibrasAuto(false)
      setVlibrasAuto(false)
      window.location.reload()
      return
    }
    setWidgetState('loading'); setWidgetError('')
    try { await loadVlibras(); saveVlibrasAuto(true); setVlibrasAuto(true); setWidgetState('ready') }
    catch (error) { setWidgetState('error'); setWidgetError(error instanceof Error ? error.message : 'VLibras indisponível.') }
  }
  const markNotification = (id?: string) => setNotifications((current) => current.map((item) => !id || item.id === id ? { ...item, read: true } : item))
  const selectDemoIdentity = (next: Identity) => {
    setIdentity(next)
    const inPatientArea = route === 'dashboard' || route === 'profile' || route.startsWith('external-')
    const inProfessionalArea = route === 'professional' || route.startsWith('professional/')
    if (next === 'visitor' && (inPatientArea || inProfessionalArea)) navigate('home')
    if (next === 'patient' && inProfessionalArea) navigate('dashboard')
    if (next === 'professional' && inPatientArea) navigate(professionalRole === 'representative' ? 'professional/needs' : professionalRole === 'administrator' ? 'professional/admin' : 'professional')
  }
  const common = { route, navigate, identity, publications, response, onLike: like, onOpenPost: openPost, onInvite: invite, onSendComment: sendComment, drafts, onDraft: (id: string, value: string) => setDrafts((current) => ({ ...current, [id]: value })), postOrigin, onTour: () => setTourOpen(true) }
  const showNav = isMainRoute(route)
  return <><DemoBar route={route} identity={identity} setIdentity={selectDemoIdentity} professionalRole={professionalRole} setProfessionalRole={setProfessionalRole} response={response} setResponse={setResponse} status={status} setStatus={setStatus} fill={() => setFillRequest({ route, nonce: fillRequest.nonce + 1 })} reset={resetDemo} navigate={navigate} />
    <UnifiedHeader key={`${identity}:${professionalRole}`} identity={identity} route={route} navigate={navigate} professionalRole={professionalRole} onTour={showNav ? () => setTourOpen(true) : undefined} />
    <div id="app">
      {route === 'home' ? <HomePage {...common} /> : route === 'community' ? <FeedPage {...common} /> : route.startsWith('post/') ? <PostPage {...common} /> : route === 'accessibility' ? <AccessibilityPage navigate={navigate} backTo={accessibilityReturn} fontScale={fontScale} onFontScale={changeFontScale} vlibrasAuto={vlibrasAuto} widgetState={widgetState} widgetError={widgetError} onVlibras={changeVlibras} onTour={() => setTourOpen(true)} /> : route === 'professional' || route.startsWith('professional/') ? <ProfessionalPage route={route} navigate={navigate} role={professionalRole} /> : route.startsWith('external-') ? <PatientJourneyPage route={route} navigate={navigate} status={status} response={response} notifications={notifications} onMarkNotification={markNotification} /> : route === 'dashboard' || route === 'profile' ? <PatientPage key={`${route}:${fillRequest.route === route ? fillRequest.nonce : ''}`} route={route} navigate={navigate} status={status} response={response} profile={profile} onSaveProfile={setProfile} onCloseAccount={(trigger) => openDialog('close-password', trigger)} onLogout={logout} fillExample={fillRequest.route === route} /> : isAuthRoute(route) ? <AuthPage key={`${route}:${fillRequest.route === route ? fillRequest.nonce : ''}`} route={route} navigate={navigate} response={response} onDone={onDone} onTerm={(trigger) => openDialog('term', trigger)} fillExample={fillRequest.route === route} pendingPost={pendingPost} /> : <main className="community-page"><h1 tabIndex={-1}>Página indisponível</h1><p>Escolha outra página no menu.</p></main>}
    </div>
    <dialog ref={dialogRef} tabIndex={-1} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); closeDialog() }} onClick={(event) => { if (event.target === dialogRef.current) closeDialog() }}>
      {dialogKind === 'invite' && <><h2 id="dialog-title">Entre para participar</h2><p>Você pode continuar lendo publicações e comentários sem entrar.</p><div className="actions"><ActionButton onClick={() => { closeDialog(false); navigate('login') }}>Entrar</ActionButton><ActionButton variant="secondary" onClick={() => { closeDialog(false); navigate('register') }}>Fazer pré-cadastro</ActionButton><ActionButton variant="secondary" onClick={() => closeDialog()}>Continuar lendo</ActionButton></div></>}
      {dialogKind === 'term' && <><h2 id="dialog-title">Uso e privacidade desta versão de avaliação</h2><div className="demo-notice-content"><p>Esta versão permite conhecer a navegação e os fluxos previstos. Os exemplos de pessoas, instituições, publicações, consultas, exames, tipos sanguíneos e necessidades são fictícios. As ações não criam cadastro, não autenticam uma conta real, não reservam horário e não constituem atendimento, avaliação médica ou doação de sangue.</p><p>Use apenas dados de teste. Não informe CPF, telefone, endereço, senha pessoal, exame, tipo sanguíneo ou outro dado de saúde verdadeiro; também não publique esses dados em comentários. A leitura das páginas públicas não exige cadastro.</p><p>As interações de cadastro, perfil, curtidas e comentários ficam na memória desta página durante a sessão. O navegador guarda preferências de acessibilidade e a informação de que um tour foi visto em armazenamento local. Se você ativar o VLibras, o site carregará um recurso externo de vlibras.gov.br. O navegador, o provedor de hospedagem e esse serviço podem processar informações técnicas.</p><p>Esta versão não foi habilitada para receber dados pessoais ou de saúde reais. O responsável jurídico, o canal de privacidade e os documentos para uma futura operação ainda precisam ser definidos. Marcar “li o aviso” confirma apenas a leitura; não constitui consentimento para tratamento de dados de saúde.</p></div><div className="actions"><ActionButton variant="secondary" onClick={() => closeDialog()}>Fechar</ActionButton></div></>}
      {dialogKind === 'close-password' && <><h2 id="dialog-title">Etapa 1 de 2 · confirmar identidade</h2><p>Este fluxo apenas apresenta as etapas de encerramento; nenhuma conta ou consulta real será alterada. Na operação futura, remoção e guarda dependerão de cada tipo de registro e da lei aplicável. Para prontuários, a Lei 13.787/2018 prevê prazo mínimo de 20 anos após o último registro.</p><form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!closePassword || response === 'invalid') { setDialogError('Informe a senha para avançar. Nenhuma conta será alterada nesta etapa.'); dialogRef.current?.querySelector('input')?.focus(); return } setDialogError(''); setDialogKind('close-confirm') }}><div className="field"><label htmlFor="close-password">Senha atual</label><input id="close-password" type="password" value={closePassword} autoComplete="off" onChange={(event) => setClosePassword(event.target.value)} /></div>{dialogError && <Alert tone="error">{dialogError}</Alert>}<div className="actions"><button className="button destructive" type="submit">Continuar</button><ActionButton variant="secondary" onClick={() => closeDialog()}>Cancelar</ActionButton></div></form></>}
      {dialogKind === 'close-confirm' && <><h2 id="dialog-title">Etapa 2 de 2 · encerrar conta?</h2><p>Ao confirmar, você verá a tela final deste fluxo. Nenhum acesso, contato, consulta ou registro real será alterado. A política de encerramento do serviço futuro ainda depende da definição dos responsáveis e dos prazos por categoria de dado.</p><div className="actions"><ActionButton variant="destructive" onClick={() => { closeDialog(false); setIdentity('visitor'); navigate('closed') }}>Confirmar encerramento</ActionButton><ActionButton variant="secondary" onClick={() => closeDialog()}>Cancelar</ActionButton></div></>}
    </dialog>
    <GuidedTour open={tourOpen} identity={identity} professionalRole={professionalRole} route={route} navigate={navigate} onClose={() => setTourOpen(false)} />
    <div className="sr-only" aria-live="polite">{announcement}</div>
  </>
}

export default App
