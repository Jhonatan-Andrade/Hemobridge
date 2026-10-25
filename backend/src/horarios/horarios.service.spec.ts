import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HorariosService } from './horarios.service.js';

// Domingo, 25/10/2026, 12h em Brasília.
const AGORA = new Date('2026-10-25T12:00:00-03:00');

const horarioDb = (id: string, data: string, hora: string, vagasTotal = 6) => ({
  id,
  data: new Date(`${data}T00:00:00Z`),
  horaInicio: new Date(`1970-01-01T${hora}:00Z`),
  horaFim: new Date('1970-01-01T18:00:00Z'),
  vagasTotal,
  ativo: true,
});

function montar() {
  const prisma = {
    hemocentro: { findFirst: vi.fn().mockResolvedValue({ id: 'h1', nome: 'Hemocentro A' }) },
    horario: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      createMany: vi.fn().mockImplementation(({ data }) => Promise.resolve({ count: data.length })),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...horarioDb('hor1', '2026-11-01', '13:00'), ...data })),
    },
    agendamento: {
      groupBy: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ id: 'hor1' }]),
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  return { service: new HorariosService(prisma as unknown as PrismaService), prisma };
}

describe('HorariosService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it('calcula vagas restantes, marca lotado como indisponível e esconde horário já iniciado (RF05)', async () => {
    const { service, prisma } = montar();
    prisma.horario.findMany.mockResolvedValue([
      horarioDb('passado', '2026-10-25', '08:00'),
      horarioDb('livre', '2026-10-26', '13:00', 6),
      horarioDb('lotado', '2026-10-27', '13:00', 2),
    ]);
    prisma.agendamento.groupBy.mockResolvedValue([
      { horarioId: 'livre', _count: { _all: 2 } },
      { horarioId: 'lotado', _count: { _all: 2 } },
    ]);

    const r = await service.listarPublico('h1', {});

    expect(r.de).toBe('2026-10-25');
    expect(r.ate).toBe('2026-11-24');
    expect(r.horarios.map((h) => [h.id, h.vagasRestantes, h.disponivel])).toEqual([
      ['livre', 4, true],
      ['lotado', 0, false],
    ]);
    expect(r.horarios[0]).not.toHaveProperty('agendados');
    expect(prisma.agendamento.groupBy.mock.calls[0][0].where.status).toBe('AGENDADO');
  });

  it('cria em lote nas próximas N ocorrências do dia da semana, sem datas passadas (RF08)', async () => {
    const { service, prisma } = montar();

    // Domingo 13h, 3 semanas: hoje (25/10) às 13h ainda não começou.
    const r = await service.criarLote('h1', {
      diaSemana: 0, horaInicio: '13:00', horaFim: '17:00', vagasTotal: 6, semanas: 3,
    });

    expect(r.datas).toEqual(['2026-10-25', '2026-11-01', '2026-11-08']);
    expect(r.criados).toBe(3);
    const { data, skipDuplicates } = prisma.horario.createMany.mock.calls[0][0];
    expect(skipDuplicates).toBe(true);
    expect(data[0]).toEqual({
      hemocentroId: 'h1',
      data: new Date('2026-10-25T00:00:00Z'),
      horaInicio: new Date('1970-01-01T13:00:00Z'),
      horaFim: new Date('1970-01-01T17:00:00Z'),
      vagasTotal: 6,
    });
  });

  it('no lote, pula a ocorrência de hoje cujo horário já passou', async () => {
    const { service } = montar();
    const r = await service.criarLote('h1', {
      diaSemana: 0, horaInicio: '08:00', horaFim: '12:00', vagasTotal: 6, semanas: 2,
    });
    expect(r.datas).toEqual(['2026-11-01']);
    expect(r.ignorados).toBe(1);
  });

  it.each([
    ['horário no passado', { data: '2026-10-25', horaInicio: '08:00', horaFim: '09:00' }],
    ['fim antes do início', { data: '2026-10-30', horaInicio: '13:00', horaFim: '12:00' }],
  ])('não cria %s', async (_, campos) => {
    const { service } = montar();
    await expect(service.criar('h1', { ...campos, vagasTotal: 6 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('converte horário repetido (mesmo dia e hora) em conflito', async () => {
    const { service, prisma } = montar();
    prisma.horario.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' }),
    );
    await expect(
      service.criar('h1', { data: '2026-10-30', horaInicio: '13:00', horaFim: '17:00', vagasTotal: 6 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('não reduz as vagas abaixo dos agendamentos já feitos, com o horário bloqueado', async () => {
    const { service, prisma } = montar();
    prisma.agendamento.count.mockResolvedValue(4);

    await expect(service.atualizar('h1', 'hor1', { vagasTotal: 3 })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$queryRaw.mock.calls[0][0].join('?')).toMatch(/FOR UPDATE/);
    expect(prisma.horario.update).not.toHaveBeenCalled();

    const r = await service.atualizar('h1', 'hor1', { vagasTotal: 4 });
    expect(r.horario).toMatchObject({ vagasTotal: 4, agendados: 4, vagasRestantes: 0 });
  });

  it('limita o período consultado', async () => {
    const { service } = montar();
    await expect(service.listarDoHemocentro('h1', { de: '2026-10-25', ate: '2027-01-30' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
