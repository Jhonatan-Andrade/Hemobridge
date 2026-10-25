import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AgendaService } from './agenda.service.js';

function montar({ conflito = null as object | null, horario = null as object | null } = {}) {
  const prisma = {
    disponibilidadeMedico: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(conflito ?? horario),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
  };
  return { service: new AgendaService(prisma as unknown as PrismaService), prisma };
}

const novos = { data: '2026-11-10', inicio: '08:00', fim: '10:00', duracaoMinutos: 30, linkSala: 'https://meet.exemplo.com/sala' };

describe('AgendaService', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-11-01T12:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('divide o intervalo em horários com a duração informada, no fuso de Brasília (UC13 passo 5)', async () => {
    const { service, prisma } = montar();

    const r = await service.criar('m1', novos);

    const { data } = prisma.disponibilidadeMedico.createMany.mock.calls[0][0];
    expect(data).toHaveLength(4);
    expect(data[0]).toMatchObject({
      medicoId: 'm1',
      inicio: new Date('2026-11-10T11:00:00Z'),
      fim: new Date('2026-11-10T11:30:00Z'),
      linkSala: novos.linkSala,
    });
    expect(data[3].fim).toEqual(new Date('2026-11-10T13:00:00Z'));
    expect(r.mensagem).toBe('4 horários criados.');
  });

  it('ignora a sobra do intervalo que não cabe uma consulta inteira', async () => {
    const { service, prisma } = montar();

    await service.criar('m1', { ...novos, fim: '09:20' });

    expect(prisma.disponibilidadeMedico.createMany.mock.calls[0][0].data).toHaveLength(2);
  });

  it('recusa intervalo que conflita com horários existentes (FE01)', async () => {
    const { service, prisma } = montar({ conflito: { id: 'd1' } });

    await expect(service.criar('m1', novos)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.disponibilidadeMedico.createMany).not.toHaveBeenCalled();
  });

  it('recusa horário no passado e intervalo invertido', async () => {
    const { service } = montar();

    await expect(service.criar('m1', { ...novos, data: '2026-10-30' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.criar('m1', { ...novos, inicio: '10:00', fim: '08:00' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('não remove horário com consulta marcada (FE02)', async () => {
    const { service, prisma } = montar({ horario: { consultas: [{ situacao: 'AGENDADA' }] } });

    await expect(service.remover('m1', 'd1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.disponibilidadeMedico.delete).not.toHaveBeenCalled();
  });

  it('apaga horário sem histórico e só retira da agenda o que tem consultas canceladas (RN09)', async () => {
    const livre = montar({ horario: { consultas: [] } });
    await livre.service.remover('m1', 'd1');
    expect(livre.prisma.disponibilidadeMedico.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });

    const comHistorico = montar({ horario: { consultas: [{ situacao: 'CANCELADA' }] } });
    await comHistorico.service.remover('m1', 'd1');
    expect(comHistorico.prisma.disponibilidadeMedico.delete).not.toHaveBeenCalled();
    expect(comHistorico.prisma.disponibilidadeMedico.update.mock.calls[0][0].data.removidoEm).toBeInstanceOf(Date);
  });

  it('trata horário de outro médico como inexistente', async () => {
    const { service, prisma } = montar();

    await expect(service.remover('m1', 'd9')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.disponibilidadeMedico.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'd9', medicoId: 'm1' });
  });
});
