import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { preCadastroValido } from './dto/pre-cadastro.fixture.js';
import { PreCadastroDto } from './dto/pre-cadastro.dto.js';
import { PacientesService } from './pacientes.service.js';

const HOJE = new Date('2026-10-03T12:00:00-03:00');

function criarService() {
  const prisma = {
    usuario: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'uuid-1',
          nome: data.nome,
          email: data.email,
          paciente: { situacao: 'PRE_CADASTRADO' },
        }),
      ),
    },
  };
  const service = new PacientesService(prisma as unknown as PrismaService);
  return { service, prisma };
}

const dto = (alteracao: Record<string, unknown> = {}) =>
  plainToInstance(PreCadastroDto, { ...preCadastroValido(), ...alteracao });

describe('PacientesService.preCadastrar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(HOJE);
  });
  afterEach(() => vi.useRealTimers());

  it('cria usuário, paciente PRE_CADASTRADO e consentimento com hash da senha', async () => {
    const { service, prisma } = criarService();

    const resultado = await service.preCadastrar(dto(), '127.0.0.1');

    expect(resultado).toEqual({
      id: 'uuid-1',
      nome: 'Maria da Silva',
      email: 'maria@email.com',
      situacao: 'PRE_CADASTRADO',
      proximoPasso: 'AGENDAR_CONSULTA',
    });
    const { data } = prisma.usuario.create.mock.calls[0][0];
    expect(data.perfil).toBe('PACIENTE');
    expect(data.cpf).toBe('52998224725');
    expect(data.senhaHash).toMatch(/^\$argon2id\$/);
    expect(data).not.toHaveProperty('senha');
    expect(data.paciente.create.dataNascimento).toEqual(new Date('1995-05-20T00:00:00Z'));
    expect(data.consentimentos.create).toMatchObject({ versaoTermo: '1.0', ipOrigem: '127.0.0.1' });
  });

  it('rejeita e-mail ou CPF já cadastrado (FE02)', async () => {
    const { service, prisma } = criarService();
    prisma.usuario.findFirst.mockResolvedValue({ id: 'outro' });

    await expect(service.preCadastrar(dto())).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  it('converte violação de unicidade concorrente (P2002) em conflito', async () => {
    const { service, prisma } = criarService();
    prisma.usuario.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' }),
    );

    await expect(service.preCadastrar(dto())).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    ['menor de 16 anos', { dataNascimento: '2010-10-04' }],
    ['maior de 69 anos', { dataNascimento: '1956-10-03', cienteRegraAcimaDe60: true }],
    ['peso abaixo de 50 kg', { pesoKg: 49.9 }],
  ])('rejeita %s (FE04)', async (_, alteracao) => {
    const { service, prisma } = criarService();

    await expect(service.preCadastrar(dto(alteracao))).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  it.each([
    ['16 anos completos hoje', { dataNascimento: '2010-10-03' }],
    ['69 anos com ciência da regra', { dataNascimento: '1957-10-03', cienteRegraAcimaDe60: true }],
    ['peso exatamente 50 kg', { pesoKg: 50 }],
  ])('aceita %s', async (_, alteracao) => {
    const { service } = criarService();
    await expect(service.preCadastrar(dto(alteracao))).resolves.toBeDefined();
  });

  it('exige ciência da regra para quem tem mais de 60 anos (FA01)', async () => {
    const { service } = criarService();

    await expect(
      service.preCadastrar(dto({ dataNascimento: '1965-01-01' })),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejeita versão de termo diferente da vigente', async () => {
    const { service } = criarService();
    await expect(service.preCadastrar(dto({ versaoTermo: '0.9' }))).rejects.toThrow(/versão do termo/);
  });
});
