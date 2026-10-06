import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrimeiroAcessoDto } from './primeiro-acesso.dto.js';

const valido = { novaSenha: 'NovaSenha9', confirmacaoSenha: 'NovaSenha9', aceiteTermo: true, versaoTermo: '1.0' };

async function camposComErro(alteracao: Record<string, unknown>) {
  const erros = await validate(plainToInstance(PrimeiroAcessoDto, { ...valido, ...alteracao }));
  return erros.map((e) => e.property);
}

describe('PrimeiroAcessoDto', () => {
  it('aceita dados válidos', async () => {
    expect(await camposComErro({})).toEqual([]);
  });

  it.each([
    ['novaSenha', { novaSenha: 'fraca', confirmacaoSenha: 'fraca' }],
    ['confirmacaoSenha', { confirmacaoSenha: 'OutraSenha9' }],
    ['aceiteTermo', { aceiteTermo: false }],
  ])('rejeita %s inválido', async (campo, alteracao) => {
    expect(await camposComErro(alteracao)).toContain(campo);
  });
});
