import test from 'node:test'
import assert from 'node:assert/strict'
import { localDateTimeValue } from '../src/services/local-date-time.ts'

test('datetime-local mantém o horário brasileiro e aceita um prazo na próxima hora', () => {
  const previous = process.env.TZ
  try {
    process.env.TZ = 'America/Sao_Paulo'
    const now = new Date('2026-10-26T12:00:00Z')
    const minimum = localDateTimeValue(now)
    assert.equal(minimum, '2026-10-26T09:00')
    assert.ok('2026-10-26T10:00' > minimum)
    assert.equal(new Date('2026-10-26T10:00').toISOString(), '2026-10-26T13:00:00.000Z')
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
})

test('datetime-local respeita a mudança de dia em um fuso positivo', () => {
  const previous = process.env.TZ
  try {
    process.env.TZ = 'Asia/Tokyo'
    assert.equal(localDateTimeValue(new Date('2026-10-26T18:07:00Z')), '2026-10-27T03:07')
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
})
