import test from 'node:test'
import assert from 'node:assert/strict'
import { readFirstAccess, completeFirstAccess } from '../src/services/first-access.ts'
import { journeyTimings, tourSteps, tourRoleLabels } from '../src/services/tour-content.ts'

function storage(t, values = new Map()) {
  const previous = globalThis.window
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  }
  t.after(() => {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  })
  return values
}

test('apenas a confirmação booleana do servidor libera o primeiro acesso', (t) => {
  storage(t, new Map([['hemobridge.isFirstAccess.conta', 'false']]))
  assert.equal(readFirstAccess({}), true)
  assert.equal(readFirstAccess({ isFirstAccess: 'false' }), true)
  assert.equal(readFirstAccess({ isFirstAccess: false }), false)
})

test('concluir envia a versão à sessão autenticada sem aceitar id de outra conta', async (t) => {
  const previous = globalThis.fetch
  t.after(() => { globalThis.fetch = previous })
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/auth/tour/conclusao')
    assert.equal(options.credentials, 'include')
    assert.deepEqual(JSON.parse(options.body), { versao: 1 })
    return Response.json({ isFirstAccess: false, tourVersion: 1 })
  }
  assert.equal((await completeFirstAccess({ id: 'outro-id-ignorado', tourVersion: 1 })).isFirstAccess, false)
})

test('erro de gravação não libera o tour e pode ser tentado novamente', async (t) => {
  const previous = globalThis.fetch
  t.after(() => { globalThis.fetch = previous })
  const account = { isFirstAccess: true, tourVersion: 1 }
  globalThis.fetch = async () => Response.json({ message: 'Serviço indisponível' }, { status: 503 })
  await assert.rejects(completeFirstAccess(account), /Serviço indisponível/)
  assert.equal(readFirstAccess(account), true)
  globalThis.fetch = async () => Response.json({ isFirstAccess: true })
  await assert.rejects(completeFirstAccess(account), /confirmar/)
})

test('cada perfil apresenta o processo, suas áreas e o perfil sem instruções de inputs', () => {
  const areas = {
    PACIENTE: [
      'Meu painel',
      'Consultas',
      'Exames',
      'Notificações',
      'Locais',
      'Comunidade',
      'Perfil',
    ],
    MEDICO: ['instituição', 'Agenda', 'Atendimento', 'Exames', 'Comunidade', 'Perfil'],
    REPRESENTANTE: ['Necessidades', 'Estoque', 'Comunidade', 'Perfil'],
    ADMINISTRADOR: ['Mapa', 'Moderação', 'Comunidade', 'Perfil'],
  }
  for (const [role, labels] of Object.entries(areas)) {
    const steps = tourSteps(role)
    assert.equal(steps.length, 4)
    assert.equal(steps[0].journey, true)
    assert.match(steps[3].title, /Perfil/)
    assert.ok(tourRoleLabels[role])
    const text = steps.map((s) => `${s.title} ${s.text}`).join(' ')
    for (const label of labels) assert.ok(text.includes(label), `${role}: ${label}`)
    assert.doesNotMatch(text, /fict[ií]ci|\bHEM[- ]?\d+|preencha o campo/i)
  }
  assert.equal(tourSteps().length, 1)
  assert.equal(tourSteps()[0].journey, undefined)
})

test('os três prazos só usam números da instituição quando possuem origem válida', () => {
  const result = journeyTimings([
    {
      etapa: 'TRIAGEM',
      minutos: 15,
      fonte: 'Protocolo da unidade',
      hospital: { nome: 'Hospital Aurora' },
    },
    {
      etapa: 'ATUALIZACAO_STATUS',
      minutos: 120,
      fonte: 'Prazo operacional',
      hospital: { nome: 'Hospital Aurora' },
    },
    { etapa: 'TRIAGEM', minutos: 0, fonte: 'Protocolo', hospital: { nome: 'Inválido' } },
    { etapa: 'DOACAO', minutos: 8, fonte: '', hospital: { nome: 'Sem fonte' } },
    null,
  ])
  assert.deepEqual(
    result.map((s) => s.stage),
    ['TRIAGEM', 'DOACAO', 'ATUALIZACAO_STATUS'],
  )
  assert.equal(result[0].estimates[0].minutos, 15)
  assert.equal(result[0].estimates.length, 1)
  assert.equal(result[1].estimates.length, 0)
  assert.match(result[1].fallback, /10 minutos/)
  assert.equal(result[2].estimates[0].minutos, 120)
  assert.match(journeyTimings({})[2].fallback, /unidade/)
})

test('prazos de hospitais diferentes são apresentados separadamente', () => {
  const estimates = [15, 30].map((minutos, index) => ({
    etapa: 'TRIAGEM',
    minutos,
    fonte: 'Protocolo',
    hospital: { nome: `Instituição ${index}` },
  }))
  assert.deepEqual(
    journeyTimings(estimates)[0].estimates.map((s) => s.minutos),
    [15, 30],
  )
})
