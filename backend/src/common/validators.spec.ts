import { isSenhaValida } from './validators.js';

describe('isSenhaValida', () => {
  it.each(['Senha123', 'senhaForte1', 'ÁrvoreVerde9', 'Abcdefg1', 'Senha 123 com espaço'])(
    'aceita %s',
    (senha) => expect(isSenhaValida(senha)).toBe(true),
  );

  it.each([
    ['curta demais', 'Abcde12'],
    ['sem maiúscula', 'senhaforte1'],
    ['sem minúscula', 'SENHAFORTE1'],
    ['sem número', 'SenhaForte'],
    ['só números', '12345678'],
    ['longa demais', 'Aa1' + 'x'.repeat(126)],
    ['não é texto', 12345678],
  ])('rejeita senha %s', (_, senha) => expect(isSenhaValida(senha)).toBe(false));
});
