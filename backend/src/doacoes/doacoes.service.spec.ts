import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DoacoesService } from './doacoes.service.js';
import type { RegistrarDoacaoDto } from './dto/doacao.dto.js';

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
const admin: MembroDaEquipe = { ...medico, id: 'adm1', papel: 'ADMIN_HEMOCENTRO' };

const SEM_CLINICA = {
  pesoKg: null,
  alturaCm: null,
  pressaoSistolica: null,
  pressaoDiastolica: null,
  pulso: null,
  temperatura: null,
  hemoglobina: null,
  hematocrito: null,
  volumeMl: null,
  reacoes: null,
  aptidao: null,
  aptoAPartirDe: null,
};

const doacaoDb = (alteracao: Record<string, unknown> = {}) => ({
  id: 'd1',
  compareceu: true,
  doou: true,
  motivoNaoDoacao: null,
  observacoes: null,
  registradoEm: AGORA,
  tipoSanguineo: { sigla: 'O+' },
  ...SEM_CLINICA,
  ...alteracao,
});

const examesNormais = {
  pesquisaAnticorpos: 'NEGATIVA',
  hiv: 'NAO_REAGENTE',
  hepatiteB: 'NAO_REAGENTE',
  hepatiteC: 'NAO_REAGENTE',
  sifilis: 'NAO_REAGENTE',
  chagas: 'NAO_REAGENTE',
  htlv: 'NAO_REAGENTE',
  malaria: null,
} as const;

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
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    exameDoacao: { create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...examesNormais, ...data })) },
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

const triagem = {
  transfusaoAnterior: false,
  tatuagemOuPiercingRecente: false,
  usoDeDrogas: false,
  comportamentoSexualDeRisco: false,
  medicamentos: 'Losartana 50 mg',
};
const afericoes = { pesoKg: 72.5, pressaoSistolica: 120, pressaoDiastolica: 80, pulso: 72, temperatura: 36.4, hemoglobina: 14.1 };

/** Doação completa e válida; `alteracao` com undefined remove o campo. */
const dto = (alteracao: Partial<Record<keyof RegistrarDoacaoDto, unknown>> = {}) =>
  ({
    agendamentoId: 'ag1',
    compareceu: true,
    doou: true,
    tipoSanguineo: 'O+',
    triagem,
    afericoes,
    coleta: { volumeMl: 450, numeroBolsa: 'A-0001' },
    aptidao: 'APTO',
    ...alteracao,
  }) as RegistrarDoacaoDto;

const ausente = (alteracao: Partial<Record<keyof RegistrarDoacaoDto, unknown>> = {}) =>
  dto({
    compareceu: false,
    doou: false,
    tipoSanguineo: undefined,
    triagem: undefined,
    afericoes: undefined,
    coleta: undefined,
    aptidao: undefined,
    ...alteracao,
  });
const naoDoou = (alteracao: Partial<Record<keyof RegistrarDoacaoDto, unknown>> = {}) =>
  dto({ doou: false, coleta: undefined, aptidao: 'INAPTO_TEMPORARIO', aptoAPartirDe: '2026-12-01', motivoNaoDoacao: 'Hemoglobina baixa', ...alteracao });

