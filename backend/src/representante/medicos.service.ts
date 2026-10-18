import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mascararCpf } from '../common/cpf.js';
import { cancelarConsultasFuturas } from '../consultas/cancelamento-operacional.js';
import { SenhaProvisoriaService } from '../contas/senha-provisoria.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AtualizarMedicoDto,
  ListarMedicosDto,
  NovoMedicoDto,
} from './dto/medico.dto.js';

const SELECAO_MEDICO = {
  vinculos: { select: { hospitalId: true, ativo: true } },
  crm: true,
  ufCrm: true,
  crmConferidoEm: true,
  usuario: {
    select: {
      id: true,
      nome: true,
      email: true,
      cpf: true,
      telefone: true,
      status: true,
      senhaProvisoria: true,
      senhaProvisoriaExpiraEm: true,
    },
  },
} satisfies Prisma.MedicoSelect;

type MedicoSelecionado = Prisma.MedicoGetPayload<{
  select: typeof SELECAO_MEDICO;
}>;

function apresentar(
  { usuario, ...medico }: MedicoSelecionado,
  hospitalId: string,
) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    cpf: mascararCpf(usuario.cpf),
    telefone: usuario.telefone,
    crm: medico.crm,
    ufCrm: medico.ufCrm,
    crmConferidoEm: medico.crmConferidoEm,
    status:
      usuario.status === 'ENCERRADO'
        ? 'ENCERRADO'
        : medico.vinculos?.find((v) => v.hospitalId === hospitalId)?.ativo ===
            false
          ? 'INATIVO'
          : usuario.status,
    statusConta: usuario.status,
    primeiroAcessoPendente: usuario.senhaProvisoria,
    senhaProvisoriaExpiraEm: usuario.senhaProvisoriaExpiraEm,
  };
}

