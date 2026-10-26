import test from 'node:test'
import assert from 'node:assert/strict'
import { readFirstAccess, completeFirstAccess } from '../src/services/first-access.ts'
import { tourSteps, tourRoleLabels } from '../src/services/tour-content.ts'

import { hasPendingJourney, journeyDialogMode, needsJourneyIntroduction } from '../src/services/onboarding-flow.ts'

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

test('cada perfil explica seu próprio trabalho e onde estão as funções existentes', () => {
  const areas = {
    PACIENTE: ['Meu painel', 'Minhas consultas', 'Meus exames', 'Notificações', 'Locais', 'Comunidade', 'Perfil'],
    MEDICO: ['instituição', 'Minha agenda', 'Atendimento', 'Exames', 'Comunidade', 'Perfil'],
    REPRESENTANTE: ['Necessidades', 'Registrar doação', 'Estoque', 'Comunidade', 'Perfil'],
    ADMINISTRADOR: ['Mapa regional', 'Moderação', 'Privacidade', 'Comunidade', 'Perfil'],
  }
  for (const [role, labels] of Object.entries(areas)) {
    const steps = tourSteps(role)
    assert.equal(steps.length, role === 'PACIENTE' ? 6 : 4)
    assert.ok(tourRoleLabels[role])
    const text = steps.map((s) => `${s.title} ${s.text} ${s.location}`).join(' ')
    for (const label of labels) assert.ok(text.includes(label), `${role}: ${label}`)
    for (const step of steps) assert.ok(step.location.length > 5)
    assert.doesNotMatch(text, /fict[ií]ci|\bHEM[- ]?\d+|preencha o campo|gestão de acessos/i)
  }
})
test('a jornada distingue cadastro, orientação automática, exames condicionais e aptidão presencial', () => {
  const steps = tourSteps('PACIENTE')
  assert.match(steps[0].text, /Não há uma aprovação administrativa separada/)
  assert.match(steps[1].text, /não é uma aprovação clínica/)
  assert.match(steps[2].text, /concluir a consulta, por si só, não indica aprovação/)
  assert.match(steps[3].text, /Se o médico solicitar/)
  assert.match(steps[3].text, /avaliação dos resultados solicitados/)
  assert.match(steps[4].text, /não reserva a coleta/)
  assert.match(steps[4].text, /triagem presencial/)
  assert.match(steps[5].text, /instituição registra/)
  assert.doesNotMatch(steps[5].text, /processando|sincroniza.*automaticamente/i)
})
test('doador aprovado recebe contexto das etapas já percorridas, sem novo agendamento como pendência', () => {
  const steps = tourSteps('PACIENTE', true)
  assert.match(steps[0].text, /já concluiu o pré-cadastro e sua avaliação/)
  assert.match(steps[1].text, /histórico/)
  assert.match(steps[1].text, /onde doar agora, use Locais/)
  assert.doesNotMatch(steps[1].location, /Agendar consulta/)
})
test('a única duração numérica é a referência da coleta presencial do paciente', () => {
  for (const role of Object.keys(tourRoleLabels)) {
    const steps = tourSteps(role)
    const references = steps.filter((s) => s.collectionReference)
    assert.equal(references.length, role === 'PACIENTE' ? 1 : 0)
    for (const step of steps) {
      if (step.collectionReference) {
        assert.match(step.duration, /Hemominas.*dez minutos/)
        assert.match(step.duration, /não inclui todo o atendimento/)
      } else if (step.duration) assert.match(step.duration, /varia conforme a instituição/)
    }
  }
})
const account = { id: 'conta-1', perfil: 'PACIENTE', isFirstAccess: true, senhaProvisoria: false }
test('login, restauração de sessão e troca de rota não abrem a apresentação automaticamente', () => {
  assert.equal(hasPendingJourney(account), true)
  for (const route of ['home', 'dashboard', 'profile', 'professional/exams', 'community']) {
    assert.equal(journeyDialogMode(account, null), null, route)
  }
  assert.equal(journeyDialogMode(null, null), null)
  assert.equal(journeyDialogMode({ ...account, senhaProvisoria: true }, account.id), null)
  assert.equal(journeyDialogMode({ ...account, id: 'outra-conta' }, account.id), null)
})
test('só a escolha explícita da conta abre o modo obrigatório; revisão permanece opcional', () => {
  assert.equal(journeyDialogMode(account, account.id), 'mandatory')
  assert.equal(journeyDialogMode({ ...account, isFirstAccess: false }, account.id), 'review')
  assert.equal(journeyDialogMode({ ...account, isFirstAccess: false }, null), null)
})
test('conta pendente preserva conteúdo público e mostra introdução antes das funções privadas', () => {
  for (const route of ['dashboard', 'profile', 'notifications', 'professional', 'professional/stock', 'external-booking', 'external-exams']) {
    assert.equal(needsJourneyIntroduction(account, route), true, route)
    assert.equal(needsJourneyIntroduction({ ...account, isFirstAccess: false }, route), false, route)
    assert.equal(needsJourneyIntroduction(null, route), false, route)
  }
  for (const route of ['home', 'how-it-works', 'community', 'post/123/comments', 'external-locations', 'privacy', 'accessibility', 'first']) {
    assert.equal(needsJourneyIntroduction(account, route), false, route)
  }
})
