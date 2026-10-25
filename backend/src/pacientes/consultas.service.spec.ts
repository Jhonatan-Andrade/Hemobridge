import { BadRequestException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { TERMO_TELESSAUDE } from '../lgpd/termo-telessaude.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConsultasPacienteService } from './consultas.service.js';

const AGORA = new Date('2026-11-01T12:00:00Z');

function consultaDb(inicio: Date, situacao = 'AGENDADA') {
  return {
    id: 'c1',
    situacao,
    canceladaPor: null,
    motivoCancelamento: null,
    motivoReprovacao: null,
    criadoEm: AGORA,
    disponibilidade: { inicio, fim: new Date(inicio.getTime() + 30 * 60_000), linkSala: 'https://meet.exemplo.com/sala' },
    medico: {
      crm: '123',
      ufCrm: 'PR',
      usuario: { nome: 'Dra. Ana' },
      hospital: { nome: 'Hemocentro', cidade: 'Curitiba', estado: 'PR' },
    },
    solicitacaoExame: null,
  };
}

function montar({ situacao = 'PRE_CADASTRADO', agendada = null as object | null, livre = { medicoId: 'm1' } as object | null } = {}) {
  const prisma = {
    paciente: {
      findUnique: vi.fn().mockResolvedValue({ situacao, cidade: 'Curitiba', estado: 'PR' }),
      update: vi.fn().mockResolvedValue({}),
    },
    consulta: {
      findFirst: vi.fn().mockResolvedValue(agendada),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'c1' }),
      update: vi.fn().mockResolvedValue({}),
    },
    disponibilidadeMedico: {
      findFirst: vi.fn().mockResolvedValue(livre),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn(),
  };
  // A transação interativa recebe o próprio mock como cliente.
  prisma.$transaction.mockImplementation((op: unknown) =>
    typeof op === 'function' ? (op as (tx: unknown) => unknown)(prisma) : Promise.all(op as unknown[]),
  );
  return { service: new ConsultasPacienteService(prisma as unknown as PrismaService), prisma };
}

const dto = { disponibilidadeId: 'd1', aceiteTermoTelessaude: true, versaoTermoTelessaude: TERMO_TELESSAUDE.versao };

