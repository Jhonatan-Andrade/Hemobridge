import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service.js';
import { AtualizarNecessidadesDto } from './dto/necessidade.dto.js';
import { NecessidadesService } from './necessidades.service.js';

const atual = (id: string, sigla: string, nivel: string) => ({ id, nivel, tipoSanguineo: { sigla } });

function montar() {
  const prisma = {
    hospital: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'h1', nome: 'Hospital X' }) },
    necessidadeEstoque: {
      findMany: vi
        .fn()
        // 1ª chamada: níveis atuais dos tipos enviados; demais: listagem final.
        .mockResolvedValueOnce([atual('n1', 'O-', 'BAIXO'), atual('n2', 'A+', 'ESTAVEL')])
        .mockResolvedValue([]),
      update: vi.fn((args) => args),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  return { service: new NecessidadesService(prisma as unknown as PrismaService), prisma };
}

describe('NecessidadesService.atualizar', () => {
  it('grava só os tipos que mudaram, com responsável e instante, e indica os que viraram críticos', async () => {
    const { service, prisma } = montar();

    const r = await service.atualizar('h1', 'rep1', {
      niveis: [
        { tipo: 'O-', nivel: 'CRITICO' },
        { tipo: 'A+', nivel: 'ESTAVEL' }, // sem mudança
      ],
    });

    expect(prisma.necessidadeEstoque.findMany.mock.calls[0][0].where.hospitalId).toBe('h1');
    expect(prisma.necessidadeEstoque.update).toHaveBeenCalledTimes(1);
    expect(prisma.necessidadeEstoque.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'n1' },
      data: { nivel: 'CRITICO', atualizadoPorId: 'rep1', atualizadoEm: expect.any(Date) },
    });
    expect(r.alteracoes).toEqual([{ tipo: 'O-', de: 'BAIXO', para: 'CRITICO' }]);
    expect(r.passaramACritico).toEqual(['O-']);
  });

  it('informa que não há alterações quando nada muda (FA01)', async () => {
    const { service, prisma } = montar();

    const r = await service.atualizar('h1', 'rep1', { niveis: [{ tipo: 'O-', nivel: 'BAIXO' }] });

    expect(r.mensagem).toMatch(/Não há alterações/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('recusa o mesmo tipo repetido', async () => {
    const { service } = montar();
    await expect(
      service.atualizar('h1', 'rep1', {
        niveis: [
          { tipo: 'O-', nivel: 'BAIXO' },
          { tipo: 'O-', nivel: 'CRITICO' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AtualizarNecessidadesDto', () => {
  const erros = async (niveis: unknown) =>
    (await validate(plainToInstance(AtualizarNecessidadesDto, { niveis }))).length;

  it('aceita níveis da RN02 em minúsculas', async () => {
    expect(await erros([{ tipo: 'o-', nivel: 'critico' }])).toBe(0);
  });

  it.each([
    ['NAO_INFORMADO não é escolhível (FE01)', [{ tipo: 'O-', nivel: 'NAO_INFORMADO' }]],
    ['nível inexistente', [{ tipo: 'O-', nivel: 'ALTO' }]],
    ['tipo inexistente', [{ tipo: 'C+', nivel: 'BAIXO' }]],
    ['lista vazia', []],
  ])('rejeita %s', async (_, niveis) => {
    expect(await erros(niveis)).toBeGreaterThan(0);
  });
});
