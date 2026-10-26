import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AgendarDto } from '../plataforma/plataforma.dto.js';
import { travarPacienteAtivo } from './ciclo-clinico.js';
import { ehConflitoDeAgendamento } from './conflito-agendamento.js';
import { INSTITUICAO_ATIVA, vinculoDaAgendaAtivo } from './instituicao-agenda.js';
import { VERSAO_PRE_TRIAGEM } from './pre-triagem.dto.js';

@Injectable()
export class AgendamentoService {
  constructor(private readonly prisma: PrismaService) {}

  async agendar(pacienteId: string, dto: AgendarDto, agora = new Date()) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await travarPacienteAtivo(tx, pacienteId);
        const preTriagem = await tx.preTriagem.findFirst({ where: {
          id: dto.preTriagemId, pacienteId, versaoQuestionario: VERSAO_PRE_TRIAGEM,
          respostas: { some: {} }, consultas: { none: { status: { in: ['AGENDADA', 'REALIZADA', 'NAO_COMPARECEU'] } } },
        }, select: { id: true } });
        const ultima = await tx.preTriagem.findFirst({ where: { pacienteId },
          orderBy: [{ respondidaEm: 'desc' }, { id: 'desc' }], select: { id: true } });
        if (!preTriagem || ultima?.id !== preTriagem.id)
          throw new ConflictException('Responda a pré-triagem atual antes de selecionar um horário.');
        // Serializa reserva e cancelamento do médico sem apagar o horário histórico.
        await tx.$queryRaw`SELECT id FROM disponibilidade_medico WHERE id=${dto.disponibilidadeId}::uuid FOR UPDATE`;
        const h = await tx.disponibilidadeMedico.findFirst({ where: {
          id: dto.disponibilidadeId, canceladaEm: null,
          inicio: { gt: agora, lte: new Date(agora.getTime() + 30 * 86_400_000) }, ...INSTITUICAO_ATIVA,
        }, include: { medico: { select: { hospitalId: true, vinculos: { select: { hospitalId: true, ativo: true } } } } } });
        if (!h || !vinculoDaAgendaAtivo(h)) throw new BadRequestException('Horário indisponível.');
        const p = await tx.paciente.updateMany({
          where: { usuarioId: pacienteId, situacao: { in: ['PRE_CADASTRADO', 'REPROVADO'] } },
          data: { situacao: 'CONSULTA_AGENDADA', tipoSanguineoId: null, medicoValidadorId: null, validadoEm: null },
        });
        if (!p.count) throw new ConflictException('Sua situação atual não permite outro agendamento.');
        const anterior = await tx.consulta.findFirst({ where: { pacienteId }, orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], select: { criadoEm: true } });
        return tx.consulta.create({ data: {
          pacienteId, medicoId: h.medicoId, disponibilidadeId: h.id, preTriagemId: preTriagem.id,
          linkVideochamada: h.linkVideochamada, termoTelemedicinaAceitoEm: agora,
          // Ordem estável mesmo quando duas operações caem no mesmo milissegundo.
          criadoEm: new Date(Math.max(agora.getTime(), (anterior?.criadoEm.getTime() ?? 0) + 1)),
        }, select: { id: true, status: true } });
      });
    } catch (erro) {
      if (ehConflitoDeAgendamento(erro)) throw new ConflictException('Horário ocupado. Escolha outro.');
      throw erro;
    }
  }
}
