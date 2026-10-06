import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SenhaProvisoriaService } from '../contas/senha-provisoria.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsuariosAdminService } from './usuarios-admin.service.js';

function montar(status: string | null = 'ATIVO') {
  const prisma = {
    usuario: {
      findUnique: vi.fn().mockResolvedValue(status ? { status } : null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: 'a2', nome: 'Novo', email: 'novo@h.com', perfil: 'ADMINISTRADOR' }),
    },
  };
  const senhaProvisoria = {
    gerar: vi.fn().mockResolvedValue({ senha: 'Prov1234abcd', dados: { senhaHash: 'h', senhaProvisoria: true } }),
    enviar: vi.fn().mockResolvedValue(true),
  };
  const service = new UsuariosAdminService(
    prisma as unknown as PrismaService,
    senhaProvisoria as unknown as SenhaProvisoriaService,
  );
  return { service, prisma, senhaProvisoria };
}

describe('UsuariosAdminService', () => {
  it('lista com CPF mascarado, papel e hospital, sem dados clínicos', async () => {
    const { service, prisma } = montar();
    prisma.usuario.findMany.mockResolvedValue([
      {
        id: 'p1', nome: 'Maria', email: 'm@x.com', cpf: '52998224725', perfil: 'PACIENTE', status: 'ATIVO',
        senhaProvisoria: false, criadoEm: new Date(), paciente: { situacao: 'APROVADO' }, medico: null, representante: null,
      },
      {
        id: 'm1', nome: 'Dr. João', email: 'j@h.com', cpf: '11144477735', perfil: 'MEDICO', status: 'ATIVO',
        senhaProvisoria: true, criadoEm: new Date(), paciente: null, medico: { hospital: { nome: 'Hospital X' } }, representante: null,
      },
    ]);
    prisma.usuario.count.mockResolvedValue(2);

    const r = await service.listar({ busca: '529.982', pagina: 1, tamanhoPagina: 20 });

    expect(r.itens).toMatchObject([
      { cpf: '***.982.247-**', papel: 'DOADOR', hospital: null, primeiroAcessoPendente: false },
      { cpf: '***.444.777-**', papel: 'MEDICO', hospital: 'Hospital X', primeiroAcessoPendente: true },
    ]);
    expect(prisma.usuario.findMany.mock.calls[0][0].where.OR).toContainEqual({ cpf: { contains: '529982' } });
  });

  it('impede o administrador de desativar a própria conta (FE02)', async () => {
    const { service, prisma } = montar();
    await expect(service.desativar('a1', 'a1')).rejects.toThrow(/própria conta/);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('desativa outra conta e encerra as sessões', async () => {
    const { service, prisma } = montar();
    await expect(service.desativar('u1', 'a1')).resolves.toEqual({ id: 'u1', status: 'INATIVO' });
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { status: 'INATIVO', versaoSessao: { increment: 1 } },
    });
  });

  it.each([
    ['desativar', (s: UsuariosAdminService) => s.desativar('u1', 'a1')],
    ['ativar', (s: UsuariosAdminService) => s.ativar('u1')],
  ])('não permite %s conta encerrada', async (_, acao) => {
    const { service } = montar('ENCERRADO');
    await expect(acao(service)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('responde 404 para usuário inexistente', async () => {
    const { service } = montar(null);
    await expect(service.ativar('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('recusa e-mail que já pertence a outro usuário', async () => {
    const { service, prisma } = montar();
    prisma.usuario.findFirst.mockResolvedValue({ id: 'outro' });
    await expect(service.atualizar('u1', { email: 'usado@x.com' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('cria administrador com senha provisória (FA01)', async () => {
    const { service, prisma, senhaProvisoria } = montar();

    const r = await service.criarAdministrador({ nome: 'Novo', cpf: '11144477735', email: 'novo@h.com' });

    expect(prisma.usuario.create.mock.calls[0][0].data).toMatchObject({
      perfil: 'ADMINISTRADOR',
      senhaProvisoria: true,
    });
    expect(senhaProvisoria.enviar).toHaveBeenCalled();
    expect(r).toEqual({
      administrador: { id: 'a2', nome: 'Novo', email: 'novo@h.com' },
      senhaProvisoriaEnviada: true,
    });
  });
});
