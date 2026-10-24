import test from 'node:test'
import assert from 'node:assert/strict'
import { notificationDestination } from '../src/services/notification-destination.ts'

test('avisos abrem os destinos internos de consultas, exames e necessidades', () => {
  for (const [link, route] of [
    ['/meus-exames', 'external-exams'], ['/minhas-consultas', 'external-consultations'],
    ['/exames-para-avaliar', 'professional/exams'], ['/#external-consultations', 'external-consultations'],
    ['/bancos-de-sangue/01234567-89ab-cdef-0123-456789abcdef', 'external-locations'],
  ]) assert.equal(notificationDestination(link), route)
})

test('notificações não abrem URLs externas, scripts nem destinos sem contrato', () => {
  for (const link of [null, '', 'https://externo.invalid', '//externo.invalid', 'javascript:alert(1)', '/bancos-de-sangue/../login', '/#login', '/meus-exames?redirect=externo']) {
    assert.equal(notificationDestination(link), null)
  }
})

test('o destino respeita a área do perfil autenticado', () => {
  assert.equal(notificationDestination('/#profile', 'MEDICO'), 'professional/profile')
  assert.equal(notificationDestination('/#profile', 'PACIENTE'), 'profile')
  assert.equal(notificationDestination('/meus-exames', 'REPRESENTANTE'), null)
  assert.equal(notificationDestination('/exames-para-avaliar', 'PACIENTE'), null)
  assert.equal(notificationDestination('/exames-para-avaliar', 'MEDICO'), 'professional/exams')
})
