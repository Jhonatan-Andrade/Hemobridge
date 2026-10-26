import { UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { AuditoriaService } from '../auditoria/auditoria.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { DoacoesService } from './doacoes.service.js';
import { DoacaoVinculadaDto } from './dto/doacao.dto.js';

const hoje = '2026-10-23';
const pacienteId = '4ddcc194-4bcb-4e60-b772-e04ff2010ace';
const dto = { pacienteId, dataColeta: hoje, pesoAferido: 70 };
function montar() {
  const paciente = {
    usuarioId: pacienteId,
    situacao: 'APROVADO',
    dataNascimento: new Date('1990-05-10T00:00:00Z'),
    sexo: 'MASCULINO',
    tipoSanguineoId: 7,
    tipoSanguineo: { sigla: 'O-' },
    usuario: { nome: 'Doador Teste', status: 'ATIVO' },
    doacoes: [] as {
      dataColeta: Date;
      doouAntesDos60Confirmado?: boolean | null;
    }[],
  };
  const prisma = {
    $transaction: vi.fn(),
    $queryRaw: vi.fn().mockResolvedValue([{ usuario_id: pacienteId }]),
    paciente: { findUnique: vi.fn().mockResolvedValue(paciente) },
    doacao: {
      create: vi.fn().mockResolvedValue({
        id: 'doacao-1',
        dataColeta: new Date(`${hoje}T00:00:00Z`),
        pesoAferido: { toNumber: () => 70 },
        registradaEm: new Date(`${hoje}T12:00:00Z`),
      }),
    },
    necessidadeEstoque: { update: vi.fn() },
  };
  prisma.$transaction.mockImplementation((fn) => fn(prisma));
  const auditoria = { registrarEm: vi.fn().mockResolvedValue(undefined) };
  return {
    paciente,
    prisma,
    auditoria,
    service: new DoacoesService(
      prisma as unknown as PrismaService,
      auditoria as unknown as AuditoriaService,
    ),
  };
}
const historico = (datas: string[]) =>
  datas.map((data) => ({ dataColeta: new Date(`${data}T00:00:00Z`) }));

describe('Doação vinculada: elegibilidade, cronologia e persistência', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${hoje}T12:00:00Z`));
  });
  afterEach(() => vi.useRealTimers());

  it('bloqueia o doador antes de ler o histórico e grava tipagem do cadastro e auditoria na mesma transação', async () => {
    const { service, prisma, auditoria } = montar();
    const r = await service.registrarVinculada(
      'hospital-sessao',
      'rep-sessao',
      dto,
    );
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.paciente.findUnique.mock.invocationCallOrder[0],
    );
    expect(prisma.doacao.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          hospitalId: 'hospital-sessao',
          registradoPorId: 'rep-sessao',
          pacienteId,
          tipoSanguineoId: 7,
          dataColeta: new Date(`${hoje}T00:00:00Z`),
          pesoAferido: 70,
          doouAntesDos60Confirmado: null,
        },
      }),
    );
    expect(auditoria.registrarEm).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        usuarioId: 'rep-sessao',
        acao: 'REGISTRAR_DOACAO_VINCULADA',
        entidadeId: 'doacao-1',
      }),
    );
    expect(r.doacao).toMatchObject({
      avulsa: false,
      tipo: 'O-',
      pesoAferido: 70,
      doador: { id: pacienteId },
    });
    expect(prisma.necessidadeEstoque.update).not.toHaveBeenCalled();
  });

  it.each(['PRE_CADASTRADO', 'REPROVADO', 'EXAME_ENVIADO'])(
    'recusa cadastro %s sem converter em avulsa',
    async (situacao) => {
      const { service, prisma, paciente } = montar();
      paciente.situacao = situacao;
      await expect(
        service.registrarVinculada('h', 'r', dto),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.doacao.create).not.toHaveBeenCalled();
    },
  );

  it('recusa conta inativa e doador inexistente', async () => {
    const { service, prisma, paciente } = montar();
    paciente.usuario.status = 'INATIVO';
    await expect(service.registrarVinculada('h', 'r', dto)).rejects.toThrow(
      /ativo, aprovado/,
    );
    prisma.paciente.findUnique.mockResolvedValueOnce(null);
    await expect(service.registrarVinculada('h', 'r', dto)).rejects.toThrow(
      /ativo, aprovado/,
    );
    expect(prisma.doacao.create).not.toHaveBeenCalled();
  });

  it('usa peso aferido, não o peso antigo do perfil', async () => {
    const { service, prisma } = montar();
    await expect(
      service.registrarVinculada('h', 'r', { ...dto, pesoAferido: 49.9 }),
    ).rejects.toThrow(/peso mínimo/);
    expect(prisma.doacao.create).not.toHaveBeenCalled();
  });

  it('requer autorização formal para 16–17 anos e registra a confirmação', async () => {
    const { service, prisma, paciente, auditoria } = montar();
    paciente.dataNascimento = new Date('2009-10-20T00:00:00Z');
    await expect(service.registrarVinculada('h', 'r', dto)).rejects.toThrow(
      /autorização formal/,
    );
    expect(prisma.doacao.create).not.toHaveBeenCalled();
    await service.registrarVinculada('h', 'r', {
      ...dto,
      autorizacaoResponsavelConfirmada: true,
    });
    expect(auditoria.registrarEm).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        detalhes: {
          autorizacaoResponsavelConfirmada: true,
          doouAntesDos60Confirmado: false,
        },
      }),
    );
  });

  it('recusa idade fora dos limites, inclusive na data histórica da coleta', async () => {
    const { service, paciente, prisma } = montar();
    paciente.dataNascimento = new Date('2009-10-20T00:00:00Z');
    await expect(
      service.registrarVinculada('h', 'r', {
        ...dto,
        dataColeta: '2024-10-19',
        autorizacaoResponsavelConfirmada: true,
      }),
    ).rejects.toThrow(/16 e 69/);
    paciente.dataNascimento = new Date('1956-10-20T00:00:00Z');
    await expect(service.registrarVinculada('h', 'r', dto)).rejects.toThrow(
      /16 e 69/,
    );
    expect(prisma.doacao.create).not.toHaveBeenCalled();
  });

  it('exige comprovação pré-60 acima de 60 anos e permite confirmação da triagem', async () => {
    const { service, paciente, auditoria, prisma } = montar();
    paciente.dataNascimento = new Date('1963-05-10T00:00:00Z');
    await expect(service.registrarVinculada('h', 'r', dto)).rejects.toThrow(
      /já doou antes/,
    );
    await service.registrarVinculada('h', 'r', {
      ...dto,
      doouAntesDos60Confirmado: true,
    });
    expect(prisma.doacao.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ doouAntesDos60Confirmado: true }),
      }),
    );
    expect(auditoria.registrarEm).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        detalhes: {
          autorizacaoResponsavelConfirmada: false,
          doouAntesDos60Confirmado: true,
        },
      }),
    );
  });

  it('aceita evidência registrada antes dos 60 sem exigir declaração redundante', async () => {
    const { service, paciente } = montar();
    paciente.dataNascimento = new Date('1963-05-10T00:00:00Z');
    paciente.doacoes = historico(['2022-04-10']);
    await expect(
      service.registrarVinculada('h', 'r', dto),
    ).resolves.toMatchObject({ doacao: { avulsa: false } });
  });

  it('reutiliza confirmação de triagem persistida sem inventar uma nova declaração no registro', async () => {
    const { service, paciente, prisma } = montar();
    paciente.dataNascimento = new Date('1963-05-10T00:00:00Z');
    paciente.doacoes = [
      {
        dataColeta: new Date('2024-05-10T00:00:00Z'),
        doouAntesDos60Confirmado: true,
      },
    ];
    await expect(
      service.registrarVinculada('h', 'r', dto),
    ).resolves.toMatchObject({ doacao: { avulsa: false } });
    expect(prisma.doacao.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ doouAntesDos60Confirmado: null }),
      }),
    );
  });

  it.each([
    ['MASCULINO', '2026-09-01', '2026-10-31'],
    ['FEMININO', '2026-08-01', '2026-10-30'],
  ])(
    'informa próxima data pelo intervalo %s',
    async (sexo, anterior, proximaData) => {
      const { service, paciente, prisma } = montar();
      paciente.sexo = sexo;
      paciente.doacoes = historico([anterior]);
      try {
        await service.registrarVinculada('h', 'r', dto);
        throw new Error('Deveria recusar');
      } catch (erro) {
        expect(erro).toBeInstanceOf(UnprocessableEntityException);
        expect(
          (erro as UnprocessableEntityException).getResponse(),
        ).toMatchObject({ motivo: 'INTERVALO', proximaData });
      }
      expect(prisma.doacao.create).not.toHaveBeenCalled();
    },
  );

  it('recusa quinta doação masculina na janela de 365 dias', async () => {
    const { service, paciente, prisma } = montar();
    paciente.doacoes = historico([
      '2025-12-01',
      '2026-02-01',
      '2026-04-05',
      '2026-06-10',
    ]);
    await expect(service.registrarVinculada('h', 'r', dto)).rejects.toThrow(
      /limite é de 4/,
    );
    expect(prisma.doacao.create).not.toHaveBeenCalled();
  });

  it('uma inclusão retroativa respeita o intervalo até a próxima coleta já registrada', async () => {
    const { service, paciente, prisma } = montar();
    paciente.doacoes = historico(['2026-09-01']);
    await expect(
      service.registrarVinculada('h', 'r', {
        ...dto,
        dataColeta: '2026-08-01',
      }),
    ).rejects.toThrow(/doação já registrada em 2026-09-01/);
    expect(prisma.doacao.create).not.toHaveBeenCalled();
  });

  it('uma inclusão retroativa não torna excessiva a frequência em uma janela posterior', async () => {
    const { service, paciente, prisma } = montar();
    paciente.doacoes = historico([
      '2026-01-01',
      '2026-03-05',
      '2026-05-10',
      '2026-07-15',
    ]);
    await expect(
      service.registrarVinculada('h', 'r', {
        ...dto,
        dataColeta: '2025-11-01',
      }),
    ).rejects.toThrow(/ultrapassaria o limite de 4/);
    expect(prisma.doacao.create).not.toHaveBeenCalled();
  });

  it('aceita coleta histórica consistente sem reinterpretar idade pela data atual', async () => {
    const { service, paciente } = montar();
    paciente.dataNascimento = new Date('1956-10-20T00:00:00Z');
    paciente.doacoes = historico(['2026-04-01', '2026-07-01']);
    await expect(
      service.registrarVinculada('h', 'r', {
        ...dto,
        dataColeta: '2026-01-01',
        doouAntesDos60Confirmado: true,
      }),
    ).resolves.toMatchObject({ doacao: { avulsa: false } });
  });

  it('recusa coleta futura antes de abrir a transação', async () => {
    const { service, prisma } = montar();
    await expect(
      service.registrarVinculada('h', 'r', {
        ...dto,
        dataColeta: '2026-10-24',
      }),
    ).rejects.toThrow(/futura/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('propaga falha de auditoria atômica para não confirmar um registro sem trilha', async () => {
    const { service, auditoria } = montar();
    auditoria.registrarEm.mockRejectedValueOnce(
      new Error('auditoria indisponível'),
    );
    await expect(service.registrarVinculada('h', 'r', dto)).rejects.toThrow(
      'auditoria indisponível',
    );
  });
});

describe('Contrato da coleta vinculada', () => {
  const erros = async (dados: unknown) =>
    validate(plainToInstance(DoacaoVinculadaDto, dados), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  it('aceita peso numérico e confirmações booleanas', async () => {
    expect(
      await erros({ ...dto, autorizacaoResponsavelConfirmada: true }),
    ).toHaveLength(0);
  });
  it.each([
    { ...dto, pacienteId: 'invalid' },
    { ...dto, pesoAferido: '70' },
    { ...dto, pesoAferido: 70.123 },
    { ...dto, dataColeta: '2026-02-30' },
    { ...dto, autorizacaoResponsavelConfirmada: 'true' },
    { ...dto, hospitalId: 'outro' },
    { ...dto, tipo: 'AB+' },
    { ...dto, registradoPorId: 'outro' },
  ])(
    'recusa payload inválido ou campos de autoridade do servidor: %j',
    async (dados) => {
      expect((await erros(dados)).length).toBeGreaterThan(0);
    },
  );
});
