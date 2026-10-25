import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AgendamentosService, MENSAGEM_ESGOTADO } from './agendamentos.service.js';

const AGORA = new Date('2026-10-25T12:00:00-03:00');
const hemocentro = { id: 'h1', nome: 'Hemocentro A', endereco: 'Rua 1', cidade: 'Curitiba', estado: 'PR' };

// Horário de 26/10/2026, 13h–17h (Brasília), no formato que o Prisma devolve.
const horarioDb = (alteracao: Record<string, unknown> = {}) => ({
  id: 'hor1',
  data: new Date('2026-10-26T00:00:00Z'),
  horaInicio: new Date('1970-01-01T13:00:00Z'),
  horaFim: new Date('1970-01-01T17:00:00Z'),
  vagasTotal: 6,
  ativo: true,
  hemocentro: { ...hemocentro, ativo: true },
  ...alteracao,
});

const agendamentoDb = (alteracao: Record<string, unknown> = {}) => ({
  id: 'ag1',
  status: 'AGENDADO',
  criadoEm: AGORA,
  canceladoEm: null,
  horario: horarioDb(),
  ...alteracao,
});

/** Prisma falso; o callback de $transaction recebe o próprio mock como cliente. */
function montar({ ocupadas = 0, jaAgendado = 0, horario = horarioDb() as unknown } = {}) {
  const ordem: string[] = [];
  const prisma = {
    $queryRaw: vi.fn().mockImplementation(() => {
      ordem.push('lock');
      return Promise.resolve(horario ? [{ id: 'hor1' }] : []);
    }),
    horario: { findUnique: vi.fn().mockResolvedValue(horario) },
    agendamento: {
      count: vi.fn().mockImplementation(({ where }) => {
        ordem.push('count');
        return Promise.resolve(where.pacienteId ? jaAgendado : ocupadas);
      }),
      create: vi.fn().mockImplementation(() => Promise.resolve(agendamentoDb({ id: 'novo' }))),
      findFirst: vi.fn().mockResolvedValue(agendamentoDb()),
      findUniqueOrThrow: vi.fn().mockResolvedValue(agendamentoDb({ status: 'CANCELADO', canceladoEm: AGORA })),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  return { service: new AgendamentosService(prisma as unknown as PrismaService), prisma, ordem };
}

describe('AgendamentosService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  describe('agendar (RF06 / RF09)', () => {
    it('confirma quando há vaga, bloqueando o horário antes de contar as vagas', async () => {
      const { service, prisma, ordem } = montar({ ocupadas: 5 });

      const r = await service.agendar('p1', 'hor1');

      expect(r.mensagem).toBe('Agendamento confirmado.');
      expect(r.agendamento).toMatchObject({
        id: 'novo',
        status: 'AGENDADO',
        horario: { data: '2026-10-26', horaInicio: '13:00', inicio: '2026-10-26T16:00:00.000Z' },
        hemocentro: { nome: 'Hemocentro A' },
        podeCancelar: true,
      });
      expect(ordem[0]).toBe('lock');
      expect(String(prisma.$queryRaw.mock.calls[0][0].join('?'))).toMatch(/FOR UPDATE/);
      expect(prisma.agendamento.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { pacienteId: 'p1', horarioId: 'hor1' } }),
      );
    });

    it('recusa o horário lotado sem criar agendamento (sem overbooking)', async () => {
      const { service, prisma } = montar({ ocupadas: 6 });

      await expect(service.agendar('p1', 'hor1')).rejects.toThrow(new ConflictException(MENSAGEM_ESGOTADO));
      expect(prisma.agendamento.create).not.toHaveBeenCalled();
    });

    it.each([
      ['horário que já começou', { horaInicio: new Date('1970-01-01T11:00:00Z'), data: new Date('2026-10-25T00:00:00Z') }, BadRequestException],
      ['horário inativo', { ativo: false }, ConflictException],
      ['hemocentro desativado', { hemocentro: { ...hemocentro, ativo: false } }, NotFoundException],
    ])('recusa %s', async (_, alteracao, erro) => {
      const { service, prisma } = montar({ horario: horarioDb(alteracao) });
      await expect(service.agendar('p1', 'hor1')).rejects.toBeInstanceOf(erro);
      expect(prisma.agendamento.create).not.toHaveBeenCalled();
    });

    it('recusa horário inexistente', async () => {
      const { service } = montar({ horario: null });
      await expect(service.agendar('p1', 'hor1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('recusa dois agendamentos ativos do mesmo paciente no mesmo horário', async () => {
      const { service, prisma } = montar({ jaAgendado: 1 });
      await expect(service.agendar('p1', 'hor1')).rejects.toThrow(/já tem um agendamento/);
      expect(prisma.agendamento.create).not.toHaveBeenCalled();
    });

    it('converte a violação do índice único parcial (corrida) em conflito', async () => {
      const { service, prisma } = montar();
      prisma.agendamento.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' }),
      );
      await expect(service.agendar('p1', 'hor1')).rejects.toThrow(/já tem um agendamento/);
    });
  });

  describe('cancelar (RF07)', () => {
    it('cancela e libera a vaga (o status deixa de contar como AGENDADO)', async () => {
      const { service, prisma } = montar();

      const r = await service.cancelar('p1', 'ag1');

      expect(prisma.agendamento.findFirst.mock.calls[0][0].where).toEqual({ id: 'ag1', pacienteId: 'p1' });
      expect(prisma.agendamento.updateMany).toHaveBeenCalledWith({
        where: { id: 'ag1', status: 'AGENDADO' },
        data: { status: 'CANCELADO', canceladoEm: AGORA },
      });
      expect(r.mensagem).toMatch(/vaga foi liberada/);
      expect(r.agendamento).toMatchObject({ status: 'CANCELADO', podeCancelar: false });
    });

    it('trata agendamento de outro paciente como inexistente', async () => {
      const { service, prisma } = montar();
      prisma.agendamento.findFirst.mockResolvedValue(null);
      await expect(service.cancelar('p2', 'ag1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each([
      ['já cancelado', agendamentoDb({ status: 'CANCELADO' })],
      ['de horário que já começou', agendamentoDb({ horario: horarioDb({ data: new Date('2026-10-24T00:00:00Z') }) })],
    ])('não cancela agendamento %s', async (_, agendamento) => {
      const { service, prisma } = montar();
      prisma.agendamento.findFirst.mockResolvedValue(agendamento);
      await expect(service.cancelar('p1', 'ag1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.agendamento.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('reagendar (RF07)', () => {
    it('reserva o novo horário, cancela o antigo e cria o novo agendamento', async () => {
      const { service, prisma } = montar();
      prisma.agendamento.findFirst.mockResolvedValue(agendamentoDb({ horario: horarioDb({ id: 'antigo' }) }));

      const r = await service.reagendar('p1', 'ag1', 'hor1');

      expect(prisma.agendamento.updateMany).toHaveBeenCalledWith({
        where: { id: 'ag1', status: 'AGENDADO' },
        data: { status: 'CANCELADO', canceladoEm: AGORA },
      });
      expect(r.agendamento.id).toBe('novo');
    });

    it('mantém o agendamento antigo quando o novo horário está lotado', async () => {
      const { service, prisma } = montar({ ocupadas: 6 });
      prisma.agendamento.findFirst.mockResolvedValue(agendamentoDb({ horario: horarioDb({ id: 'antigo' }) }));

      await expect(service.reagendar('p1', 'ag1', 'hor1')).rejects.toThrow(MENSAGEM_ESGOTADO);
      expect(prisma.agendamento.updateMany).not.toHaveBeenCalled();
    });

    it('recusa reagendar para o mesmo horário', async () => {
      const { service } = montar();
      await expect(service.reagendar('p1', 'ag1', 'hor1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
