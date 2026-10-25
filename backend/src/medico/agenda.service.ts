import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hojeIso, instanteLocal, somarDias } from '../common/data.js';
import { DIAS_JANELA_AGENDAMENTO } from '../common/teleconsulta.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListarAgendaDto, NovosHorariosDto } from './dto/agenda.dto.js';

/** Limite de horários gerados de uma vez, para evitar intervalos por engano. */
export const MAX_HORARIOS_POR_INTERVALO = 48;

const MINUTO = 60_000;

// UC13 – Gerenciar Agenda. O médico só enxerga e altera os próprios horários.
@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  // Passo 2: horários e consultas do período (padrão: hoje + 30 dias).
  async listar(medicoId: string, { de, ate }: ListarAgendaDto) {
    const inicio = de ?? hojeIso();
    const fim = ate ?? somarDias(inicio, DIAS_JANELA_AGENDAMENTO);
    if (fim < inicio) throw new BadRequestException('A data final deve ser igual ou posterior à inicial.');

    const horarios = await this.prisma.disponibilidadeMedico.findMany({
      where: {
        medicoId,
        removidoEm: null,
        inicio: { gte: instanteLocal(inicio), lt: instanteLocal(somarDias(fim, 1)) },
      },
      select: {
        id: true,
        inicio: true,
        fim: true,
        linkSala: true,
        // A consulta que ocupa o horário (canceladas liberam o horário).
        consultas: {
          where: { situacao: { not: 'CANCELADA' } },
          select: { id: true, situacao: true, paciente: { select: { usuario: { select: { id: true, nome: true } } } } },
          take: 1,
        },
      },
      orderBy: { inicio: 'asc' },
    });

    return {
      de: inicio,
      ate: fim,
      horarios: horarios.map(({ consultas, ...h }) => {
        const consulta = consultas[0];
        return {
          ...h,
          livre: !consulta,
          consulta: consulta
            ? { id: consulta.id, situacao: consulta.situacao, paciente: consulta.paciente.usuario }
            : null,
        };
      }),
    };
  }

  // Passos 3–5
  async criar(medicoId: string, dto: NovosHorariosDto) {
    const inicioIntervalo = instanteLocal(dto.data, dto.inicio);
    const fimIntervalo = instanteLocal(dto.data, dto.fim);
    if (fimIntervalo <= inicioIntervalo) {
      throw new BadRequestException('O horário de término deve ser posterior ao de início.');
    }
    if (inicioIntervalo <= new Date()) {
      throw new BadRequestException('Informe um horário futuro.');
    }

    const duracao = dto.duracaoMinutos * MINUTO;
    const slots: { inicio: Date; fim: Date }[] = [];
    for (let t = inicioIntervalo.getTime(); t + duracao <= fimIntervalo.getTime(); t += duracao) {
      slots.push({ inicio: new Date(t), fim: new Date(t + duracao) });
    }
    if (!slots.length) {
      throw new BadRequestException('O intervalo informado é menor que a duração de uma consulta.');
    }
    if (slots.length > MAX_HORARIOS_POR_INTERVALO) {
      throw new BadRequestException(`Gere no máximo ${MAX_HORARIOS_POR_INTERVALO} horários por vez.`);
    }

    // FE01
    const conflito = await this.prisma.disponibilidadeMedico.findFirst({
      where: { medicoId, removidoEm: null, inicio: { lt: fimIntervalo }, fim: { gt: inicioIntervalo } },
      select: { id: true },
    });
    if (conflito) throw new ConflictException('O intervalo conflita com horários já cadastrados na agenda.');

    await this.prisma.disponibilidadeMedico.createMany({
      data: slots.map((s) => ({ ...s, medicoId, linkSala: dto.linkSala })),
    });

    return {
      mensagem: `${slots.length} ${slots.length === 1 ? 'horário criado' : 'horários criados'}.`,
      ...(await this.listar(medicoId, { de: dto.data, ate: dto.data })),
    };
  }

  // FA01 – Remover horário livre
  async remover(medicoId: string, id: string) {
    const horario = await this.prisma.disponibilidadeMedico.findFirst({
      where: { id, medicoId, removidoEm: null },
      select: { consultas: { select: { situacao: true } } },
    });
    if (!horario) throw new NotFoundException('Horário não encontrado.');

    // FE02
    if (horario.consultas.some((c) => c.situacao !== 'CANCELADA')) {
      throw new ConflictException(
        'Este horário tem consulta marcada. Para liberá-lo, cancele a consulta em "Minha agenda".',
      );
    }

    // RN09: horário com consultas canceladas no histórico só sai da agenda.
    if (horario.consultas.length) {
      await this.prisma.disponibilidadeMedico.update({ where: { id }, data: { removidoEm: new Date() } });
    } else {
      await this.prisma.disponibilidadeMedico.delete({ where: { id } });
    }
    return { mensagem: 'Horário removido da agenda.' };
  }
}
