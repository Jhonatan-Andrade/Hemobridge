import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CadastroService } from './cadastro.service.js';
import { CadastroDto } from './dto/cadastro.dto.js';
import { cadastroValido } from './dto/cadastro.fixture.js';

function criarService() {
  const prisma = {
    usuario: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'uuid-1', nome: data.nome, email: data.email, paciente: { situacao: 'PENDENTE' } }),
      ),
    },
  };
  return { service: new CadastroService(prisma as unknown as PrismaService), prisma };
}

const dto = (alteracao: Record<string, unknown> = {}) =>
  plainToInstance(CadastroDto, { ...cadastroValido(), ...alteracao });

describe('CadastroService.cadastrar', () => {
  it('cria usuário, paciente PENDENTE e consentimento versionado com hash da senha', async () => {
    const { service, prisma } = criarService();

    await expect(service.cadastrar(dto(), '127.0.0.1')).resolves.toEqual({
      id: 'uuid-1',
      nome: 'Maria da Silva',
      email: 'maria@email.com',
      situacao: 'PENDENTE',
    });
    const { data } = prisma.usuario.create.mock.calls[0][0];
    expect(data.perfil).toBe('PACIENTE');
    expect(data.cpf).toBe('52998224725');
    expect(data.senhaHash).toMatch(/^\$argon2id\$/);
    expect(data).not.toHaveProperty('senha');
    expect(data.paciente.create).toEqual({ dataNascimento: new Date('1995-05-20T00:00:00Z'), sexo: 'FEMININO' });
    expect(data.consentimentos.create).toMatchObject({ versaoTermo: '3.0', ipOrigem: '127.0.0.1' });
    expect(data.consentimentos.create.finalidade).toMatch(/compartilhar o histórico/);
  });

  it('rejeita e-mail ou CPF já cadastrado', async () => {
    const { service, prisma } = criarService();
    prisma.usuario.findFirst.mockResolvedValue({ id: 'outro' });

    await expect(service.cadastrar(dto())).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  it('converte violação de unicidade concorrente (P2002) em conflito', async () => {
    const { service, prisma } = criarService();
    prisma.usuario.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' }),
    );

    await expect(service.cadastrar(dto())).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita versão de termo diferente da vigente', async () => {
    const { service } = criarService();
    await expect(service.cadastrar(dto({ versaoTermo: '1.0' }))).rejects.toBeInstanceOf(BadRequestException);
  });
});
