import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ACOES_AUDITORIA, AuditoriaService } from '../auditoria/auditoria.service.js';
import { mascararCpf } from '../common/cpf.js';
import { apresentarHorario, dateParaIso, inicioDoHorario } from '../common/horario.js';
import { gerarHashSenha, verificarSenha } from '../common/senha.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Resultado de um atendimento, como o paciente vê no painel. */
export type ResultadoDoacao = 'DOOU' | 'NAO_DOOU' | 'AUSENTE';

export const resultadoDe = (d: { compareceu: boolean; doou: boolean }): ResultadoDoacao =>
  !d.compareceu ? 'AUSENTE' : d.doou ? 'DOOU' : 'NAO_DOOU';

// RF04 (painel) e RF16 (exclusão de dados) do paciente logado.
@Injectable()
export class PacientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async painel(pacienteId: string) {
    const paciente = await this.prisma.paciente.findUnique({
      where: { usuarioId: pacienteId },
      select: {
        dataNascimento: true,
        situacao: true,
        ativadoEm: true,
        tipoSanguineo: { select: { sigla: true } },
        usuario: { select: { id: true, nome: true, email: true, cpf: true, telefone: true, criadoEm: true } },
        doacoes: {
          select: {
            id: true,
            registradoEm: true,
            compareceu: true,
            doou: true,
            motivoNaoDoacao: true,
            hemocentro: { select: { id: true, nome: true, cidade: true, estado: true } },
          },
          orderBy: { registradoEm: 'desc' },
        },
        agendamentos: {
          where: { status: 'AGENDADO' },
          select: {
            id: true,
            horario: {
              select: {
                id: true,
                data: true,
                horaInicio: true,
                horaFim: true,
                vagasTotal: true,
                ativo: true,
                hemocentro: { select: { id: true, nome: true, endereco: true, cidade: true, estado: true } },
              },
            },
          },
          orderBy: [{ horario: { data: 'asc' } }, { horario: { horaInicio: 'asc' } }],
        },
      },
    });
    if (!paciente) throw new NotFoundException('Paciente não encontrado.');

    const { usuario, doacoes, agendamentos } = paciente;
    const agora = new Date();
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf ? mascararCpf(usuario.cpf) : null,
      telefone: usuario.telefone,
      dataNascimento: paciente.dataNascimento ? dateParaIso(paciente.dataNascimento) : null,
      cadastradoEm: usuario.criadoEm,
      situacao: paciente.situacao,
      ativadoEm: paciente.ativadoEm,
      // RF04: somente leitura, depois da ativação.
      tipoSanguineo: paciente.situacao === 'ATIVA' ? (paciente.tipoSanguineo?.sigla ?? null) : null,
      doacoes: doacoes.map(({ compareceu, doou, ...d }) => ({ ...d, resultado: resultadoDe({ compareceu, doou }) })),
      proximosAgendamentos: agendamentos
        .filter((a) => inicioDoHorario(a.horario) > agora)
        .map(({ id, horario: { hemocentro, ...h } }) => {
          const { data, horaInicio, horaFim, inicio, fim } = apresentarHorario(h);
          return { id, horario: { id: h.id, data, horaInicio, horaFim, inicio, fim }, hemocentro, podeCancelar: true };
        }),
    };
  }

  /**
   * RF16 / LGPD art. 18: anonimiza os dados pessoais e encerra a conta. Os registros
   * de doação são dados de saúde sujeitos a retenção legal (hemoterapia): ficam
   * guardados, ligados apenas ao identificador interno, sem nome, CPF ou contato.
   */
  async excluirDados(pacienteId: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: pacienteId },
      select: { senhaHash: true },
    });
    if (!usuario) throw new NotFoundException('Paciente não encontrado.');
    if (!(await verificarSenha(usuario.senhaHash, senha))) {
      throw new ForbiddenException('Senha incorreta.');
    }

    const agora = new Date();
    const senhaInutilizavel = await gerarHashSenha(randomBytes(32).toString('base64url'));
    await this.prisma.$transaction(async (tx) => {
      await tx.agendamento.updateMany({
        where: { pacienteId, status: 'AGENDADO' },
        data: { status: 'CANCELADO', canceladoEm: agora },
      });
      await tx.usuario.update({
        where: { id: pacienteId },
        data: {
          nome: 'Titular removido',
          email: `removido+${pacienteId}@hemobridge.invalid`,
          cpf: null,
          telefone: null,
          senhaHash: senhaInutilizavel,
          senhaResetTokenHash: null,
          senhaResetExpiraEm: null,
          status: 'ENCERRADO',
          versaoSessao: { increment: 1 },
          paciente: { update: { dataNascimento: null } },
        },
      });
      await tx.consentimentoLgpd.updateMany({
        where: { usuarioId: pacienteId, revogadoEm: null },
        data: { revogadoEm: agora },
      });
      await this.auditoria.registrar(
        { usuarioId: pacienteId, acao: ACOES_AUDITORIA.EXCLUIR_DADOS, entidade: 'paciente', entidadeId: pacienteId },
        tx,
      );
    });

    return {
      mensagem:
        'Seus dados pessoais foram excluídos e a conta foi encerrada. Os registros de doação são mantidos sem identificação, conforme a legislação sanitária.',
    };
  }
}
