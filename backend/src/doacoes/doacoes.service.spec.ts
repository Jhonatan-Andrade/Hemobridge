import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DoacoesService } from './doacoes.service.js';

const AGORA = new Date('2026-10-25T15:00:00-03:00');

const medico: MembroDaEquipe = {
  id: 'med1',
  nome: 'Dr. Bruno',
  email: 'bruno@a.com',
  perfil: 'EQUIPE',
  papel: 'MEDICO',
  hemocentro: { id: 'hA', nome: 'Hemocentro A' },
  senhaProvisoria: false,
};

const doacaoDb = (alteracao: Record<string, unknown> = {}) => ({
  id: 'd1',
  compareceu: true,
  doou: true,
  motivoNaoDoacao: null,
  observacoes: null,
  registradoEm: AGORA,
  tipoSanguineo: { sigla: 'O+' },
  ...alteracao,
});

function montar() {
  const prisma = {
    agendamento: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'ag1',
        status: 'AGENDADO',
        pacienteId: 'p1',
        horario: { data: new Date('2026-10-25T00:00:00Z') },
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    tipoSanguineo: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 7 }) },
    doacao: {
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve(doacaoDb({ compareceu: data.compareceu, doou: data.doou, motivoNaoDoacao: data.motivoNaoDoacao })),
      ),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    horario: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((arg: unknown) =>
    Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prisma),
  );
  const auditoria = { registrar: vi.fn().mockResolvedValue(undefined) };
  const service = new DoacoesService(prisma as unknown as PrismaService, auditoria as unknown as AuditoriaService);
  return { service, prisma, auditoria };
}

const dto = (alteracao: Record<string, unknown> = {}) => ({
  agendamentoId: 'ag1',
  compareceu: true,
  doou: true,
  tipoSanguineo: 'O+',
  ...alteracao,
});

describe('DoacoesService.registrar (RF11)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it('registra a doação vinculada ao hemocentro do médico, conclui o agendamento e audita', async () => {
    const { service, prisma, auditoria } = montar();

    const r = await service.registrar(medico, dto({ observacoes: 'Tudo certo' }));

    expect(prisma.agendamento.findFirst.mock.calls[0][0].where).toEqual({
      id: 'ag1',
      horario: { hemocentroId: 'hA' },
    });
    expect(prisma.agendamento.updateMany).toHaveBeenCalledWith({
      where: { id: 'ag1', status: 'AGENDADO' },
      data: { status: 'CONCLUIDO' },
    });
    expect(prisma.doacao.create.mock.calls[0][0].data).toEqual({
      agendamentoId: 'ag1',
      pacienteId: 'p1',
      hemocentroId: 'hA',
      medicoId: 'med1',
      compareceu: true,
      doou: true,
      tipoSanguineoId: 7,
      motivoNaoDoacao: null,
      observacoes: 'Tudo certo',
    });
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'REGISTRAR_DOACAO', entidade: 'doacao', entidadeId: 'd1', hemocentroId: 'hA' }),
      prisma,
    );
    expect(r).toMatchObject({ mensagem: 'Doação registrada.', doacao: { id: 'd1', tipoSanguineo: 'O+' } });
  });

  it('registra ausência como AUSENTE, sem doação nem tipo', async () => {
    const { service, prisma } = montar();

    const r = await service.registrar(medico, dto({ compareceu: false, doou: false, tipoSanguineo: undefined }));

    expect(prisma.agendamento.updateMany.mock.calls[0][0].data).toEqual({ status: 'AUSENTE' });
    expect(prisma.doacao.create.mock.calls[0][0].data).toMatchObject({ compareceu: false, doou: false, tipoSanguineoId: null });
    expect(r.mensagem).toBe('Ausência registrada.');
  });

  it.each([
    ['ausente que doou', { compareceu: false, doou: true }],
    ['ausente com tipo sanguíneo', { compareceu: false, doou: false }],
    ['compareceu e não doou sem motivo', { doou: false, motivoNaoDoacao: undefined }],
  ])('recusa registro inconsistente: %s', async (_, alteracao) => {
    const { service, prisma } = montar();
    await expect(service.registrar(medico, dto(alteracao))).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.doacao.create).not.toHaveBeenCalled();
  });

  it('trata agendamento de outro hemocentro como inexistente', async () => {
    const { service, prisma } = montar();
    prisma.agendamento.findFirst.mockResolvedValue(null);
    await expect(service.registrar(medico, dto())).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([['CONCLUIDO'], ['AUSENTE'], ['CANCELADO']])('não registra agendamento %s', async (status) => {
    const { service, prisma } = montar();
    prisma.agendamento.findFirst.mockResolvedValue({
      id: 'ag1', status, pacienteId: 'p1', horario: { data: new Date('2026-10-25T00:00:00Z') },
    });
    await expect(service.registrar(medico, dto())).rejects.toBeInstanceOf(ConflictException);
  });

  it('não registra antes do dia do agendamento', async () => {
    const { service, prisma } = montar();
    prisma.agendamento.findFirst.mockResolvedValue({
      id: 'ag1', status: 'AGENDADO', pacienteId: 'p1', horario: { data: new Date('2026-10-26T00:00:00Z') },
    });
    await expect(service.registrar(medico, dto())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa o segundo registro simultâneo do mesmo agendamento', async () => {
    const { service, prisma } = montar();
    prisma.agendamento.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.registrar(medico, dto())).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.doacao.create).not.toHaveBeenCalled();
  });
});

