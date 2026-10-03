import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PreCadastroDto } from './pre-cadastro.dto.js';
import { preCadastroValido } from './pre-cadastro.fixture.js';

async function errosDe(dados: Record<string, unknown>) {
  const dto = plainToInstance(PreCadastroDto, dados);
  const erros = await validate(dto);
  return { dto, campos: erros.map((e) => e.property) };
}

describe('PreCadastroDto', () => {
  it('aceita dados válidos e normaliza os campos', async () => {
    const { dto, campos } = await errosDe(preCadastroValido());
    expect(campos).toEqual([]);
    expect(dto.nome).toBe('Maria da Silva');
    expect(dto.cpf).toBe('52998224725');
    expect(dto.email).toBe('maria@email.com');
    expect(dto.telefone).toBe('41999998888');
    expect(dto.estado).toBe('PR');
  });

  it.each([
    ['cpf', { cpf: '529.982.247-24' }],
    ['email', { email: 'nao-e-email' }],
    ['senha', { senha: 'senhafraca1', confirmacaoSenha: 'senhafraca1' }],
    ['senha', { senha: 'SENHAFRACA1', confirmacaoSenha: 'SENHAFRACA1' }],
    ['senha', { senha: 'SenhaFraca', confirmacaoSenha: 'SenhaFraca' }],
    ['senha', { senha: 'Abc1234', confirmacaoSenha: 'Abc1234' }],
    ['confirmacaoSenha', { confirmacaoSenha: 'outraSenha1' }],
    ['telefone', { telefone: '9999' }],
    ['dataNascimento', { dataNascimento: '20/05/1995' }],
    ['dataNascimento', { dataNascimento: '1995-02-30' }],
    ['sexo', { sexo: 'X' }],
    ['pesoKg', { pesoKg: 62.555 }],
    ['estado', { estado: 'XX' }],
    ['aceiteTermo', { aceiteTermo: false }],
  ])('rejeita %s inválido (%o)', async (campo, alteracao) => {
    const { campos } = await errosDe({ ...preCadastroValido(), ...alteracao });
    expect(campos).toContain(campo);
  });
});
