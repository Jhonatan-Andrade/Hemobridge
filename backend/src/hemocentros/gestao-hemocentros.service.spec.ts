import { ConflictException } from '@nestjs/common';
import { SenhaProvisoriaService } from '../contas/senha-provisoria.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GestaoHemocentrosService } from './gestao-hemocentros.service.js';

const AGORA = new Date('2026-10-25T15:00:00Z');

function montar() {
  const prisma = {
    hemocentro: {
      findUnique: vi.fn().mockResolvedValue({
        cnpj: '11222333000181',
        ativo: true,
        // detalhar()
        id: 'h1',
        nome: 'Hemocentro A',
        equipe: [],
        _count: { equipe: 0 },
      }),
      create: vi.fn().mockResolvedValue({ id: 'h1', nome: 'Hemocentro A' }),
      update: vi.fn().mockResolvedValue({}),
    },
    usuario: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'u1', nome: 'Ana', email: 'ana@a.com', perfil: 'EQUIPE' }),
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    agendamento: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  const senhaProvisoria = {
    gerar: vi.fn().mockResolvedValue({ senha: 'Provisoria1', dados: { senhaHash: 'h', senhaProvisoria: true } }),
    enviar: vi.fn().mockResolvedValue(true),
  };
  const service = new GestaoHemocentrosService(
    prisma as unknown as PrismaService,
    senhaProvisoria as unknown as SenhaProvisoriaService,
  );
  return { service, prisma, senhaProvisoria };
}

const dados = {
  nome: 'Hemocentro A',
  cnpj: '11222333000181',
  endereco: 'Rua 1, 100',
  cidade: 'Curitiba',
  estado: 'PR',
  cep: '80010000',
  telefone: '4130000000',
};

describe('GestaoHemocentrosService (RF15)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it('cria o hemocentro com o Admin inicial (equipe ADMIN_HEMOCENTRO) e envia a senha provisória', async () => {
    const { service, prisma, senhaProvisoria } = montar();
    prisma.hemocentro.findUnique.mockResolvedValueOnce(null);

    const r = await service.criar({
      ...dados,
      admin: { nome: 'Ana', cpf: '52998224725', email: 'ana@a.com', telefone: '41999990000' },
    });

    const { data } = prisma.usuario.create.mock.calls[0][0];
    expect(data.perfil).toBe('EQUIPE');
    expect(data.equipe.create).toEqual({ hemocentro: { connect: { id: 'h1' } }, papel: 'ADMIN_HEMOCENTRO' });
    expect(senhaProvisoria.enviar).toHaveBeenCalledWith(expect.objectContaining({ papel: 'ADMIN_HEMOCENTRO' }), 'Provisoria1');
    expect(r).toMatchObject({ hemocentro: { id: 'h1' }, senhaProvisoriaEnviada: true });
  });

  it('recusa CNPJ já cadastrado', async () => {
    const { service } = montar();
    await expect(
      service.criar({ ...dados, admin: { nome: 'Ana', cpf: '52998224725', email: 'ana@a.com', telefone: '41999990000' } }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ao desativar, encerra as sessões da equipe e cancela os agendamentos futuros', async () => {
    const { service, prisma } = montar();

    await service.atualizar('h1', { ativo: false });

    expect(prisma.hemocentro.update).toHaveBeenCalledWith({ where: { id: 'h1' }, data: { ativo: false } });
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
      where: { equipe: { hemocentroId: 'h1' } },
      data: { versaoSessao: { increment: 1 } },
    });
    expect(prisma.agendamento.updateMany).toHaveBeenCalledWith({
      where: { status: 'AGENDADO', horario: { hemocentroId: 'h1', data: { gte: new Date('2026-10-25T00:00:00Z') } } },
      data: { status: 'CANCELADO', canceladoEm: AGORA },
    });
  });

  it('editar dados de hemocentro ativo não mexe na equipe nem nos agendamentos', async () => {
    const { service, prisma } = montar();
    await service.atualizar('h1', { telefone: '4130000009' });
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
    expect(prisma.agendamento.updateMany).not.toHaveBeenCalled();
  });
});
