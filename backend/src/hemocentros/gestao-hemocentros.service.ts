import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { dataIsoParaDate, hojeIso } from '../common/data.js';
import { comConflitoTratado, verificarConflitos } from '../contas/conflitos.js';
import { SenhaProvisoriaService } from '../contas/senha-provisoria.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AtualizarHemocentroDto,
  CriarHemocentroDto,
  ListarHemocentrosGestaoDto,
  NovoAdminHemocentroDto,
} from './dto/hemocentro.dto.js';

const SELECAO_ADMIN = {
  id: true,
  nome: true,
  email: true,
  telefone: true,
  status: true,
  senhaProvisoria: true,
  senhaProvisoriaExpiraEm: true,
} satisfies Prisma.UsuarioSelect;

// RF15: o administrador da plataforma cadastra e desativa hemocentros e cria o
// Admin inicial de cada um. Listagens administrativas não expõem dados de saúde.
@Injectable()
export class GestaoHemocentrosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly senhaProvisoria: SenhaProvisoriaService,
  ) {}

  /** Todos os hemocentros, inclusive desativados. */
  async listar({ busca, ativo, pagina, tamanhoPagina }: ListarHemocentrosGestaoDto) {
    const digitos = busca?.replace(/\D/g, '');
    const where: Prisma.HemocentroWhereInput = {
      ativo,
      OR: busca
        ? [
            { nome: { contains: busca, mode: 'insensitive' } },
            { cidade: { contains: busca, mode: 'insensitive' } },
            ...(digitos ? [{ cnpj: { contains: digitos } }] : []),
          ]
        : undefined,
    };

    const [itens, total] = await Promise.all([
      this.prisma.hemocentro.findMany({
        where,
        select: { id: true, nome: true, cnpj: true, cidade: true, estado: true, ativo: true, criadoEm: true },
        orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      this.prisma.hemocentro.count({ where }),
    ]);
    const contagem = await this.prisma.membroEquipe.groupBy({
      by: ['hemocentroId', 'papel'],
      where: { hemocentroId: { in: itens.map((h) => h.id) } },
      _count: { _all: true },
    });
    const contar = (id: string, papel: 'MEDICO' | 'ADMIN_HEMOCENTRO') =>
      contagem.find((c) => c.hemocentroId === id && c.papel === papel)?._count._all ?? 0;

    return {
      itens: itens.map((h) => ({
        ...h,
        totalMedicos: contar(h.id, 'MEDICO'),
        totalAdmins: contar(h.id, 'ADMIN_HEMOCENTRO'),
      })),
      total,
      pagina,
      tamanhoPagina,
    };
  }

  async detalhar(id: string) {
    const hemocentro = await this.prisma.hemocentro.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        cnpj: true,
        endereco: true,
        cidade: true,
        estado: true,
        cep: true,
        telefone: true,
        horarioFuncionamento: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
        equipe: {
          where: { papel: 'ADMIN_HEMOCENTRO' },
          select: { usuario: { select: SELECAO_ADMIN } },
          orderBy: { usuario: { nome: 'asc' } },
        },
        _count: { select: { equipe: { where: { papel: 'MEDICO' } } } },
      },
    });
    if (!hemocentro) throw new NotFoundException('Hemocentro não encontrado.');

    const { equipe, _count, ...dados } = hemocentro;
    return {
      ...dados,
      totalMedicos: _count.equipe,
      admins: equipe.map(({ usuario: { senhaProvisoria, ...u } }) => ({
        ...u,
        // Ainda não fez o primeiro acesso.
        primeiroAcessoPendente: senhaProvisoria,
      })),
    };
  }

  /** Hemocentro ativo + conta do Admin inicial com senha provisória. */
  async criar({ admin, ...dados }: CriarHemocentroDto) {
    await verificarConflitos(this.prisma, { cnpj: dados.cnpj, cpf: admin.cpf, email: admin.email });
    const { senha, dados: credenciais } = await this.senhaProvisoria.gerar();

    const { hemocentro, usuario } = await comConflitoTratado(() =>
      this.prisma.$transaction(async (tx) => {
        const hemocentro = await tx.hemocentro.create({ data: dados, select: { id: true, nome: true } });
        const usuario = await tx.usuario.create({
          data: this.dadosAdmin(admin, hemocentro.id, credenciais),
          select: { id: true, nome: true, email: true, perfil: true },
        });
        return { hemocentro, usuario };
      }),
    );

    return {
      hemocentro,
      admin: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      senhaProvisoriaEnviada: await this.senhaProvisoria.enviar(
        { ...usuario, papel: 'ADMIN_HEMOCENTRO' },
        senha,
      ),
    };
  }

  /**
   * Edita os dados e ativa/desativa. Ao desativar, o hemocentro some da página
   * Doar, a equipe perde o acesso (sessões encerradas) e os agendamentos
   * futuros são cancelados.
   */
  async atualizar(id: string, { ativo, ...dados }: AtualizarHemocentroDto) {
    const atual = await this.prisma.hemocentro.findUnique({ where: { id }, select: { cnpj: true, ativo: true } });
    if (!atual) throw new NotFoundException('Hemocentro não encontrado.');
    if (dados.cnpj && dados.cnpj !== atual.cnpj) await verificarConflitos(this.prisma, { cnpj: dados.cnpj });

    const desativando = ativo === false && atual.ativo;
    await comConflitoTratado(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.hemocentro.update({ where: { id }, data: { ...dados, ativo } });
        if (!desativando) return;
        await tx.usuario.updateMany({
          where: { equipe: { hemocentroId: id } },
          data: { versaoSessao: { increment: 1 } },
        });
        await tx.agendamento.updateMany({
          where: {
            status: 'AGENDADO',
            horario: { hemocentroId: id, data: { gte: dataIsoParaDate(hojeIso()) } },
          },
          data: { status: 'CANCELADO', canceladoEm: new Date() },
        });
      }),
    );
    return this.detalhar(id);
  }

  async adicionarAdmin(hemocentroId: string, dto: NovoAdminHemocentroDto) {
    const hemocentro = await this.prisma.hemocentro.findUnique({
      where: { id: hemocentroId },
      select: { ativo: true },
    });
    if (!hemocentro) throw new NotFoundException('Hemocentro não encontrado.');
    if (!hemocentro.ativo) {
      throw new BadRequestException('Reative o hemocentro antes de cadastrar administradores.');
    }
    await verificarConflitos(this.prisma, { cpf: dto.cpf, email: dto.email });

    const { senha, dados: credenciais } = await this.senhaProvisoria.gerar();
    const usuario = await comConflitoTratado(() =>
      this.prisma.usuario.create({
        data: this.dadosAdmin(dto, hemocentroId, credenciais),
        select: { id: true, nome: true, email: true, perfil: true },
      }),
    );

    return {
      admin: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      senhaProvisoriaEnviada: await this.senhaProvisoria.enviar({ ...usuario, papel: 'ADMIN_HEMOCENTRO' }, senha),
    };
  }

  async reenviarSenhaAdmin(hemocentroId: string, usuarioId: string) {
    const membro = await this.prisma.membroEquipe.findFirst({
      where: { usuarioId, hemocentroId, papel: 'ADMIN_HEMOCENTRO' },
      select: { usuarioId: true },
    });
    if (!membro) throw new NotFoundException('Administrador não encontrado neste hemocentro.');
    return this.senhaProvisoria.reenviar(usuarioId);
  }

  private dadosAdmin(
    dto: NovoAdminHemocentroDto,
    hemocentroId: string,
    credenciais: Awaited<ReturnType<SenhaProvisoriaService['gerar']>>['dados'],
  ): Prisma.UsuarioCreateInput {
    return {
      nome: dto.nome,
      cpf: dto.cpf,
      email: dto.email,
      telefone: dto.telefone,
      ...credenciais,
      perfil: 'EQUIPE',
      equipe: { create: { hemocentro: { connect: { id: hemocentroId } }, papel: 'ADMIN_HEMOCENTRO' } },
    };
  }
}
