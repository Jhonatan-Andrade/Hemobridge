import { calcularIdade, hojeIso } from './data.js';

describe('data', () => {
  it('usa o fuso de São Paulo para definir o dia de hoje', () => {
    // 02:00 UTC do dia 4 ainda é dia 3 em São Paulo (UTC-3)
    expect(hojeIso(new Date('2026-10-04T02:00:00Z'))).toBe('2026-10-03');
  });

  it.each([
    ['2000-10-03', '2026-10-03', 26], // aniversário hoje
    ['2000-10-04', '2026-10-03', 25], // aniversário amanhã
    ['2000-09-30', '2026-10-03', 26],
    ['2008-02-29', '2026-02-28', 17], // nascido em 29/02
    ['2008-02-29', '2026-03-01', 18],
  ])('nascido em %s tem, em %s, %i anos', (nascimento, hoje, idade) => {
    expect(calcularIdade(nascimento, hoje)).toBe(idade);
  });
});
