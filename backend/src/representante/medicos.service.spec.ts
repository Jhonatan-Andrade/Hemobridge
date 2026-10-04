import { ConflictException, NotFoundException } from '@nestjs/common';
import { SenhaProvisoriaService } from '../contas/senha-provisoria.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { NovoMedicoDto } from './dto/medico.dto.js';
import { MedicosService } from './medicos.service.js';

const medicoDb = {
  crm: '123456',
  ufCrm: 'PR',
  crmConferidoEm: new Date(),
  usuario: {
    id: 'm1', nome: 'Dr. João', email: 'joao@h.com', cpf: '52998224725', telefone: '41999998888',
    status: 'ATIVO', senhaProvisoria: true, senhaProvisoriaExpiraEm: new Date(),
  },
};

function montar() {
  const prisma = {
    medico: {
      findFirst: vi.fn().mockResolvedValue(medicoDb),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([medicoDb]),
      count: vi.fn().mockResolvedValue(1),
    },
    usuario: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'm1', nome: 'Dr. João', email: 'joao@h.com', perfil: 'MEDICO' }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const senhaProvisoria = {
    gerar: vi.fn().mockResolvedValue({ senha: 'Prov1234abcd', dados: { senhaHash: 'h', senhaProvisoria: true } }),
    enviar: vi.fn().mockResolvedValue(true),
    reenviar: vi.fn().mockResolvedValue({ senhaProvisoriaEnviada: true }),
  };
  const service = new MedicosService(
    prisma as unknown as PrismaService,
    senhaProvisoria as unknown as SenhaProvisoriaService,
  );
  return { service, prisma, senhaProvisoria };
}

const dto: NovoMedicoDto = {
  nome: 'Dr. João', cpf: '52998224725', email: 'joao@h.com', telefone: '41999998888',
  crm: '123456', ufCrm: 'PR', declaracaoCrmConferido: true,
};

describe('MedicosService', () => {
  it('lista só os médicos do hospital do representante, com CPF mascarado', async () => {
    const { service, prisma } = montar();

    const r = await service.listar('h1', { pagina: 1, tamanhoPagina: 20 });

    expect(prisma.medico.findMany.mock.calls[0][0].where.hospitalId).toBe('h1');
    expect(r.itens[0]).toMatchObject({ id: 'm1', cpf: '***.982.247-**', crm: '123456' });
  });

  it('trata médico de outro hospital como inexistente (RN08)', async () => {
    const { service, prisma } = montar();
    prisma.medico.findFirst.mockResolvedValue(null);

    await expect(service.desativar('h2', 'm1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.medico.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: 'm1', hospitalId: 'h2' } }),
    );
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('cria o médico vinculado ao hospital, registrando quem conferiu o CRM', async () => {
    const { service, prisma, senhaProvisoria } = montar();

    const r = await service.criar('h1', 'rep1', dto);

    expect(prisma.usuario.create.mock.calls[0][0].data).toMatchObject({
      perfil: 'MEDICO',
      senhaProvisoria: true,
      medico: {
        create: {
          crm: '123456',
          ufCrm: 'PR',
          hospital: { connect: { id: 'h1' } },
          crmConferidoPor: { connect: { id: 'rep1' } },
        },
      },
    });
    expect(senhaProvisoria.enviar).toHaveBeenCalled();
    expect(r.senhaProvisoriaEnviada).toBe(true);
  });

  it('recusa CRM/UF já cadastrado (FE02)', async () => {
    const { service, prisma } = montar();
    prisma.medico.findUnique.mockResolvedValue({ usuarioId: 'outro' });

    const erro = await service.criar('h1', 'rep1', dto).catch((e) => e);
    expect(erro).toBeInstanceOf(ConflictException);
    expect(erro.getResponse().message).toEqual(['Já existe um médico com este CRM e UF.']);
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  it('desativa encerrando as sessões do médico (FA02)', async () => {
    const { service, prisma } = montar();
    await service.desativar('h1', 'm1');
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { status: 'INATIVO', versaoSessao: { increment: 1 } },
    });
  });

  it('só reenvia senha de médico do próprio hospital (FA03)', async () => {
    const { service, prisma, senhaProvisoria } = montar();
    prisma.medico.findFirst.mockResolvedValue(null);
    await expect(service.reenviarSenhaProvisoria('h2', 'm1')).rejects.toBeInstanceOf(NotFoundException);
    expect(senhaProvisoria.reenviar).not.toHaveBeenCalled();
  });
});