// UC22 – Gerenciar Médicos. Toda operação é restrita ao hospital do representante (RN08).
@Injectable()
export class MedicosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly senhaProvisoria: SenhaProvisoriaService,
  ) {}

  // Passo 2
  async listar(
    hospitalId: string,
    { status, busca, pagina, tamanhoPagina }: ListarMedicosDto,
  ) {
    const where: Prisma.MedicoWhereInput = {
      AND: [{ OR: [{ hospitalId }, { vinculos: { some: { hospitalId } } }] }],
      usuario: { status },
      OR: busca
        ? [
            { usuario: { nome: { contains: busca, mode: 'insensitive' } } },
            { usuario: { email: { contains: busca, mode: 'insensitive' } } },
            { crm: { contains: busca.replace(/\D/g, '') || busca } },
          ]
        : undefined,
    };

    const [medicos, total] = await Promise.all([
      this.prisma.medico.findMany({
        where,
        select: SELECAO_MEDICO,
        orderBy: { usuario: { nome: 'asc' } },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      this.prisma.medico.count({ where }),
    ]);
    return {
      itens: medicos.map((m) => apresentar(m, hospitalId)),
      total,
      pagina,
      tamanhoPagina,
    };
  }

  async detalhar(hospitalId: string, medicoId: string) {
    const medico = await this.prisma.medico.findFirst({
      where: {
        usuarioId: medicoId,
        OR: [{ hospitalId }, { vinculos: { some: { hospitalId } } }],
      },
      select: SELECAO_MEDICO,
    });
    // Médico de outro hospital é tratado como inexistente.
    if (!medico) throw new NotFoundException('Médico não encontrado.');
    return apresentar(medico, hospitalId);
  }

  // Passos 4–7
  async criar(hospitalId: string, representanteId: string, dto: NovoMedicoDto) {
    await this.verificarConflitos(dto);
    const { senha, dados } = await this.senhaProvisoria.gerar();

    let usuario: { id: string; nome: string; email: string; perfil: string };
    try {
      usuario = await this.prisma.usuario.create({
        data: {
          nome: dto.nome,
          cpf: dto.cpf,
          email: dto.email,
          telefone: dto.telefone,
          ...dados,
          perfil: 'MEDICO',
          medico: {
            create: {
              crm: dto.crm,
              ufCrm: dto.ufCrm,
              hospital: { connect: { id: hospitalId } },
              vinculos: { create: { hospitalId } },
              crmConferidoPor: { connect: { id: representanteId } },
            },
          },
        },
        select: { id: true, nome: true, email: true, perfil: true },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'O médico já possui cadastro na plataforma.',
        );
      }
      throw e;
    }

    return {
      medico: await this.detalhar(hospitalId, usuario.id),
      senhaProvisoriaEnviada: await this.senhaProvisoria.enviar(usuario, senha),
    };
  }

  // FA01
  async atualizar(
    hospitalId: string,
    medicoId: string,
    dto: AtualizarMedicoDto,
  ) {
    await this.detalhar(hospitalId, medicoId);
    if (dto.email) {
      const outro = await this.prisma.usuario.findFirst({
        where: { email: dto.email, NOT: { id: medicoId } },
        select: { id: true },
      });
      if (outro)
        throw new ConflictException('Já existe um usuário com este e-mail.');
    }
    await this.prisma.usuario.update({
      where: { id: medicoId },
      data: { email: dto.email, telefone: dto.telefone },
    });
    return this.detalhar(hospitalId, medicoId);
  }

  /**
   * FA02: encerra o vínculo desta instituição e cancela somente suas consultas.
   */
  async desativar(hospitalId: string, medicoId: string) {
    if ((await this.detalhar(hospitalId, medicoId)).statusConta === 'ENCERRADO')
      throw new BadRequestException('Conta encerrada não pode ser alterada.');
    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: medicoId },
        data: { versaoSessao: { increment: 1 } },
      });
      const medico = await tx.medico.findUniqueOrThrow({
        where: { usuarioId: medicoId },
        select: { hospitalId: true },
      });
      await tx.medicoHospital.upsert({
        where: {
          medicoId_hospitalId: { medicoId, hospitalId: medico.hospitalId },
        },
        create: { medicoId, hospitalId: medico.hospitalId },
        update: {},
      });
      await tx.medicoHospital.upsert({
        where: { medicoId_hospitalId: { medicoId, hospitalId } },
        create: { medicoId, hospitalId, ativo: false },
        update: { ativo: false },
      });
      const outros = await tx.medicoHospital.count({
        where: { medicoId, ativo: true, hospital: { ativo: true } },
      });
      if (!outros)
        await tx.usuario.update({
          where: { id: medicoId },
          data: { status: 'INATIVO' },
        });
      await cancelarConsultasFuturas(
        tx,
        {
          medicoId,
          disponibilidade: {
            OR: [{ hospitalId }, { hospitalId: null, medico: { hospitalId } }],
          },
        },
        'Vínculo médico desativado',
      );
    });
    return this.detalhar(hospitalId, medicoId);
  }

  async ativar(hospitalId: string, medicoId: string) {
    if ((await this.detalhar(hospitalId, medicoId)).statusConta === 'ENCERRADO')
      throw new BadRequestException('Conta encerrada não pode ser reativada.');
    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: medicoId },
        data: { status: 'ATIVO', versaoSessao: { increment: 1 } },
      });
      await tx.medicoHospital.upsert({
        where: { medicoId_hospitalId: { medicoId, hospitalId } },
        create: { medicoId, hospitalId },
        update: { ativo: true },
      });
    });
    return this.detalhar(hospitalId, medicoId);
  }

  // FA03
  async reenviarSenhaProvisoria(hospitalId: string, medicoId: string) {
    await this.detalhar(hospitalId, medicoId);
    return this.senhaProvisoria.reenviar(medicoId);
  }

  // FE02: cada médico pertence a um único banco de sangue (RN04).
  private async verificarConflitos({ cpf, email, crm, ufCrm }: NovoMedicoDto) {
    const [usuarios, crmExistente] = await Promise.all([
      this.prisma.usuario.findMany({
        where: { OR: [{ cpf }, { email }] },
        select: { cpf: true, email: true },
      }),
      this.prisma.medico.findUnique({
        where: { crm_ufCrm: { crm, ufCrm } },
        select: { usuarioId: true },
      }),
    ]);

    const conflitos = [
      ...(usuarios.some((u) => u.cpf === cpf)
        ? ['Já existe um usuário com este CPF.']
        : []),
      ...(usuarios.some((u) => u.email === email)
        ? ['Já existe um usuário com este e-mail.']
        : []),
      ...(crmExistente ? ['Já existe um médico com este CRM e UF.'] : []),
    ];
    if (conflitos.length) {
      throw new ConflictException(conflitos);
    }
  }
}