describe('ConsultasPacienteService', () => {
  beforeEach(() => vi.useFakeTimers({ now: AGORA }));
  afterEach(() => vi.useRealTimers());

  it('mostra o link só a partir de 15 minutos antes do horário (RN18)', async () => {
    const { service, prisma } = montar();
    prisma.consulta.findMany.mockResolvedValue([
      consultaDb(new Date(AGORA.getTime() + 20 * 60_000)),
      consultaDb(new Date(AGORA.getTime() + 10 * 60_000)),
    ]);

    const [cedo, naJanela] = await service.listar('p1');

    expect(cedo.linkSala).toBeNull();
    expect(cedo.linkDisponivelEm).toEqual(new Date(AGORA.getTime() + 5 * 60_000));
    expect(naJanela.linkSala).toBe('https://meet.exemplo.com/sala');
  });

  it('agenda, registra o aceite do termo e muda a situação para Consulta agendada (RN10)', async () => {
    const { service, prisma } = montar();
    prisma.consulta.findFirst.mockResolvedValueOnce(null).mockResolvedValue(consultaDb(new Date('2026-11-10T12:00:00Z')));

    const r = await service.agendar('p1', dto, '10.0.0.1');

    expect(prisma.consulta.create.mock.calls[0][0].data).toMatchObject({
      pacienteId: 'p1',
      medicoId: 'm1',
      disponibilidadeId: 'd1',
      versaoTermoTelessaude: TERMO_TELESSAUDE.versao,
      ipOrigem: '10.0.0.1',
    });
    expect(prisma.paciente.update.mock.calls[0][0].data).toEqual({ situacao: 'CONSULTA_AGENDADA' });
    expect(r.consulta.id).toBe('c1');
  });

  it('recusa novo agendamento com consulta futura já marcada (FE03)', async () => {
    const { service, prisma } = montar({ agendada: { disponibilidade: { inicio: new Date('2026-11-10T12:00:00Z') } } });

    await expect(service.agendar('p1', dto)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.consulta.create).not.toHaveBeenCalled();
  });

  it('recusa agendamento de doador aprovado e com exames em andamento', async () => {
    await expect(montar({ situacao: 'APROVADO' }).service.agendar('p1', dto)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    await expect(montar({ situacao: 'EM_ANALISE' }).service.agendar('p1', dto)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('recusa termo de telessaúde em versão antiga', async () => {
    const { service } = montar();

    await expect(service.agendar('p1', { ...dto, versaoTermoTelessaude: '0.9' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('informa horário ocupado quando ele some ou é reservado ao mesmo tempo (FE02)', async () => {
    await expect(montar({ livre: null }).service.agendar('p1', dto)).rejects.toThrow('não está mais disponível');

    const { service, prisma } = montar();
    prisma.consulta.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' }),
    );
    await expect(service.agendar('p1', dto)).rejects.toThrow('acabou de ser reservado');
  });

  it('cancela com 24 horas de antecedência e devolve o paciente a Pré-cadastrado', async () => {
    const { service, prisma } = montar({
      agendada: { situacao: 'AGENDADA', disponibilidadeId: 'd1', disponibilidade: { inicio: new Date('2026-11-03T12:00:00Z') } },
    });
    prisma.consulta.findFirst
      .mockResolvedValueOnce({ situacao: 'AGENDADA', disponibilidadeId: 'd1', disponibilidade: { inicio: new Date('2026-11-03T12:00:00Z') } })
      .mockResolvedValue(consultaDb(new Date('2026-11-03T12:00:00Z'), 'CANCELADA'));

    await service.cancelar('p1', 'c1');

    expect(prisma.consulta.update.mock.calls[0][0].data).toMatchObject({ situacao: 'CANCELADA', canceladaPor: 'PACIENTE' });
    expect(prisma.paciente.update.mock.calls[0][0].data).toEqual({ situacao: 'PRE_CADASTRADO' });
  });

  it('não cancela nem reagenda a menos de 24 horas do horário (UC10 FE01)', async () => {
    const consulta = { situacao: 'AGENDADA', disponibilidadeId: 'd1', disponibilidade: { inicio: new Date('2026-11-02T11:00:00Z') } };

    await expect(montar({ agendada: consulta }).service.cancelar('p1', 'c1')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    await expect(montar({ agendada: consulta }).service.reagendar('p1', 'c1', 'd2')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('reagenda criando nova consulta ligada à original e mantendo o consentimento', async () => {
    const original = {
      situacao: 'AGENDADA',
      disponibilidadeId: 'd1',
      versaoTermoTelessaude: '1.0',
      termoTelessaudeAceitoEm: AGORA,
      ipOrigem: '10.0.0.1',
      disponibilidade: { inicio: new Date('2026-11-05T12:00:00Z') },
    };
    const { service, prisma } = montar();
    prisma.consulta.findFirst.mockResolvedValueOnce(original).mockResolvedValue(consultaDb(new Date('2026-11-06T12:00:00Z')));
    prisma.consulta.create.mockResolvedValue({ id: 'c2' });

    await service.reagendar('p1', 'c1', 'd2');

    expect(prisma.consulta.update.mock.calls[0][0]).toMatchObject({ where: { id: 'c1' }, data: { situacao: 'CANCELADA' } });
    expect(prisma.consulta.create.mock.calls[0][0].data).toMatchObject({
      disponibilidadeId: 'd2',
      consultaOrigemId: 'c1',
      termoTelessaudeAceitoEm: AGORA,
    });
  });

  it('agrupa horários por médico priorizando a cidade e o estado do paciente (UC09 passo 5)', async () => {
    const { service, prisma } = montar();
    const horario = (id: string, medicoId: string, cidade: string, estado: string) => ({
      id,
      inicio: AGORA,
      fim: AGORA,
      medico: { usuarioId: medicoId, crm: '1', ufCrm: estado, usuario: { nome: medicoId }, hospital: { nome: 'H', cidade, estado } },
    });
    prisma.disponibilidadeMedico.findMany.mockResolvedValue([
      horario('d1', 'sp', 'São Paulo', 'SP'),
      horario('d2', 'londrina', 'Londrina', 'PR'),
      horario('d3', 'curitiba', 'curitiba', 'PR'),
      horario('d4', 'sp', 'São Paulo', 'SP'),
    ]);

    const r = await service.horariosDisponiveis('p1', {});

    expect(r.medicos.map((m) => m.id)).toEqual(['curitiba', 'londrina', 'sp']);
    expect(r.medicos[2].horarios).toHaveLength(2);
    expect(prisma.disponibilidadeMedico.findMany.mock.calls[0][0].where.medico.hospitalId).toBeUndefined();
  });

  it('filtra os horários pelos médicos de um banco de sangue', async () => {
    const { service, prisma } = montar();

    await service.horariosDisponiveis('p1', { hospitalId: 'h1' });

    expect(prisma.disponibilidadeMedico.findMany.mock.calls[0][0].where.medico).toMatchObject({ hospitalId: 'h1', hospital: { ativo: true } });
  });
});
