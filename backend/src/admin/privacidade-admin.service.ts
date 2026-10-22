import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, randomBytes } from 'node:crypto';
import { cifrar, lerChave } from '../armazenamento/cifra.js';
import { gerarHashSenha } from '../common/senha.js';
import { cancelarConsultasFuturas } from '../consultas/cancelamento-operacional.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrivacidadeAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  listar() {
    return this.prisma.solicitacaoExclusao.findMany({
      orderBy: [{ status: 'asc' }, { solicitadoEm: 'asc' }],
      take: 100,
      select: {
        id: true,
        status: true,
        solicitadoEm: true,
        concluidoEm: true,
        justificativa: true,
        usuario: { select: { id: true, nome: true, perfil: true } },
      },
    });
  }

  async decidir(
    id: string,
    administradorId: string,
    dto: {
      decisao: 'CONCLUIR' | 'RECUSAR';
      justificativa: string;
      reavaliarEm?: string;
    },
  ) {
    const senhaInutilizavel = await gerarHashSenha(
      randomBytes(48).toString('base64url'),
    );
    return this.prisma.$transaction(
      async (tx) => {
        const pedidos = await tx.$queryRaw<
          { usuario_id: string; status: string }[]
        >`
        SELECT usuario_id,status FROM solicitacao_exclusao WHERE id=${id}::uuid FOR UPDATE`;
        const pedido = pedidos[0];
        if (!pedido) throw new NotFoundException('Solicitação não encontrada.');
        if (!['PENDENTE', 'EM_ANDAMENTO'].includes(pedido.status))
          throw new ConflictException('Esta solicitação já foi atendida.');
        if (pedido.usuario_id === administradorId)
          throw new BadRequestException(
            'O atendimento deve ser feito por outro administrador.',
          );
        const agora = new Date();
        if (dto.decisao === 'RECUSAR') {
          await tx.solicitacaoExclusao.update({
            where: { id },
            data: {
              status: 'RECUSADA',
              atendidoPorId: administradorId,
              concluidoEm: agora,
              justificativa: dto.justificativa,
            },
          });
          await tx.notificacao.create({
            data: {
              usuarioId: pedido.usuario_id,
              titulo: 'Resposta à solicitação de privacidade',
              mensagem: dto.justificativa,
              link: '/#profile',
              emailSolicitado: true,
            },
          });
          await tx.logAuditoria.create({
            data: {
              usuarioId: administradorId,
              acao: 'RECUSAR_ENCERRAMENTO',
              entidade: 'solicitacao_exclusao',
              entidadeId: id,
            },
          });
          return { id, status: 'RECUSADA', retencao: false };
        }
        // Bloqueia alterações de conta e novos agendamentos enquanto conclui o pedido.
        await tx.$queryRaw`SELECT id FROM usuario WHERE id=${pedido.usuario_id}::uuid FOR UPDATE`;
        const usuario = await tx.usuario.findUniqueOrThrow({
          where: { id: pedido.usuario_id },
          include: { paciente: true },
        });
        if (usuario.status === 'ENCERRADO')
          throw new ConflictException('A conta já está encerrada.');
        const [consultas, doacoes, exames, validacoes] = await Promise.all([
          tx.consulta.count({
            where: {
              OR: [{ pacienteId: usuario.id }, { medicoId: usuario.id }],
            },
          }),
          tx.doacao.count({
            where: {
              OR: [{ pacienteId: usuario.id }, { registradoPorId: usuario.id }],
            },
          }),
          tx.exame.count({
            where: {
              OR: [
                { medicoAvaliadorId: usuario.id },
                { solicitacao: { consulta: { pacienteId: usuario.id } } },
              ],
            },
          }),
          tx.paciente.count({ where: { medicoValidadorId: usuario.id } }),
        ]);
        const retencao =
          consultas + doacoes + exames + validacoes > 0 ||
          !!usuario.paciente?.validadoEm;
        if (retencao) {
          const reavaliar = dto.reavaliarEm ? new Date(dto.reavaliarEm) : null;
          // A data é de revisão humana, nunca um prazo de destruição automática.
          if (
            !reavaliar ||
            Number.isNaN(reavaliar.getTime()) ||
            reavaliar <= agora
          ) {
            throw new BadRequestException(
              'Informe a data futura de revisão da retenção legal e registre sua fundamentação.',
            );
          }
          const chave = createHmac(
            'sha256',
            lerChave(this.config.getOrThrow<string>('ARMAZENAMENTO_CHAVE')),
          )
            .update('hemobridge:identidade-retida:v1')
            .digest();
          await tx.identidadeRetida.create({
            data: {
              usuarioId: usuario.id,
              conteudo: Uint8Array.from(
                cifrar(
                  Buffer.from(
                    JSON.stringify({
                      versao: 1,
                      usuarioId: usuario.id,
                      nome: usuario.nome,
                      cpf: usuario.cpf,
                    }),
                  ),
                  chave,
                ),
              ),
              finalidade: dto.justificativa.slice(0, 500),
              reavaliarEm: reavaliar,
            },
          });
        }
        let cpfSubstituto: string;
        do {
          cpfSubstituto = String(randomInt(100_000_000_000)).padStart(11, '0');
        } while (await tx.usuario.count({ where: { cpf: cpfSubstituto } }));
        await tx.usuario.update({
          where: { id: usuario.id },
          data: {
            nome: 'Conta encerrada',
            email: `encerrada.${usuario.id}@conta.invalid`,
            cpf: cpfSubstituto,
            telefone: null,
            status: 'ENCERRADO',
            senhaHash: senhaInutilizavel,
            versaoSessao: { increment: 1 },
            senhaProvisoria: false,
            senhaProvisoriaExpiraEm: null,
            senhaResetTokenHash: null,
            senhaResetExpiraEm: null,
            senhaResetUsadoEm: null,
            tentativasLogin: 0,
            bloqueadoAte: null,
          },
        });
        const consultasCanceladas = await cancelarConsultasFuturas(
          tx,
          { OR: [{ pacienteId: usuario.id }, { medicoId: usuario.id }] },
          'Encerramento da conta de um participante',
          administradorId,
        );
        if (!retencao && usuario.paciente) {
          await tx.respostaPreTriagem.deleteMany({
            where: { preTriagem: { pacienteId: usuario.id } },
          });
          await tx.preTriagem.deleteMany({ where: { pacienteId: usuario.id } });
          await tx.paciente.delete({ where: { usuarioId: usuario.id } });
        }
        await tx.publicacao.updateMany({
          where: { autorId: usuario.id },
          data: {
            status: 'OCULTO',
            texto: 'Conteúdo removido a pedido do titular.',
            titulo: 'Publicação removida',
            fixadaAte: null,
          },
        });
        await tx.comentario.updateMany({
          where: { autorId: usuario.id },
          data: {
            status: 'OCULTO',
            texto: 'Conteúdo removido a pedido do titular.',
          },
        });
        await tx.reacaoPublicacao.deleteMany({
          where: { usuarioId: usuario.id },
        });
        await tx.notificacao.deleteMany({
          where: { usuarioId: usuario.id, necessidadeId: null },
        });
        // Avisos da RN20 preservam somente o histórico mínimo que mantém a janela anti-spam.
        await tx.notificacao.updateMany({
          where: { usuarioId: usuario.id },
          data: {
            titulo: 'Registro de aviso',
            mensagem: 'Conta encerrada.',
            link: null,
            emailSolicitado: false,
            emailUltimoErro: null,
            emailReservaToken: null,
            emailReservadoAte: null,
          },
        });
        await tx.consentimentoLgpd.updateMany({
          where: { usuarioId: usuario.id, revogadoEm: null },
          data: { revogadoEm: agora },
        });
        await tx.solicitacaoExclusao.update({
          where: { id },
          data: {
            status: 'CONCLUIDA',
            atendidoPorId: administradorId,
            concluidoEm: agora,
            justificativa: dto.justificativa,
          },
        });
        await tx.logAuditoria.create({
          data: {
            usuarioId: administradorId,
            acao: 'CONCLUIR_ENCERRAMENTO',
            entidade: 'solicitacao_exclusao',
            entidadeId: id,
            detalhes: {
              retencao,
              consultasCanceladas,
              revisaoRetencaoEm: retencao ? dto.reavaliarEm : null,
            },
          },
        });
        return { id, status: 'CONCLUIDA', retencao, consultasCanceladas };
      },
      { timeout: 30_000 },
    );
  }
}
