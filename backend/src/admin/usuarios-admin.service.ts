import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { papelDe } from '../auth/auth.types.js';
import {mascararCpf, normalizarCpf } from '../common/cpf.js';
import { SenhaProvisoriaService } from '../contas/senha-provisoria.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AtualizarUsuarioDto, ListarUsuariosDto, NovoAdministradorDto } from './dto/usuario.dto.js';


const SELECAO_VINCULO = {
  paciente: { select: { situacao: true, cidade: true, estado: true } },
  medico: { select: { crm: true, ufCrm: true, hospital: { select: { id: true, nome: true } } } },
  representante: { select: { cargo: true, hospital: { select: { id: true, nome: true } } } },
} satisfies Prisma.UsuarioSelect;

// UC26 – Gerenciar Usuários. Listagens administrativas não expõem dados clínicos.
@Injectable()
export class UsuariosAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly senhaProvisoria: SenhaProvisoriaService,
  ) {}

  async listar({ perfil, status, busca, pagina, tamanhoPagina }: ListarUsuariosDto) {
    const cpf = busca ? normalizarCpf(busca) : '';
    const where: Prisma.UsuarioWhereInput = {
      perfil,
      status,
      OR: busca
        ? [
            { nome: { contains: busca, mode: 'insensitive' } },
            { email: { contains: busca, mode: 'insensitive' } },
            ...(cpf.length >= 3 ? [{ cpf: { contains: cpf } }] : []),
          ]
        : undefined,
    };

    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        select: {
          id: true,
          nome: true,
          email: true,
          cpf: true,
          perfil: true,
          status: true,
          senhaProvisoria: true,
          criadoEm: true,
          paciente: { select: { situacao: true } },
          medico: { select: { hospital: { select: { nome: true } } } },
          representante: { select: { hospital: { select: { nome: true } } } },
        },
        orderBy: [{ nome: 'asc' }],
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return {
      itens: usuarios.map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        cpf: mascararCpf(u.cpf),
        perfil: u.perfil,
        papel: papelDe(u.perfil, u.paciente?.situacao),
        status: u.status,
        primeiroAcessoPendente: u.senhaProvisoria,
        hospital: (u.medico ?? u.representante)?.hospital.nome ?? null,
        criadoEm: u.criadoEm,
      })),
      total,
      pagina,
      tamanhoPagina,
    };
  }

  async detalhar(id: string) {
    const u = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        telefone: true,
        perfil: true,
        status: true,
        senhaProvisoria: true,
        senhaProvisoriaExpiraEm: true,
        bloqueadoAte: true,
        criadoEm: true,
        atualizadoEm: true,
        ...SELECAO_VINCULO,
      },
    });
    if (!u) throw new NotFoundException('Usuário não encontrado.');

    const { paciente, medico, representante, senhaProvisoria, ...dados } = u;
    return {
      ...dados,
      papel: papelDe(u.perfil, paciente?.situacao),
      primeiroAcessoPendente: senhaProvisoria,
      // Situação do processo e localidade; peso, exames e tipagem não são exibidos (RNF02).
      paciente,
      medico: medico && { crm: medico.crm, ufCrm: medico.ufCrm, hospital: medico.hospital },
      representante: representante && { cargo: representante.cargo, hospital: representante.hospital },
    };
  }

  async atualizar(id: string, dto: AtualizarUsuarioDto) {
    await this.garantirExistencia(id);
    if (dto.email) {
      const outro = await this.prisma.usuario.findFirst({
        where: { email: dto.email, NOT: { id } },
        select: { id: true },
      });
      if (outro) throw new ConflictException('Já existe um usuário com este e-mail.');
    }

    try {
      await this.prisma.usuario.update({ where: { id }, data: dto });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Já existe um usuário com este e-mail.');
      }
      throw e;
    }
    return this.detalhar(id);
  }

  /**
   * Desativa a conta e encerra as sessões abertas.
   * TODO(etapa 8): cancelar consultas futuras do paciente ou do médico desativado.
   */
  async desativar(id: string, administradorId: string) {
    // FE02
    if (id === administradorId) {
      throw new BadRequestException('Você não pode desativar a própria conta.');
    }
    const { status } = await this.garantirExistencia(id);
    if (status === 'ENCERRADO') {
      throw new BadRequestException('Conta encerrada não pode ser alterada.');
    }

    await this.prisma.usuario.update({
      where: { id },
      data: { status: 'INATIVO', versaoSessao: { increment: 1 } },
    });
    return { id, status: 'INATIVO' as const };
  }

  async ativar(id: string) {
    const { status } = await this.garantirExistencia(id);
    if (status === 'ENCERRADO') {
      throw new BadRequestException('Conta encerrada não pode ser reativada.');
    }

    await this.prisma.usuario.update({ where: { id }, data: { status: 'ATIVO' } });
    return { id, status: 'ATIVO' as const };
  }

  // FA01 / RN16
  async criarAdministrador(dto: NovoAdministradorDto) {
    const existentes = await this.prisma.usuario.findMany({
      where: { OR: [{ cpf: dto.cpf }, { email: dto.email }] },
      select: { cpf: true, email: true },
    });
    const conflitos = [
      ...(existentes.some((u) => u.cpf === dto.cpf) ? ['Já existe um usuário com este CPF.'] : []),
      ...(existentes.some((u) => u.email === dto.email) ? ['Já existe um usuário com este e-mail.'] : []),
    ];
    if (conflitos.length) throw new ConflictException(conflitos);

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
          perfil: 'ADMINISTRADOR',
        },
        select: { id: true, nome: true, email: true, perfil: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('CPF ou e-mail já cadastrado.');
      }
      throw e;
    }

    return {
      administrador: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      senhaProvisoriaEnviada: await this.senhaProvisoria.enviar(usuario, senha),
    };
  }

  private async garantirExistencia(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id }, select: { status: true } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
    return usuario;
  }
}