describe('DoacoesService.agenda (RF10)', () => {
  it('mostra a última doação de outro hemocentro e audita esse acesso', async () => {
    const { service, prisma, auditoria } = montar();
    prisma.horario.findMany.mockResolvedValue([
      {
        id: 'hor1',
        data: new Date('2026-10-25T00:00:00Z'),
        horaInicio: new Date('1970-01-01T13:00:00Z'),
        horaFim: new Date('1970-01-01T17:00:00Z'),
        vagasTotal: 6,
        ativo: true,
        agendamentos: [
          {
            id: 'ag1',
            status: 'AGENDADO',
            paciente: { usuarioId: 'p1', dataNascimento: null, situacao: 'ATIVA', tipoSanguineo: { sigla: 'O+' }, usuario: { nome: 'Paulo' } },
            doacao: null,
          },
        ],
      },
    ]);
    prisma.doacao.findMany.mockResolvedValue([
      { pacienteId: 'p1', registradoEm: new Date('2026-09-25T12:00:00Z'), hemocentro: { id: 'hB', nome: 'Hemocentro B' } },
    ]);

    const r = await service.agenda(medico, '2026-10-25');

    expect(prisma.horario.findMany.mock.calls[0][0].where).toEqual({
      hemocentroId: 'hA',
      data: new Date('2026-10-25T00:00:00Z'),
    });
    expect(r.horarios[0].agendamentos[0].paciente.ultimaDoacao).toEqual({
      registradoEm: new Date('2026-09-25T12:00:00Z'),
      hemocentro: { id: 'hB', nome: 'Hemocentro B' },
    });
    expect(auditoria.registrar).toHaveBeenCalledWith([
      expect.objectContaining({ acao: 'VER_ULTIMA_DOACAO_COMPARTILHADA', entidadeId: 'p1', hemocentroId: 'hA' }),
    ]);
  });
});

describe('DoacoesService.atendimentos', () => {
  const admin: MembroDaEquipe = { ...medico, id: 'adm1', papel: 'ADMIN_HEMOCENTRO' };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it('lista só o hemocentro do membro, nos últimos 90 dias por padrão, com o resumo', async () => {
    const { service, prisma } = montar();
    prisma.doacao.findMany.mockResolvedValue([
      {
        ...doacaoDb(),
        paciente: { usuarioId: 'p1', usuario: { nome: 'Ana' } },
        medico: { usuario: { nome: 'Dr. Bruno' } },
        agendamento: {
          horario: {
            data: new Date('2026-10-24T00:00:00Z'),
            horaInicio: new Date('1970-01-01T08:00:00Z'),
            horaFim: new Date('1970-01-01T09:00:00Z'),
          },
        },
      },
    ]);
    prisma.doacao.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3).mockResolvedValueOnce(1);

    const r = await service.atendimentos(admin, { pagina: 1, tamanhoPagina: 20 });

    const where = prisma.doacao.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      hemocentroId: 'hA',
      agendamento: {
        horario: { data: { gte: new Date('2026-07-27T00:00:00Z'), lte: new Date('2026-10-25T00:00:00Z') } },
      },
    });
    expect(prisma.doacao.count.mock.calls.map((c) => c[0].where)).toEqual([
      where,
      { ...where, doou: true },
      { ...where, compareceu: false },
    ]);
    expect(r).toMatchObject({
      de: '2026-07-27',
      ate: '2026-10-25',
      resumo: { total: 5, doaram: 3, naoDoaram: 1, ausentes: 1 },
      total: 5,
      itens: [
        {
          id: 'd1',
          data: '2026-10-24',
          horaInicio: '08:00',
          horaFim: '09:00',
          tipoSanguineo: 'O+',
          paciente: { id: 'p1', nome: 'Ana' },
          medico: 'Dr. Bruno',
        },
      ],
    });
  });

  it('recusa período invertido', async () => {
    const { service } = montar();
    await expect(
      service.atendimentos(medico, { de: '2026-10-20', ate: '2026-10-01', pagina: 1, tamanhoPagina: 20 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
