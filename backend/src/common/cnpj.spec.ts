import { isCnpjValido } from './cnpj.js';

describe('isCnpjValido', () => {
  it.each(['11.222.333/0001-81', '11222333000181', '45.997.418/0001-53'])('aceita %s', (cnpj) =>
    expect(isCnpjValido(cnpj)).toBe(true),
  );

  it.each(['11222333000182', '11111111111111', '1122233300018', 'abc', ''])('rejeita %s', (cnpj) =>
    expect(isCnpjValido(cnpj)).toBe(false),
  );
});
