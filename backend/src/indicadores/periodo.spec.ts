import { BadRequestException } from '@nestjs/common';
import { resolverPeriodo } from './periodo.js';

describe('resolverPeriodo (UC23/UC24)', () => {
  const HOJE = '2026-10-09';

  it('padrão: últimos 30 dias até hoje', () => {
    const p = resolverPeriodo(undefined, undefined, HOJE);
    expect(p).toMatchObject({ de: '2026-09-10', ate: HOJE });
    expect(p.dias).toHaveLength(30);
    expect(p.inicio.toISOString()).toBe('2026-09-10T03:00:00.000Z');
    expect(p.fim.toISOString()).toBe('2026-10-10T03:00:00.000Z');
  });

  it.each([
    ['inicial depois da final', '2026-10-05', '2026-10-01', /posterior à data final/],
    ['inicial depois de hoje', '2026-10-10', '2026-10-12', /posterior ao dia atual/],
    ['período longo demais', '2024-01-01', '2026-01-01', /no máximo/],
  ])('recusa %s (FE01)', (_, de, ate, msg) => {
    expect(() => resolverPeriodo(de, ate, HOJE)).toThrow(BadRequestException);
    expect(() => resolverPeriodo(de, ate, HOJE)).toThrow(msg);
  });
});
