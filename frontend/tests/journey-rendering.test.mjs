import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
let server, FirstAccessIntroduction, PlatformExplanation, GuidedTour, HomePage, FeedPage, PostPage
before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    cacheDir: 'node_modules/.vite-journey-render-tests',
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom',
  })
  ;({ FirstAccessIntroduction, PlatformExplanation } = await server.ssrLoadModule('/src/pages/platform-introduction.tsx'))
  ;({ GuidedTour } = await server.ssrLoadModule('/src/components/guided-tour.tsx'))
  ;({ HomePage } = await server.ssrLoadModule('/src/pages/home.tsx'))
  ;({ FeedPage, PostPage } = await server.ssrLoadModule('/src/pages/community.tsx'))
})
after(async () => { await server?.close() })
const noop = () => {}
const user = { id: 'conta-1', perfil: 'PACIENTE', papel: 'PACIENTE', isFirstAccess: true }
const base = {
  navigate: noop, identity: 'patient', participantRole: 'patient', userName: 'Paula', publications: [],
  response: 'success', onLike: noop, onOpenPost: noop, onTour: noop, onReload: noop,
  needsIntroduction: true, onPrepareAccount: noop,
}
const render = (component, props) => renderToStaticMarkup(createElement(component, props))
test('a introdução é conteúdo da área, sem modal e com escolha final depois das explicações', () => {
  const html = render(FirstAccessIntroduction, { user, navigate: noop, onUnderstand: noop })
  assert.doesNotMatch(html, /<dialog|role="dialog"|aria-modal/)
  assert.match(html, /Antes de começar, conheça o HemoBridge/)
  assert.match(html, /Seu lugar nessa ponte/)
  assert.ok(html.indexOf('Entenda no seu ritmo') < html.indexOf('Entendi o HemoBridge. Conhecer minha jornada'))
  assert.match(html, /href="#how-it-works"/)
  assert.match(html, /href="#community"/)
})
test('Home e explicação pública não dependem de login nem abrem o tour', () => {
  const home = render(HomePage, { ...base, identity: 'visitor' })
  assert.match(home, /href="#how-it-works"[^>]*>Como funciona/)
  assert.doesNotMatch(home, /Ver tour|<dialog/)
  const explanation = render(PlatformExplanation, { navigate: noop })
  assert.match(explanation, /O que é o HemoBridge/)
  assert.match(explanation, /Se o médico solicitar exames/)
  assert.doesNotMatch(explanation, /<dialog|Concluir e acessar/)
  const signedIn = render(PlatformExplanation, { navigate: noop, user })
  assert.match(signedIn, /href="#dashboard"[^>]*>Voltar à minha área/)
  assert.doesNotMatch(signedIn, /Fazer pré-cadastro/)
})
test('tour obrigatório oferece saída da conta; revisão permite fechar', () => {
  const mandatory = render(GuidedTour, { user, mandatory: true, onComplete: noop, onClose: noop, onExit: noop })
  assert.match(mandatory, /Etapa 1 de 6/)
  assert.match(mandatory, /Onde fica/)
  assert.match(mandatory, /Sair e continuar depois/)
  assert.doesNotMatch(mandatory, /Fechar orientação/)
  const review = render(GuidedTour, { user: { ...user, perfil: 'MEDICO' }, mandatory: false, onComplete: noop, onClose: noop, onExit: noop })
  assert.match(review, /Etapa 1 de 4/)
  assert.match(review, /Sua instituição e seu acesso/)
  assert.match(review, /Fechar orientação/)
  assert.doesNotMatch(review, /Sair e continuar depois/)
})
test('Comunidade preserva leitura e encaminha conta pendente à introdução antes de publicar ou comentar', () => {
  const feed = render(FeedPage, base)
  assert.match(feed, /Você pode ler a Comunidade agora/)
  assert.doesNotMatch(feed, /<form|Publicando como|Entrar para publicar/)
  const post = {
    id: 'post-1', author: 'Equipe', date: '2026-10-25T10:00:00Z', title: 'Informações de doação',
    content: 'Converse sobre doação.', role: 'institution', comments: [], commentsTotal: 0,
    likes: 0, verified: false, pinned: false,
  }
  const detail = render(PostPage, { ...base, route: 'post/post-1/comments', publications: [post], postOrigin: 'community' })
  assert.match(detail, /Informações de doação/)
  assert.match(detail, /A leitura continua disponível/)
  assert.doesNotMatch(detail, /<form|Escrever um comentário|Denunciar publicação/)
})
