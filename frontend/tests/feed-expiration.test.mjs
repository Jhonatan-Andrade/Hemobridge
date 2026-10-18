import test from 'node:test'
import assert from 'node:assert/strict'
import { expirePinnedPublications, nextPinExpiryDelay } from '../src/services/feed-expiration.ts'

const now = Date.parse('2026-10-17T12:00:00Z')
const post = (id, date, pinned = false, pinnedUntil) => ({ id, date, pinned, pinnedUntil })

test('um aviso vencido perde a fixação e volta à ordem cronológica, sem alterar a entrada', () => {
  const old = post('antigo', '2026-10-15T12:00:00Z', true, '2026-10-17T12:00:00Z')
  const recent = post('recente', '2026-10-17T11:00:00Z')
  const result = expirePinnedPublications([old, recent], now)
  assert.deepEqual(result.map(p => p.id), ['recente', 'antigo'])
  assert.equal(result[1].pinned, false)
  assert.equal(old.pinned, true)
})

test('um aviso ativo continua no topo até expirar, sem promover uma publicação comum', () => {
  const active = post('ativo', '2026-10-16T12:00:00Z', true, '2026-10-17T13:00:00Z')
  const common = post('comum', '2026-10-17T11:00:00Z', false, '2026-10-17T14:00:00Z')
  assert.deepEqual(expirePinnedPublications([common, active], now).map(p => p.id), ['ativo', 'comum'])
  assert.equal(common.pinned, false)
})

test('um prazo ausente ou inválido não mantém destaque e a lista sem fixados dispensa timer', () => {
  const invalid = post('inválido', '2026-10-17T11:00:00Z', true)
  assert.equal(expirePinnedPublications([invalid], now)[0].pinned, false)
  assert.equal(nextPinExpiryDelay([], now), null)
  assert.equal(nextPinExpiryDelay([post('comum', '2026-10-17T11:00:00Z')], now), null)
})

test('a próxima atualização considera o primeiro prazo entre os avisos carregados', () => {
  const a = post('a', '2026-10-17T10:00:00Z', true, '2026-10-17T13:00:00Z')
  const b = post('b', '2026-10-17T11:00:00Z', true, '2026-10-17T12:30:00Z')
  assert.equal(nextPinExpiryDelay([a, b], now), 30 * 60_000 + 10)
  assert.equal(nextPinExpiryDelay([b], now + 60 * 60_000), 0)
})
