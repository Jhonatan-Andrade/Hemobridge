import type { PrismaService } from '../prisma/prisma.service.js';
import { cancelarConsultasFuturas } from './consultas-futuras.js';

function montar(consultas: { id: string; pacienteId: string }[]) {
  const prisma = {
    consulta: {
      findMany: vi.fn().mockResolvedValue(consultas),
      updateMany: vi.fn().mockReturnValue('upd-consultas'),
    },
    paciente: { updateMany: vi.fn().mockReturnValue('upd-pacientes') },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  return { prisma, cliente: prisma as unknown as PrismaService };
}

describe('cancelarConsultasFuturas (RN09)', () => {
  it('cancela só as consultas futuras agendadas e devolve os pacientes a Pré-cadastrado', async () => {
    const { prisma, cliente } = montar([
      { id: 'c1', pacienteId: 'p1' },
      { id: 'c2', pacienteId: 'p2' },
    ]);

    const total = await cancelarConsultasFuturas(cliente, { medicoId: 'm1' }, 'REPRESENTANTE', 'Médico desativado.');

    expect(total).toBe(2);
    const { where } = prisma.consulta.findMany.mock.calls[0][0];
    expect(where).toMatchObject({ medicoId: 'm1', situacao: 'AGENDADA' });
    expect(where.disponibilidade.inicio.gt).toBeInstanceOf(Date);
    expect(prisma.consulta.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: { in: ['c1', 'c2'] } },
      data: { situacao: 'CANCELADA', canceladaPor: 'REPRESENTANTE', motivoCancelamento: 'Médico desativado.' },
    });
    expect(prisma.paciente.updateMany.mock.calls[0][0]).toEqual({
      where: { usuarioId: { in: ['p1', 'p2'] }, situacao: 'CONSULTA_AGENDADA' },
      data: { situacao: 'PRE_CADASTRADO' },
    });
  });

  it('não abre transação quando não há consultas futuras', async () => {
    const { prisma, cliente } = montar([]);

    await expect(cancelarConsultasFuturas(cliente, { pacienteId: 'p1' }, 'ADMINISTRADOR', 'x')).resolves.toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
