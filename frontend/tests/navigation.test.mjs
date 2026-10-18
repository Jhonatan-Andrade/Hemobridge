import test from 'node:test'
import assert from 'node:assert/strict'
import { postContext, routeFromLocation } from '../src/services/saved-routes.ts'
test('links novos e antigos de redefinição abrem a mesma tela', () => {
  for (const location of [{ hash: '#reset?token=123', pathname: '/' }, { hash: '', pathname: '/redefinir-senha' }, { hash: '#redefinir-senha?token=123', pathname: '/' }]) {
    assert.equal(routeFromLocation(location), 'reset')
  }
  assert.equal(routeFromLocation({ hash: '#%E0%A4%A', pathname: '/' }), 'home')
})
test('o retorno do post só aceita origem interna, posição válida e identificador de publicação', () => {
  const context = { origin: 'home', scroll: 300, postId: '12345678-1234-1234-1234-123456789012' }
  assert.deepEqual(postContext(context), context)
  for (const value of [null, { ...context, origin: 'https://externo.invalid' }, { ...context, scroll: -1 }, { ...context, postId: 'x"]script' }]) assert.equal(postContext(value), null)
})
