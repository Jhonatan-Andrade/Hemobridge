import test from 'node:test'
import assert from 'node:assert/strict'
import { endSession } from '../src/services/session.ts'

test('sair de uma sessão expirada encerra o fluxo local sem exigir novo login', async (t) => {
  const previous = globalThis.fetch
  t.after(() => { globalThis.fetch = previous })
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/auth/logout')
    assert.equal(options.method, 'POST')
    assert.equal(options.credentials, 'include')
    return Response.json({ message: 'Autenticação necessária' }, { status: 401 })
  }
  await endSession()
})

test('falha de rede ou do serviço não é apresentada como sessão encerrada no servidor', async (t) => {
  const previous = globalThis.fetch
  t.after(() => { globalThis.fetch = previous })
  globalThis.fetch = async () => Response.json({ message: 'Indisponível' }, { status: 503 })
  await assert.rejects(endSession(), /Indisponível/)
  globalThis.fetch = async () => { throw new Error('offline') }
  await assert.rejects(endSession(), /Não foi possível conectar/)
})
