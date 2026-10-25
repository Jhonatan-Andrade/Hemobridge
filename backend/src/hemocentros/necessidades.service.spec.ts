import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NecessidadesService } from './necessidades.service.js';

const admin = { id: 'admA', hemocentro: { id: 'hA' } };

function montar() {
  const prisma = {
    hemocentro: { findFirst: vi.fn().mockResolvedValue({ id: 'hA', nome: 'Hemocentro A' }) },
    tipoSanguineo: { findMany: vi.fn().mockResolvedValue([{ sigla: 'O-', id: 8 }]) },
    necessidade: {
      upsert: vi.fn().mockReturnValue('upsert'),
      findMany: vi.fn().mockResolvedValue([
        { hemocentroId: 'hA', nivel: 'URGENTE', atualizadoEm: new Date('2026-10-25T12:00:00Z'), tipoSanguineo: { sigla: 'O-' } },
      ]),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  return { service: new NecessidadesService(prisma as unknown as PrismaService), prisma };
}

describe('NecessidadesService (RF17 / RF18)', () => {
  it('lista os oito tipos; os não informados ficam com nível nulo', async () => {
    const { service } = montar();

    const r = await service.listar('hA');

    expect(r.necessidades).toHaveLength(8);
    expect(r.necessidades.find((n) => n.tipo === 'O-')).toEqual({
      tipo: 'O-',
      nivel: 'URGENTE',
      atualizadoEm: '2026-10-25T12:00:00.000Z',
    });
    expect(r.necessidades.find((n) => n.tipo === 'A+')?.nivel).toBeNull();
    expect(r.ultimaAtualizacao).toBe('2026-10-25T12:00:00.000Z');
  });

  it('grava um registro por hemocentro e tipo (upsert) com quem atualizou', async () => {
    const { service, prisma } = montar();

    await service.atualizar('hA', admin, { niveis: [{ tipo: 'O-', nivel: 'NECESSARIO' }] });

    const { where, update, create } = prisma.necessidade.upsert.mock.calls[0][0];
    expect(where).toEqual({ hemocentroId_tipoSanguineoId: { hemocentroId: 'hA', tipoSanguineoId: 8 } });
    expect(update).toMatchObject({ nivel: 'NECESSARIO', atualizadoPorId: 'admA' });
    expect(create).toMatchObject({ hemocentroId: 'hA', tipoSanguineoId: 8, nivel: 'NECESSARIO' });
  });

  it('o Admin não altera necessidades de outro hemocentro', async () => {
    const { service, prisma } = montar();
    await expect(
      service.atualizar('hB', admin, { niveis: [{ tipo: 'O-', nivel: 'URGENTE' }] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('recusa tipo repetido na mesma atualização', async () => {
    const { service } = montar();
    await expect(
      service.atualizar('hA', admin, {
        niveis: [
          { tipo: 'O-', nivel: 'URGENTE' },
          { tipo: 'O-', nivel: 'ESTAVEL' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
