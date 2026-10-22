import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { expirePinnedPublications } from '../src/services/feed-expiration.ts'

let server, PublicationCard, FeedPage
before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    cacheDir: 'node_modules/.vite-render-tests',
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
  })
  ;({ PublicationCard, FeedPage } = await server.ssrLoadModule('/src/pages/community.tsx'))
})
after(async () => {
  await server?.close()
})

const post = (id, values = {}) => ({
  id,
  author: 'Dra. Helena Duarte',
  date: '2026-10-18T12:00:00Z',
  title: `Publicação ${id}`,
  content: 'Informações gerais sobre saúde e doação de sangue.',
  role: 'doctor',
  verified: true,
  pinned: false,
  likes: 2,
  liked: false,
  comments: [],
  commentsTotal: 0,
  topic: 'DOACAO',
  ...values,
})
const noop = () => {}
const renderCard = (publication) =>
  renderToStaticMarkup(
    createElement(PublicationCard, { publication, onLike: noop, onOpenPost: noop }),
  )

test('o médico com registro conferido recebe destaque e selo legível', () => {
  const html = renderCard(post('medico'))
  assert.match(html, /post-doctor/)
  assert.match(html, /class="verified-badge"/)
  assert.match(html, /Perfil Verificado/)
  assert.match(html, /Registro profissional conferido/)
  assert.match(html, /Médico/)
  assert.doesNotMatch(html, /fixado no topo/)
})

test('a role sozinha e um sinal de verificação incompatível não criam selo', () => {
  for (const publication of [
    post('pendente', { verified: false }),
    post('paciente', { role: 'patient' }),
    post('administrador', { role: 'administrator' }),
  ]) {
    const html = renderCard(publication)
    assert.doesNotMatch(html, /verified-badge|post-doctor|Perfil Verificado/)
  }
})

test('a renderização separa avisos institucionais no topo e preserva os posts recentes', () => {
  const items = expirePinnedPublications(
    [
      post('recente', { date: '2026-10-18T12:00:00Z' }),
      post('antigo', { date: '2026-10-17T12:00:00Z', role: 'patient', verified: false }),
      post('critico', {
        date: '2026-10-16T12:00:00Z',
        role: 'representative',
        pinned: true,
        pinnedUntil: '2026-10-19T12:00:00Z',
      }),
    ],
    Date.parse('2026-10-18T12:00:00Z'),
  )
  const html = renderToStaticMarkup(
    createElement(FeedPage, {
      publications: items,
      response: 'success',
      identity: 'visitor',
      participantRole: 'patient',
      hasMore: true,
      navigate: noop,
      onReload: noop,
      onLoadMore: noop,
      onLike: noop,
      onOpenPost: noop,
    }),
  )
  assert.deepEqual(
    [...html.matchAll(/data-post="([^"]+)"/g)].map((match) => match[1]),
    ['critico', 'recente', 'antigo'],
  )
  assert.match(html, /Avisos prioritários/)
  assert.match(html, /Publicações recentes/)
  assert.match(html, /Aviso crítico · fixado no topo/)
  assert.match(html, /datetime="2026-10-19T12:00:00Z"/i)
  assert.match(html, /Carregar mais publicações/)
})

test('aviso vencido retorna à cronologia e uma data inválida não quebra o card', () => {
  const [expired] = expirePinnedPublications(
    [post('vencido', { role: 'institution', pinned: true, pinnedUntil: '2026-10-17T12:00:00Z' })],
    Date.parse('2026-10-18T12:00:00Z'),
  )
  assert.doesNotMatch(renderCard(expired), /post-pinned|fixado no topo/)
  assert.match(
    renderCard(post('data-invalida', { date: 'inválida', pinned: true, pinnedUntil: 'inválida' })),
    /Data indisponível/,
  )
})
