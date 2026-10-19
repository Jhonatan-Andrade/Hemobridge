import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server, DoctorScheduleItem
before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    cacheDir: 'node_modules/.vite-doctor-agenda-tests',
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
  })
  ;({ DoctorScheduleItem } = await server.ssrLoadModule('/src/pages/professional.tsx'))
})
after(async () => { await server?.close() })

const slot = (status = 'REALIZADA', values = {}) => ({
  id: 'horario-teste',
  inicio: new Date(Date.now() - 3600000).toISOString(),
  fim: new Date(Date.now() - 1800000).toISOString(),
  linkVideochamada: 'https://meet.example.invalid/consulta',
  consultas: [{ id: 'consulta-teste', status, paciente: { usuario: { nome: 'Ana Souza' } } }],
  ...values,
})
const render = (value, attendance = true) => renderToStaticMarkup(createElement(DoctorScheduleItem, {
  slot: value, attendance, onUpdated() {},
}))

test('histórico permite solicitar exames sem repetir registro nem abrir teleconsulta encerrada', () => {
  const html = render(slot())
  assert.match(html, /Retomar atendimento/)
  assert.match(html, /Solicitar exames ao paciente/)
  assert.doesNotMatch(html, /Registrar como realizado|Registrar ausência|Entrar na consulta/)
  assert.doesNotMatch(html, /<fieldset[^>]*disabled/)
})

test('consulta futura mantém registro clínico bloqueado e oferece link seguro separado', () => {
  const html = render(slot('AGENDADA', {
    inicio: new Date(Date.now() + 3600000).toISOString(),
    fim: new Date(Date.now() + 5400000).toISOString(),
  }))
  assert.match(html, /a partir do início agendado/)
  assert.match(html, /<fieldset[^>]*disabled/)
  assert.match(html, /href="https:\/\/meet.example.invalid\/consulta"/)
  assert.match(html, /target="_blank" rel="noopener noreferrer"/)
})

test('links inseguros e credenciais na URL não são expostos como acesso ao atendimento', () => {
  for (const linkVideochamada of ['http://meet.example.invalid', 'javascript:alert(1)', 'https://usuario:senha@meet.example.invalid']) {
    assert.doesNotMatch(render(slot('AGENDADA', { linkVideochamada })), /Entrar na consulta|href=/)
  }
  assert.doesNotMatch(render(slot('NAO_COMPARECEU')), /<form|Registrar como realizado|Solicitar exames|Entrar na consulta/)
  assert.doesNotMatch(render(slot('AGENDADA'), false), /<form|Registrar como realizado/)
})

test('horário passado sem consulta não é anunciado como disponibilidade futura', () => {
  assert.match(render(slot('AGENDADA', { consultas: [] })), /Sem consulta agendada/)
  assert.doesNotMatch(render(slot('AGENDADA', { consultas: [] })), /Horário disponível/)
  assert.match(render(slot('AGENDADA', {
    consultas: [], inicio: new Date(Date.now() + 3600000).toISOString(),
  })), /Horário disponível/)
})
