import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ACOES_AUDITORIA, AuditoriaService } from '../auditoria/auditoria.service.js';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { mascararCpf } from '../common/cpf.js';
import { PaginacaoDto } from '../common/paginacao.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Doações deste hemocentro com tipagem: a base para ativar a conta. */
const doacoesComTipo = (hemocentroId: string) =>
  ({ hemocentroId, tipoSanguineoId: { not: null } }) satisfies Prisma.DoacaoWhereInput;

// RF13: o Admin do hemocentro ativa a conta de quem já tem doação registrada lá.
// O tipo sanguíneo do paciente é gravado aqui, a partir da doação mais recente.
@Injectable()
export class AtivacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async pendentes(hemocentroId: string, { pagina, tamanhoPagina }: PaginacaoDto) {
    const where: Prisma.PacienteWhereInput = {
      situacao: 'PENDENTE',
      usuario: { status: 'ATIVO' },
      doacoes: { some: doacoesComTipo(hemocentroId) },
    };
    const [pacientes, total] = await Promise.all([
      this.prisma.paciente.findMany({
        where,
        select: {
          usuario: { select: { id: true, nome: true, email: true, cpf: true } },
          doacoes: {
            where: doacoesComTipo(hemocentroId),
            select: { id: true, registradoEm: true, doou: true, tipoSanguineo: { select: { sigla: true } } },
            orderBy: { registradoEm: 'desc' },
            take: 1,
          },
        },
        orderBy: { usuario: { nome: 'asc' } },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      this.prisma.paciente.count({ where }),
    ]);

    return {
      itens: pacientes.map(({ usuario, doacoes: [ultima] }) => ({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cpf: usuario.cpf ? mascararCpf(usuario.cpf) : null,
        doacao: {
          id: ultima.id,
          registradoEm: ultima.registradoEm,
          doou: ultima.doou,
          tipoSanguineo: ultima.tipoSanguineo!.sigla,
        },
      })),
      total,
      pagina,
      tamanhoPagina,
    };
  }

  async ativar(membro: MembroDaEquipe, pacienteId: string) {
    const hemocentroId = membro.hemocentro.id;
    const paciente = await this.prisma.paciente.findFirst({
      where: { usuarioId: pacienteId, usuario: { status: 'ATIVO' } },
      select: {
        situacao: true,
        doacoes: {
          where: doacoesComTipo(hemocentroId),
          select: { tipoSanguineoId: true, tipoSanguineo: { select: { sigla: true } } },
          orderBy: { registradoEm: 'desc' },
          take: 1,
        },
      },
    });
    const ultima = paciente?.doacoes[0];
    if (!paciente || (!ultima && paciente.situacao === 'PENDENTE')) {
      // Sem doação registrada neste hemocentro, o paciente não aparece para ele.
      throw new NotFoundException('Paciente não encontrado entre os pendentes de ativação.');
    }
    if (paciente.situacao === 'ATIVA') throw new ConflictException('A conta deste paciente já está ativa.');
    if (!ultima?.tipoSanguineoId) {
      throw new BadRequestException('Registre o tipo sanguíneo na doação antes de ativar a conta.');
    }

    const agora = new Date();
    await this.prisma.$transaction(async (tx) => {
      // O filtro por situação impede duas ativações simultâneas.
      const { count } = await tx.paciente.updateMany({
        where: { usuarioId: pacienteId, situacao: 'PENDENTE' },
        data: { situacao: 'ATIVA', tipoSanguineoId: ultima.tipoSanguineoId, ativadoPorId: membro.id, ativadoEm: agora },
      });
      if (!count) throw new ConflictException('A conta deste paciente já está ativa.');
      await this.auditoria.registrar(
        {
          usuarioId: membro.id,
          acao: ACOES_AUDITORIA.ATIVAR_CONTA,
          entidade: 'paciente',
          entidadeId: pacienteId,
          hemocentroId,
        },
        tx,
      );
    });

    return {
      mensagem: 'Conta ativada. O tipo sanguíneo agora aparece no painel do paciente.',
      paciente: { id: pacienteId, situacao: 'ATIVA' as const, tipoSanguineo: ultima.tipoSanguineo!.sigla, ativadoEm: agora },
    };
  }
}
