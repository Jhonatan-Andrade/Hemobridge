import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { mascararCpf } from '../common/cpf.js';
import { comConflitoTratado, verificarConflitos } from '../contas/conflitos.js';
import { SenhaProvisoriaService } from '../contas/senha-provisoria.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AtualizarMedicoDto, ListarEquipeDto, NovoMedicoDto } from './dto/equipe.dto.js';

const SELECAO_MEMBRO = {
  papel: true,
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
      criadoEm: true,
    },
  },
} satisfies Prisma.MembroEquipeSelect;

type MembroSelecionado = Prisma.MembroEquipeGetPayload<{ select: typeof SELECAO_MEMBRO }>;

function apresentar({ papel, usuario: { cpf, senhaProvisoria, ...u } }: MembroSelecionado) {
  return { ...u, cpf: cpf ? mascararCpf(cpf) : null, papel, primeiroAcessoPendente: senhaProvisoria };
}

// RF14: o Admin do hemocentro cadastra e desativa os médicos do seu hemocentro.
// Toda operação é restrita ao hemocentro de quem a faz (RNF04).
@Injectable()
export class EquipeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly senhaProvisoria: SenhaProvisoriaService,
  ) {}

  async listar(hemocentroId: string, { papel, status, busca, pagina, tamanhoPagina }: ListarEquipeDto) {
    const where: Prisma.MembroEquipeWhereInput = {
      hemocentroId,
      papel,
      usuario: {
        status,
        OR: busca
          ? [
              { nome: { contains: busca, mode: 'insensitive' } },
              { email: { contains: busca, mode: 'insensitive' } },
            ]
          : undefined,
      },
    };
    const [membros, total] = await Promise.all([
      this.prisma.membroEquipe.findMany({
        where,
        select: SELECAO_MEMBRO,
        orderBy: [{ papel: 'asc' }, { usuario: { nome: 'asc' } }],
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      this.prisma.membroEquipe.count({ where }),
    ]);
    return { itens: membros.map(apresentar), total, pagina, tamanhoPagina };
  }

  async detalhar(hemocentroId: string, usuarioId: string) {
    const membro = await this.prisma.membroEquipe.findFirst({
      where: { usuarioId, hemocentroId },
      select: SELECAO_MEMBRO,
    });
    // Membro de outro hemocentro é tratado como inexistente.
    if (!membro) throw new NotFoundException('Membro da equipe não encontrado.');
    return apresentar(membro);
  }

  async criarMedico(hemocentroId: string, dto: NovoMedicoDto) {
    await verificarConflitos(this.prisma, { cpf: dto.cpf, email: dto.email });
    const { senha, dados } = await this.senhaProvisoria.gerar();

    const usuario = await comConflitoTratado(() =>
      this.prisma.usuario.create({
        data: {
          nome: dto.nome,
          cpf: dto.cpf,
          email: dto.email,
          telefone: dto.telefone,
          ...dados,
          perfil: 'EQUIPE',
          equipe: { create: { hemocentro: { connect: { id: hemocentroId } }, papel: 'MEDICO' } },
        },
        select: { id: true, nome: true, email: true, perfil: true },
      }),
    );

    return {
      medico: await this.detalhar(hemocentroId, usuario.id),
      senhaProvisoriaEnviada: await this.senhaProvisoria.enviar({ ...usuario, papel: 'MEDICO' }, senha),
    };
  }

  /** Edita contato e ativa/desativa. Desativar encerra as sessões abertas. */
  async atualizarMedico(hemocentroId: string, usuarioId: string, { ativo, ...dados }: AtualizarMedicoDto) {
    const membro = await this.medicoDoHemocentro(hemocentroId, usuarioId);
    if (membro.usuario.status === 'ENCERRADO') {
      throw new BadRequestException('Conta encerrada não pode ser alterada.');
    }
    if (dados.email) {
      const outro = await this.prisma.usuario.findFirst({
        where: { email: dados.email, NOT: { id: usuarioId } },
        select: { id: true },
      });
      if (outro) throw new ConflictException('Já existe um usuário com este e-mail.');
    }

    const status = ativo === undefined ? undefined : ativo ? 'ATIVO' : 'INATIVO';
    await comConflitoTratado(() =>
      this.prisma.usuario.update({
        where: { id: usuarioId },
        data: {
          ...dados,
          status,
          ...(status === 'INATIVO' && membro.usuario.status !== 'INATIVO' ? { versaoSessao: { increment: 1 } } : {}),
        },
      }),
    );
    return this.detalhar(hemocentroId, usuarioId);
  }

  async reenviarSenhaProvisoria(hemocentroId: string, usuarioId: string) {
    await this.medicoDoHemocentro(hemocentroId, usuarioId);
    return this.senhaProvisoria.reenviar(usuarioId);
  }

  /** O Admin do hemocentro só gerencia médicos; os demais administradores são da plataforma. */
  private async medicoDoHemocentro(hemocentroId: string, usuarioId: string) {
    const membro = await this.prisma.membroEquipe.findFirst({
      where: { usuarioId, hemocentroId },
      select: { papel: true, usuario: { select: { status: true } } },
    });
    if (!membro) throw new NotFoundException('Membro da equipe não encontrado.');
    if (membro.papel !== 'MEDICO') {
      throw new BadRequestException('Administradores do hemocentro são gerenciados pela plataforma.');
    }
    return membro;
  }
}
