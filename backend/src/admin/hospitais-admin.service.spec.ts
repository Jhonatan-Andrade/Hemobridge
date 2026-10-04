import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SenhaProvisoriaService } from '../contas/senha-provisoria.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CriarHospitalDto } from './dto/hospital.dto.js';
import { HospitaisAdminService } from './hospitais-admin.service.js';

const credenciais = { senhaHash: 'hash', senhaProvisoria: true, senhaProvisoriaExpiraEm: new Date() };

function montar() {
  const tx = {
    hospital: { create: vi.fn().mockResolvedValue({ id: 'h1', nome: 'Hospital X' }) },
    usuario: {
      create: vi.fn().mockResolvedValue({ id: 'u1', nome: 'Ana', email: 'ana@h.com', perfil: 'REPRESENTANTE' }),
    },
  };
  const prisma = {
    hospital: {
      findUnique: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    usuario: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      create: tx.usuario.create,
    },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const senhaProvisoria = {
    gerar: vi.fn().mockResolvedValue({ senha: 'Senha123abcd', dados: credenciais }),
    enviar: vi.fn().mockResolvedValue(true),
  };
  const service = new HospitaisAdminService(
    prisma as unknown as PrismaService,
    senhaProvisoria as unknown as SenhaProvisoriaService,
  );
  return { service, prisma, tx, senhaProvisoria };
}

const dto = {
  nome: 'Hospital X',
  cnpj: '11222333000181',
  endereco: 'Rua A, 1',
  cidade: 'Curitiba',
  estado: 'PR',
  cep: '80000000',
  telefone: '4133334444',
  latitude: -25.4,
  longitude: -49.2,
  representante: { nome: 'Ana', cpf: '52998224725', email: 'ana@h.com', telefone: '41999998888', cargo: 'Coordenadora' },
} as CriarHospitalDto;

describe('HospitaisAdminService', () => {
  it('cria hospital e representante com senha provisória e envia o e-mail', async () => {
    const { service, tx, senhaProvisoria } = montar();

    const r = await service.criar(dto);

    expect(tx.hospital.create.mock.calls[0][0].data).not.toHaveProperty('representante');
    expect(tx.usuario.create.mock.calls[0][0].data).toMatchObject({
      cpf: '52998224725',
      perfil: 'REPRESENTANTE',
      senhaProvisoria: true,
      representante: { create: { hospital: { connect: { id: 'h1' } }, cargo: 'Coordenadora' } },
    });
    expect(senhaProvisoria.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@h.com' }),
      'Senha123abcd',
    );
    expect(r).toMatchObject({ representante: { id: 'u1' }, senhaProvisoriaEnviada: true });
  });

  it('informa cada dado já cadastrado (FE01) sem gravar nada', async () => {
    const { service, prisma, tx } = montar();
    prisma.hospital.findUnique.mockResolvedValue({ id: 'outro' });
    prisma.usuario.findMany.mockResolvedValue([{ cpf: '52998224725', email: 'x@x.com' }]);

    const erro = await service.criar(dto).catch((e) => e);

    expect(erro).toBeInstanceOf(ConflictException);
    expect(erro.getResponse().message).toEqual([
      'Já existe um banco de sangue com este CNPJ.',
      'Já existe um usuário com este CPF.',
    ]);
    expect(tx.hospital.create).not.toHaveBeenCalled();
  });

  it('desativa o banco e encerra as sessões dos seus profissionais (RN09)', async () => {
    const { service, prisma } = montar();

    await expect(service.desativar('h1')).resolves.toEqual({ id: 'h1', ativo: false });
    expect(prisma.hospital.updateMany).toHaveBeenCalledWith({ where: { id: 'h1' }, data: { ativo: false } });
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
      where: { OR: [{ medico: { hospitalId: 'h1' } }, { representante: { hospitalId: 'h1' } }] },
      data: { versaoSessao: { increment: 1 } },
    });
  });

  it('responde 404 ao desativar banco inexistente', async () => {
    const { service, prisma } = montar();
    prisma.hospital.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.desativar('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('não cadastra representante em banco desativado', async () => {
    const { service, prisma } = montar();
    prisma.hospital.findUnique.mockResolvedValue({ ativo: false });
    await expect(service.adicionarRepresentante('h1', dto.representante)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
