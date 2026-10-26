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
/** Data (YYYY-MM-DD) como o Prisma devolve uma coluna DATE. */
const dia = (data: string) => ({ data: new Date(`${data}T00:00:00Z`) });

type Inaptidao = { doou: false; aptidao: string; aptoAPartirDe: Date | null; agendamento: { horario: { data: Date } } };
type PacienteDb = { sexo: 'MASCULINO' | 'FEMININO' | null; doacoes: string[]; agendamentos: string[]; inaptidoes?: Inaptidao[] };

function montar({
  ocupadas = 0,
  jaAgendado = 0,
  horario = horarioDb() as unknown,
  paciente = { sexo: 'MASCULINO', doacoes: [], agendamentos: [] } as PacienteDb,
} = {}) {
  const ordem: string[] = [];
  const prisma = {
    $queryRaw: vi.fn().mockImplementation(() => {
      ordem.push('lock');
      return Promise.resolve(horario ? [{ id: 'hor1' }] : []);
    }),
    horario: { findUnique: vi.fn().mockResolvedValue(horario) },
    paciente: {
      findUnique: vi.fn().mockResolvedValue({
        sexo: paciente.sexo,
        doacoes: [
          ...paciente.doacoes.map((d) => ({ doou: true, aptidao: 'APTO', aptoAPartirDe: null, agendamento: { horario: dia(d) } })),
          ...(paciente.inaptidoes ?? []),
        ],
        agendamentos: paciente.agendamentos.map((d) => ({ horario: dia(d) })),
      }),
    },
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
      expect(String(prisma.$queryRaw.mock.calls[0][0].join('?'))).toMatch(/FROM paciente .* FOR UPDATE/);
      expect(String(prisma.$queryRaw.mock.calls[1][0].join('?'))).toMatch(/FROM horario .* FOR UPDATE/);
      expect(prisma.agendamento.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { pacienteId: 'p1', horarioId: 'hor1' } }),
      );
    });

    it('conta como ocupada a vaga de quem já foi atendido; só o cancelado libera', async () => {
      const { service, prisma } = montar();
      await service.agendar('p1', 'hor1');
      const contagemDeVagas = prisma.agendamento.count.mock.calls.map((c) => c[0].where).find((w) => !w.pacienteId);
      expect(contagemDeVagas).toEqual({ horarioId: 'hor1', status: { not: 'CANCELADO' } });
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

    it.each([
      ['homem que doou há 59 dias', { sexo: 'MASCULINO', doacoes: ['2026-08-28'], agendamentos: [] }, /60 dias para homens.*a partir de 27\/10\/2026/],
      ['mulher que doou há 89 dias', { sexo: 'FEMININO', doacoes: ['2026-07-29'], agendamentos: [] }, /90 dias para mulheres/],
      ['agendamento ativo 30 dias depois', { sexo: 'MASCULINO', doacoes: [], agendamentos: ['2026-11-25'] }, /até 26\/09\/2026 ou cancele/],
      [
        'homem com 4 doações em 12 meses',
        { sexo: 'MASCULINO', doacoes: ['2025-11-20', '2026-01-20', '2026-04-20', '2026-06-20'], agendamentos: [] },
        /limite é de 4 doações em 12 meses para homens/,
      ],
    ] as [string, PacienteDb, RegExp][])('recusa pelo intervalo entre doações: %s', async (_, paciente, mensagem) => {
      const { service, prisma } = montar({ paciente });
      await expect(service.agendar('p1', 'hor1')).rejects.toThrow(mensagem);
      expect(prisma.agendamento.create).not.toHaveBeenCalled();
    });

    it.each([
      ['inapto definitivo', { aptidao: 'INAPTO_DEFINITIVO', aptoAPartirDe: null }, /inapto definitivo/],
      ['inapto temporário até depois do horário', { aptidao: 'INAPTO_TEMPORARIO', aptoAPartirDe: new Date('2026-11-10T00:00:00Z') }, /a partir de 10\/11\/2026/],
    ])('recusa paciente %s na triagem anterior', async (_, inaptidao, mensagem) => {
      const { service, prisma } = montar({
        paciente: {
          sexo: 'FEMININO',
          doacoes: [],
          agendamentos: [],
          inaptidoes: [{ doou: false, ...inaptidao, agendamento: { horario: dia('2026-10-20') } }],
        },
      });
      await expect(service.agendar('p1', 'hor1')).rejects.toThrow(mensagem);
      expect(prisma.agendamento.create).not.toHaveBeenCalled();
    });

    it('aceita quem já cumpriu a inaptidão temporária (o atendimento sem doação não conta no intervalo)', async () => {
      const { service } = montar({
        paciente: {
          sexo: 'FEMININO',
          doacoes: [],
          agendamentos: [],
          inaptidoes: [
            { doou: false, aptidao: 'INAPTO_TEMPORARIO', aptoAPartirDe: new Date('2026-10-26T00:00:00Z'), agendamento: { horario: dia('2026-10-01') } },
          ],
        },
      });
      await expect(service.agendar('p1', 'hor1')).resolves.toMatchObject({ mensagem: 'Agendamento confirmado.' });
    });

    it('aceita homem que doou há 60 dias', async () => {
      const { service } = montar({ paciente: { sexo: 'MASCULINO', doacoes: ['2026-08-27'], agendamentos: [] } });
      await expect(service.agendar('p1', 'hor1')).resolves.toMatchObject({ mensagem: 'Agendamento confirmado.' });
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

    it('não conta o agendamento substituído no intervalo entre doações', async () => {
      const { service, prisma } = montar({ paciente: { sexo: 'MASCULINO', doacoes: [], agendamentos: [] } });
      prisma.agendamento.findFirst.mockResolvedValue(agendamentoDb({ horario: horarioDb({ id: 'antigo' }) }));

      await service.reagendar('p1', 'ag1', 'hor1');

      expect(prisma.paciente.findUnique.mock.calls[0][0].select.agendamentos.where).toMatchObject({
        status: 'AGENDADO',
        id: { not: 'ag1' },
      });
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
