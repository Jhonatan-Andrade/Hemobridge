import { impedimentoDeDoacao, proximaDoacaoPermitida, regraDoacao } from './regra-doacao.js';

describe('regra de intervalo entre doações (Ministério da Saúde)', () => {
  it('homens: 60 dias e até 4 doações em 12 meses; mulheres: 90 dias e até 3', () => {
    expect(regraDoacao('MASCULINO')).toEqual({ intervaloDias: 60, limiteAnual: 4 });
    expect(regraDoacao('FEMININO')).toEqual({ intervaloDias: 90, limiteAnual: 3 });
  });

  it('sem sexo informado, aplica a regra mais restritiva', () => {
    expect(regraDoacao(null)).toEqual(regraDoacao('FEMININO'));
    expect(impedimentoDeDoacao(null, '2026-10-01', ['2026-08-01'])).toMatch(/90 dias quando o sexo não foi informado/);
  });

  it('respeita o intervalo exato, nos dois sentidos', () => {
    expect(impedimentoDeDoacao('MASCULINO', '2026-03-02', ['2026-01-01'])).toBeNull();
    expect(impedimentoDeDoacao('MASCULINO', '2026-03-01', ['2026-01-01'])).toMatch(/a partir de 02\/03\/2026/);
    expect(impedimentoDeDoacao('FEMININO', '2026-01-01', ['2026-03-01'])).toMatch(/até 01\/12\/2025/);
    expect(impedimentoDeDoacao('FEMININO', '2026-01-01', ['2026-04-01'])).toBeNull();
  });

  it('limita as doações em qualquer janela de 12 meses que contenha a nova data', () => {
    const mulher = ['2026-01-01', '2026-04-01', '2026-07-01'];
    expect(impedimentoDeDoacao('FEMININO', '2026-10-01', mulher)).toMatch(/limite é de 3 doações/);
    expect(impedimentoDeDoacao('FEMININO', '2027-01-01', mulher)).toBeNull();
    // A nova data no meio: a janela que começa nela também conta as futuras.
    expect(impedimentoDeDoacao('MASCULINO', '2026-03-01', ['2026-05-01', '2026-07-01', '2026-09-01', '2026-11-01'])).toMatch(
      /limite é de 4/,
    );
  });

  it('próxima doação permitida a partir da última doação efetiva', () => {
    expect(proximaDoacaoPermitida('MASCULINO', '2026-08-01')).toBe('2026-09-30');
    expect(proximaDoacaoPermitida('FEMININO', '2026-08-01')).toBe('2026-10-30');
    expect(proximaDoacaoPermitida('MASCULINO', null)).toBeNull();
  });
});