describe('DoacoesService.registrar (RF11)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it('registra triagem, aferições, coleta e aptidão no hemocentro do médico, conclui o agendamento e audita', async () => {
    const { service, prisma, auditoria } = montar();

    const r = await service.registrar(medico, dto({ observacoes: 'Tudo certo' }));

    expect(prisma.agendamento.findFirst.mock.calls[0][0].where).toEqual({ id: 'ag1', horario: { hemocentroId: 'hA' } });
    expect(prisma.agendamento.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.agendamento.updateMany).toHaveBeenCalledWith({ where: { id: 'ag1', status: 'AGENDADO' }, data: { status: 'CONCLUIDO' } });
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
      pesoKg: 72.5,
      alturaCm: null,
      pressaoSistolica: 120,
      pressaoDiastolica: 80,
      pulso: 72,
      temperatura: 36.4,
      hemoglobina: 14.1,
      hematocrito: null,
      volumeMl: 450,
      numeroBolsa: 'A-0001',
      reacoes: null,
      aptidao: 'APTO',
      aptoAPartirDe: null,
      triagem: {
        create: expect.objectContaining({ transfusaoAnterior: false, medicamentos: 'Losartana 50 mg', doencas: null }),
      },
    });
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'REGISTRAR_DOACAO', entidade: 'doacao', entidadeId: 'd1', hemocentroId: 'hA' }),
      prisma,
    );
    expect(r).toMatchObject({ mensagem: 'Doação registrada.', doacao: { id: 'd1', tipoSanguineo: 'O+' } });
  });

  it('registra ausência como AUSENTE, sem triagem, aferições nem aptidão', async () => {
    const { service, prisma } = montar();

    const r = await service.registrar(medico, ausente());

    expect(prisma.agendamento.updateMany.mock.calls[0][0].data).toEqual({ status: 'AUSENTE' });
    expect(prisma.doacao.create.mock.calls[0][0].data).toMatchObject({
      compareceu: false,
      doou: false,
      tipoSanguineoId: null,
      aptidao: null,
      triagem: undefined,
    });
    expect(r.mensagem).toBe('Ausência registrada.');
  });

  it('inapto temporário cancela os agendamentos futuros do paciente antes da data de volta', async () => {
    const { service, prisma } = montar();
    prisma.agendamento.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 2 });

    const r = await service.registrar(medico, naoDoou());

    expect(prisma.agendamento.updateMany.mock.calls[1][0]).toEqual({
      where: {
        pacienteId: 'p1',
        status: 'AGENDADO',
        id: { not: 'ag1' },
        horario: { data: { gte: new Date('2026-10-25T00:00:00Z'), lt: new Date('2026-12-01T00:00:00Z') } },
      },
      data: { status: 'CANCELADO', canceladoEm: AGORA },
    });
    expect(prisma.doacao.create.mock.calls[0][0].data).toMatchObject({
      aptidao: 'INAPTO_TEMPORARIO',
      aptoAPartirDe: new Date('2026-12-01T00:00:00Z'),
      volumeMl: null,
    });
    expect(r.mensagem).toBe('Doação registrada. 2 agendamento(s) futuro(s) do paciente foram cancelados pela inaptidão.');
  });

  it('inapto definitivo cancela todos os agendamentos futuros', async () => {
    const { service, prisma } = montar();
    await service.registrar(medico, naoDoou({ aptidao: 'INAPTO_DEFINITIVO', aptoAPartirDe: undefined }));
    expect(prisma.agendamento.updateMany.mock.calls[1][0].where.horario).toEqual({ data: { gte: new Date('2026-10-25T00:00:00Z') } });
  });

  it.each([
    ['ausente que doou', ausente({ doou: true })],
    ['ausente com tipo sanguíneo', ausente({ tipoSanguineo: 'O+' })],
    ['ausente com triagem', ausente({ triagem })],
    ['compareceu sem triagem', dto({ triagem: undefined })],
    ['compareceu sem aptidão', dto({ aptidao: undefined })],
    ['doou sem estar apto', dto({ aptidao: 'INAPTO_TEMPORARIO', aptoAPartirDe: '2026-12-01' })],
    ['doou sem aferições completas', dto({ afericoes: { ...afericoes, pulso: undefined } })],
    ['doou sem hemoglobina nem hematócrito', dto({ afericoes: { ...afericoes, hemoglobina: undefined } })],
    ['doou sem coleta', dto({ coleta: undefined })],
    ['não doou com coleta', naoDoou({ coleta: { volumeMl: 450, numeroBolsa: 'A-1' } })],
    ['não doou sem motivo', naoDoou({ motivoNaoDoacao: undefined })],
    ['inapto temporário sem data de volta', naoDoou({ aptoAPartirDe: undefined })],
    ['data de volta para quem não é inapto temporário', naoDoou({ aptidao: 'APTO' })],
    ['data de volta no dia do atendimento', naoDoou({ aptoAPartirDe: '2026-10-25' })],
    ['pressão sistólica menor que a diastólica', dto({ afericoes: { ...afericoes, pressaoSistolica: 70 } })],
  ] as [string, RegistrarDoacaoDto][])('recusa registro inconsistente: %s', async (_, corpo) => {
    const { service, prisma } = montar();
    await expect(service.registrar(medico, corpo)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.doacao.create).not.toHaveBeenCalled();
  });

  it('número de bolsa repetido no hemocentro vira conflito', async () => {
    const { service, prisma } = montar();
    prisma.doacao.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' }));
    await expect(service.registrar(medico, dto())).rejects.toThrow(/bolsa com este número/);
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

describe('DoacoesService: triagem e exames da amostra', () => {
  const detalheDb = (exames: unknown = null) => ({
    ...doacaoDb({ pesoKg: new Prisma.Decimal('72.50'), hemoglobina: new Prisma.Decimal('14.1'), aptidao: 'APTO' }),
    numeroBolsa: 'A-0001',
    paciente: { usuarioId: 'p1', usuario: { nome: 'Ana' } },
    medico: { usuario: { nome: 'Dr. Bruno' } },
    agendamento: {
      horario: { data: new Date('2026-10-24T00:00:00Z'), horaInicio: new Date('1970-01-01T08:00:00Z'), horaFim: new Date('1970-01-01T09:00:00Z') },
    },
    triagem: { ...triagem, doencas: null },
    exames,
  });

  it('detalhe: só do próprio hemocentro, com triagem, aferições em número e leitura auditada', async () => {
    const { service, prisma, auditoria } = montar();
    prisma.doacao.findFirst.mockResolvedValue(detalheDb());

    const r = await service.detalhe(medico, 'd1');

    expect(prisma.doacao.findFirst.mock.calls[0][0].where).toEqual({ id: 'd1', hemocentroId: 'hA' });
    expect(r).toMatchObject({
      numeroBolsa: 'A-0001',
      afericoes: { pesoKg: 72.5, hemoglobina: 14.1 },
      triagem: { medicamentos: 'Losartana 50 mg' },
      situacaoExames: 'PENDENTE',
      exames: null,
    });
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'VER_DADOS_CLINICOS', entidade: 'doacao', entidadeId: 'd1' }),
    );
  });

  it('detalhe de doação de outro hemocentro é inexistente', async () => {
    const { service, prisma } = montar();
    prisma.doacao.findFirst.mockResolvedValue(null);
    await expect(service.detalhe(medico, 'd1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lança os exames uma vez, audita e indica resultado alterado', async () => {
    const { service, prisma, auditoria } = montar();
    prisma.doacao.findFirst.mockResolvedValue({ id: 'd1', doou: true, exames: null });

    const r = await service.registrarExames(medico, 'd1', { ...examesNormais, malaria: undefined, sifilis: 'REAGENTE' });

    expect(prisma.exameDoacao.create.mock.calls[0][0].data).toMatchObject({ doacaoId: 'd1', sifilis: 'REAGENTE', registradoPorId: 'med1', malaria: null });
    expect(auditoria.registrar).toHaveBeenCalledWith(expect.objectContaining({ acao: 'REGISTRAR_EXAMES', entidadeId: 'd1' }), prisma);
    expect(r).toMatchObject({ alterados: true, mensagem: expect.stringMatching(/forma reservada/) });
  });

  it.each([
    ['sem coleta', { id: 'd1', doou: false, exames: null }, BadRequestException],
    ['já lançados', { id: 'd1', doou: true, exames: { doacaoId: 'd1' } }, ConflictException],
    ['de outro hemocentro', null, NotFoundException],
  ])('recusa exames %s', async (_, doacao, erro) => {
    const { service, prisma } = montar();
    prisma.doacao.findFirst.mockResolvedValue(doacao);
    await expect(service.registrarExames(medico, 'd1', { ...examesNormais, malaria: undefined })).rejects.toBeInstanceOf(erro);
    expect(prisma.exameDoacao.create).not.toHaveBeenCalled();
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
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  const atendimentoDb = (exames: unknown = null) => ({
    ...doacaoDb({ aptidao: 'APTO' }),
    paciente: { usuarioId: 'p1', usuario: { nome: 'Ana' } },
    medico: { usuario: { nome: 'Dr. Bruno' } },
    agendamento: {
      horario: {
        data: new Date('2026-10-24T00:00:00Z'),
        horaInicio: new Date('1970-01-01T08:00:00Z'),
        horaFim: new Date('1970-01-01T09:00:00Z'),
      },
    },
    exames,
  });

  it('lista só o hemocentro do membro, nos últimos 90 dias por padrão, com o resumo', async () => {
    const { service, prisma } = montar();
    prisma.doacao.findMany.mockResolvedValue([atendimentoDb()]);
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
          aptidao: 'APTO',
          paciente: { id: 'p1', nome: 'Ana' },
          medico: 'Dr. Bruno',
        },
      ],
    });
  });

  it('a situação dos exames aparece para o médico e não para o Admin do hemocentro', async () => {
    const { service, prisma } = montar();
    prisma.doacao.findMany.mockResolvedValue([atendimentoDb({ ...examesNormais, hiv: 'INCONCLUSIVO' })]);

    const paraMedico = await service.atendimentos(medico, { pagina: 1, tamanhoPagina: 20 });
    const paraAdmin = await service.atendimentos(admin, { pagina: 1, tamanhoPagina: 20 });

    expect(paraMedico.itens[0]).toMatchObject({ situacaoExames: 'ALTERADO' });
    expect(paraAdmin.itens[0]).not.toHaveProperty('situacaoExames');
  });

  it('recusa período invertido', async () => {
    const { service } = montar();
    await expect(
      service.atendimentos(medico, { de: '2026-10-20', ate: '2026-10-01', pagina: 1, tamanhoPagina: 20 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
