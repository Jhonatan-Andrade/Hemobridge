import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server, ExamReview
before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    cacheDir: 'node_modules/.vite-exam-review-tests',
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
  })
  ;({ ExamReview } = await server.ssrLoadModule('/src/components/exam-review.tsx'))
})
after(async () => { await server?.close() })
const base = {
  id: 'exame-teste',
  situacao: 'EM_ANALISE',
  nomeOriginal: 'resultado.pdf',
  enviadoEm: '2026-10-18T12:00:00Z',
  podeAvaliar: true,
}
const render = (values = {}) => renderToStaticMarkup(createElement(ExamReview, {
  exam: { ...base, ...values },
  bloodTypes: [{ id: 1, sigla: 'A+' }],
  onRetryTypes() {},
  onUpdated() {},
}))

test('somente o resultado em análise autorizado pela API apresenta avaliação e confirmação explícita', () => {
  const html = render()
  assert.match(html, /Avaliar resultado/)
  assert.match(html, /Avaliação deste resultado/)
  assert.match(html, /Revisei o resultado e confirmo/)
  assert.match(html, /disabled="">Confirmar avaliação/)
  assert.match(html, /href="\/api\/medico\/exames\/exame-teste\/arquivo"/)
  assert.match(html, /rel="noopener noreferrer"/)
})
test('registro histórico ou não autorizado permanece somente para consulta', () => {
  for (const values of [
    { podeAvaliar: false },
    { podeAvaliar: undefined },
    { situacao: 'VALIDADO' },
    { situacao: 'REPROVADO' },
  ]) {
    assert.doesNotMatch(render(values), /<form|Confirmar avaliação|Avaliar resultado/)
  }
})
test('motivo anterior é apresentado como texto, preservando o histórico sem executar conteúdo', () => {
  const html = render({
    situacao: 'REPROVADO',
    motivoReprovacao: 'Arquivo ilegível <script>conteúdo</script>',
    avaliadoEm: '2026-10-18T12:30:00Z',
  })
  assert.match(html, /Arquivo ilegível &lt;script&gt;/)
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /Avaliado em/)
  assert.doesNotMatch(html, /<form/)
})
