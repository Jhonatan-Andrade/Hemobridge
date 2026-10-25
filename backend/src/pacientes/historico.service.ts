import { Injectable, NotFoundException } from '@nestjs/common';
import { ACOES_AUDITORIA, AuditoriaService } from '../auditoria/auditoria.service.js';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { calcularIdade } from '../common/data.js';
import { dateParaIso } from '../common/horario.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { resultadoDe } from './pacientes.service.js';

/**
 * RF12 / RNF04: histórico compartilhado entre hemocentros.
 * - A equipe só consulta pacientes que têm ou tiveram agendamento no seu hemocentro
 *   (não há busca livre por paciente).
 * - Cada registro mostra o hemocentro de origem; ninguém edita registro de outro.
 * - Toda leitura é auditada, com ação própria quando inclui outro hemocentro (RNF05).
 */
@Injectable()
export class HistoricoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async historico(membro: MembroDaEquipe, pacienteId: string) {
    const hemocentroId = membro.hemocentro.id;
    if (!(await this.temVinculo(pacienteId, hemocentroId))) {
      // Sem vínculo, o paciente é tratado como inexistente.
      throw new NotFoundException('Paciente não encontrado.');
    }

    const paciente = await this.prisma.paciente.findUniqueOrThrow({
      where: { usuarioId: pacienteId },
      select: {
        dataNascimento: true,
        situacao: true,
        tipoSanguineo: { select: { sigla: true } },
        usuario: { select: { id: true, nome: true } },
        doacoes: {
          select: {
            id: true,
            registradoEm: true,
            compareceu: true,
            doou: true,
            motivoNaoDoacao: true,
            observacoes: true,
            tipoSanguineo: { select: { sigla: true } },
            hemocentro: { select: { id: true, nome: true, cidade: true, estado: true } },
            medico: { select: { usuario: { select: { nome: true } } } },
          },
          orderBy: { registradoEm: 'desc' },
        },
      },
    });

    const compartilhado = paciente.doacoes.some((d) => d.hemocentro.id !== hemocentroId);
    await this.auditoria.registrar({
      usuarioId: membro.id,
      acao: compartilhado ? ACOES_AUDITORIA.VER_HISTORICO_COMPARTILHADO : ACOES_AUDITORIA.VER_HISTORICO,
      entidade: 'paciente',
      entidadeId: pacienteId,
      hemocentroId,
    });

    return {
      paciente: {
        id: paciente.usuario.id,
        nome: paciente.usuario.nome,
        idade: paciente.dataNascimento ? calcularIdade(dateParaIso(paciente.dataNascimento)) : null,
        situacao: paciente.situacao,
        tipoSanguineo: paciente.tipoSanguineo?.sigla ?? null,
      },
      doacoes: paciente.doacoes.map(({ tipoSanguineo, medico, compareceu, doou, ...d }) => ({
        ...d,
        compareceu,
        doou,
        resultado: resultadoDe({ compareceu, doou }),
        tipoSanguineo: tipoSanguineo?.sigla ?? null,
        medico: medico.usuario.nome,
        // A interface sempre mostra de qual hemocentro veio o registro.
        doMeuHemocentro: d.hemocentro.id === hemocentroId,
      })),
    };
  }

  /** O paciente tem ou teve agendamento (em qualquer situação) no hemocentro. */
  async temVinculo(pacienteId: string, hemocentroId: string) {
    const agendamento = await this.prisma.agendamento.findFirst({
      where: { pacienteId, horario: { hemocentroId } },
      select: { id: true },
    });
    return agendamento !== null;
  }
}
