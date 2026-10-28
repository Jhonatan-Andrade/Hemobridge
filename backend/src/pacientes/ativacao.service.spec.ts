import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AtivacaoService } from './ativacao.service.js';

const AGORA = new Date('2026-10-25T15:00:00Z');

const adminA: MembroDaEquipe = {
  id: 'admA',
  nome: 'Ana',
  email: 'ana@a.com',
  perfil: 'EQUIPE',
  papel: 'ADMIN_HEMOCENTRO',
  hemocentro: { id: 'hA', nome: 'Hemocentro A' },
  senhaProvisoria: false,
};

function montar(paciente: unknown) {
  const prisma = {
    paciente: {
      findFirst: vi.fn().mockResolvedValue(paciente),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  const auditoria = { registrar: vi.fn().mockResolvedValue(undefined) };
  const service = new AtivacaoService(prisma as unknown as PrismaService, auditoria as unknown as AuditoriaService);
  return { service, prisma, auditoria };
}

const pendente = (doacoes: unknown[] = [{ tipoSanguineoId: 7, tipoSanguineo: { sigla: 'O+' } }]) => ({
  situacao: 'PENDENTE',
  doacoes,
});

describe('AtivacaoService (RF13)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it('lista só pacientes PENDENTE com doação tipada no próprio hemocentro', async () => {
    const { service, prisma } = montar(null);

    await service.pendentes('hA', { pagina: 1, tamanhoPagina: 20 });

    expect(prisma.paciente.findMany.mock.calls[0][0].where).toEqual({
      situacao: 'PENDENTE',
      usuario: { status: 'ATIVO' },
      doacoes: { some: { hemocentroId: 'hA', tipoSanguineoId: { not: null } } },
    });
  });

  it('ativa a conta gravando o tipo sanguíneo da doação mais recente e audita', async () => {
    const { service, prisma, auditoria } = montar(pendente());

    const r = await service.ativar(adminA, 'p1');

    expect(prisma.paciente.findFirst.mock.calls[0][0].select.doacoes.where).toEqual({
      hemocentroId: 'hA',
      tipoSanguineoId: { not: null },
    });
    expect(prisma.paciente.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 'p1', situacao: 'PENDENTE' },
      data: { situacao: 'ATIVA', tipoSanguineoId: 7, ativadoPorId: 'admA', ativadoEm: AGORA },
    });
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'ATIVAR_CONTA', entidadeId: 'p1', hemocentroId: 'hA' }),
      prisma,
    );
    expect(r.paciente).toMatchObject({ situacao: 'ATIVA', tipoSanguineo: 'O+' });
  });

  it('recusa paciente sem doação registrada neste hemocentro', async () => {
    const { service, prisma } = montar(pendente([]));
    await expect(service.ativar(adminA, 'p1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.paciente.updateMany).not.toHaveBeenCalled();
  });

  it('recusa conta já ativa', async () => {
    const { service } = montar({ situacao: 'ATIVA', doacoes: [] });
    await expect(service.ativar(adminA, 'p1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('recusa doação sem tipo sanguíneo', async () => {
    const { service } = montar(pendente([{ tipoSanguineoId: null, tipoSanguineo: null }]));
    await expect(service.ativar(adminA, 'p1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa a segunda ativação simultânea', async () => {
    const { service, prisma, auditoria } = montar(pendente());
    prisma.paciente.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.ativar(adminA, 'p1')).rejects.toBeInstanceOf(ConflictException);
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });
});
