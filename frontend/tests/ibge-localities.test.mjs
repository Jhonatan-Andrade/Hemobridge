import test from 'node:test'
import assert from 'node:assert/strict'
import { loadStates, loadMunicipalities } from '../src/services/ibge-localities.ts'

const signal = () => new AbortController().signal
const response = (data, status = 200) => new Response(JSON.stringify(data), { status })

test('valida a sigla antes de guardar os estados e permite repetir após uma resposta inválida', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
    assert.equal(options.credentials, 'omit')
    calls++
    return response(
      calls === 1 ? [{ id: 41, nome: 'Paraná' }] : [{ id: 41, nome: 'Paraná', sigla: 'PR' }],
    )
  })
  await assert.rejects(loadStates(signal()), /formato.*inválido/)
  assert.deepEqual(await loadStates(signal()), [{ id: 41, nome: 'Paraná', sigla: 'PR' }])
  await loadStates(signal())
  assert.equal(calls, 2)
})

test('consulta somente os municípios da UF selecionada e conserva acentos', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(
      url,
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados/PR/municipios?orderBy=nome',
    )
    return response([
      { id: 4106902, nome: 'Curitiba' },
      { id: 4101804, nome: 'Araucária' },
    ])
  })
  const cities = await loadMunicipalities('PR', signal())
  assert.equal(cities[1].nome, 'Araucária')
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(loadMunicipalities('PR', controller.signal), { name: 'AbortError' })
})

test('falhas HTTP não são guardadas em cache e podem ser recuperadas', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () =>
    ++calls === 1 ? response({}, 503) : response([{ id: 3550308, nome: 'São Paulo' }]),
  )
  await assert.rejects(loadMunicipalities('SP', signal()), /Não foi possível/)
  assert.equal((await loadMunicipalities('SP', signal()))[0].nome, 'São Paulo')
  assert.equal(calls, 2)
})

test('rejeita UF inválida e dados malformados sem criar opções inválidas', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    return response([null])
  })
  await assert.rejects(loadMunicipalities('../SP', signal()), /Estado inválido/)
  assert.equal(calls, 0)
  await assert.rejects(loadMunicipalities('MG', signal()), /formato.*inválido/)
})

test('uma resposta atrasada de uma busca cancelada não é reutilizada', async (t) => {
  let finish
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    if (calls === 1)
      return new Promise((resolve) => {
        finish = resolve
      })
    return response([{ id: 4314902, nome: 'Porto Alegre' }])
  })
  const controller = new AbortController()
  const pending = loadMunicipalities('RS', controller.signal)
  controller.abort()
  finish(response([{ id: 1, nome: 'Resposta antiga' }]))
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal((await loadMunicipalities('RS', signal()))[0].nome, 'Porto Alegre')
  assert.equal(calls, 2)
})
