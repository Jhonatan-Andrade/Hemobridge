import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HorariosDisponiveisDto } from './dto/consulta.dto.js';
import {
  INSTITUICAO_ATIVA,
  vinculoDaAgendaAtivo,
} from './instituicao-agenda.js';

// RN18
export const ANTECEDENCIA_MINIMA_HORAS = 24;
export const MINUTOS_LIBERACAO_LINK = 15;
export const DIAS_AGENDA_VISIVEL = 30;

const MENSAGEM_ANTECEDENCIA =
  `A consulta não pode mais ser cancelada ou reagendada pela plataforma: ` +
  `é preciso pelo menos ${ANTECEDENCIA_MINIMA_HORAS} horas de antecedência (RN18).`;
const MENSAGEM_HORARIO_OCUPADO =
  'O horário escolhido acabou de ser reservado. Escolha outro horário.';

const SELECAO_CONSULTA = {
  id: true,
  status: true,
  linkVideochamada: true,
  motivoCancelamento: true,
  canceladaEm: true,
  consultaOrigemId: true,
  criadoEm: true,
  disponibilidade: {
    select: { inicio: true, fim: true, hospital: { select: { nome: true } } },
  },
  medico: {
    select: {
      usuario: { select: { nome: true } },
      hospital: { select: { nome: true } },
    },
  },
} as const;

// UC10 – Cancelar ou Reagendar Consulta (RF05). Sempre do próprio paciente.
@Injectable()
export class MinhasConsultasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // Passos 1 e 2: "Minhas consultas", da mais recente para a mais antiga.
  async listar(pacienteId: string, agora: Date = new Date()) {
    const consultas = await this.prisma.consulta.findMany({
      where: { pacienteId },
      select: SELECAO_CONSULTA,
      orderBy: { disponibilidade: { inicio: 'desc' } },
    });
    return consultas.map((c) => this.apresentar(c, agora));
  }

  // FA01 passo 1: horários livres do mesmo ou de outros médicos.
  async horariosDisponiveis(
    pacienteId: string,
    { medicoId, data }: HorariosDisponiveisDto,
    agora: Date = new Date(),
  ) {
    const paciente = await this.prisma.paciente.findUniqueOrThrow({
      where: { usuarioId: pacienteId },
      select: { cidade: true, estado: true },
    });
    const ate = new Date(agora.getTime() + DIAS_AGENDA_VISIVEL * 86_400_000);
    const inicioDia = data ? new Date(`${data}T00:00:00-03:00`) : undefined;
    const dia = inicioDia
      ? { gte: inicioDia, lt: new Date(inicioDia.getTime() + 86_400_000) }
      : {};

    const horarios = await this.prisma.disponibilidadeMedico.findMany({
      where: {
        inicio: { gt: agora, lte: ate, ...dia },
        consultas: { none: { status: 'AGENDADA' } },
        medicoId,
        ...INSTITUICAO_ATIVA,
      },
      select: {
        id: true,
        inicio: true,
        fim: true,
        hospitalId: true,
        hospital: { select: { nome: true, cidade: true, estado: true } },
        medico: {
          select: {
            usuarioId: true,
            hospitalId: true,
            vinculos: { where: { ativo: true }, select: { hospitalId: true } },
            usuario: { select: { nome: true } },
            hospital: { select: { nome: true, cidade: true, estado: true } },
          },
        },
      },
      orderBy: { inicio: 'asc' },
      take: 200,
    });

    // UC09 passo 5: prioriza médicos da cidade e depois do estado do paciente.
    const hospitalDaAgenda = (h: (typeof horarios)[number]) =>
      h.hospital ?? h.medico.hospital;
    const peso = (h: (typeof horarios)[number]) =>
      hospitalDaAgenda(h).cidade === paciente.cidade &&
      hospitalDaAgenda(h).estado === paciente.estado
        ? 0
        : hospitalDaAgenda(h).estado === paciente.estado
          ? 1
          : 2;
    const itens = horarios
      .filter(vinculoDaAgendaAtivo)
      .map((h) => ({ prioridade: peso(h), h }))
      .sort(
        (a, b) =>
          a.prioridade - b.prioridade ||
          a.h.inicio.getTime() - b.h.inicio.getTime(),
      )
      .map(({ h }) => ({
        disponibilidadeId: h.id,
        inicio: h.inicio,
        fim: h.fim,
        medicoId: h.medico.usuarioId,
        medico: h.medico.usuario.nome,
        hospital: hospitalDaAgenda(h).nome,
        cidade: hospitalDaAgenda(h).cidade,
        estado: hospitalDaAgenda(h).estado,
      }));

    return {
      itens,
      mensagem: itens.length
        ? undefined
        : 'Não há horários disponíveis no período.',
    };
  }

  // Passos 3 a 6.
  async cancelar(
    pacienteId: string,
    consultaId: string,
    motivo?: string,
    agora: Date = new Date(),
  ) {
    const consulta = await this.agendadaDoPaciente(pacienteId, consultaId);
    this.verificarAntecedencia(consulta.disponibilidade.inicio, agora);

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.consulta.updateMany({
        where: { id: consultaId, status: 'AGENDADA' },
        data: {
          status: 'CANCELADA',
          canceladaPorId: pacienteId,
          canceladaEm: agora,
          motivoCancelamento: motivo?.trim() || 'Cancelada pelo paciente',
        },
      });
      if (!count)
        throw new ConflictException('A consulta já não está agendada.');
      // RN10: Consulta agendada → Pré-cadastrado. O horário volta a ficar livre
      // porque só consultas AGENDADA ocupam a disponibilidade.
      await tx.paciente.updateMany({
        where: { usuarioId: pacienteId, situacao: 'CONSULTA_AGENDADA' },
        data: { situacao: 'PRE_CADASTRADO' },
      });
      await this.auditoria.registrarEm(tx, {
        usuarioId: pacienteId,
        acao: 'CANCELAR_CONSULTA',
        entidade: 'consulta',
        entidadeId: consultaId,
      });
    });

    return {
      mensagem: 'Consulta cancelada. O horário foi liberado.',
      situacaoPaciente: 'PRE_CADASTRADO',
    };
  }

  // FA01 – Reagendar: nova consulta com consulta_origem_id; o horário anterior é liberado.
  async reagendar(
    pacienteId: string,
    consultaId: string,
    disponibilidadeId: string,
    agora: Date = new Date(),
  ) {
    const anterior = await this.agendadaDoPaciente(pacienteId, consultaId);
    this.verificarAntecedencia(anterior.disponibilidade.inicio, agora);
    if (anterior.disponibilidadeId === disponibilidadeId) {
      throw new UnprocessableEntityException(
        'Escolha um horário diferente do atual.',
      );
    }

    const nova = await this.prisma.disponibilidadeMedico.findFirst({
      where: {
        id: disponibilidadeId,
        inicio: { gt: agora },
        ...INSTITUICAO_ATIVA,
      },
      select: {
        id: true,
        medicoId: true,
        linkVideochamada: true,
        hospitalId: true,
        medico: {
          select: {
            hospitalId: true,
            vinculos: { where: { ativo: true }, select: { hospitalId: true } },
          },
        },
      },
    });
    if (!nova || !vinculoDaAgendaAtivo(nova))
      throw new NotFoundException('Horário não encontrado ou indisponível.');

    try {
      const criada = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.consulta.updateMany({
          where: { id: consultaId, status: 'AGENDADA' },
          data: {
            status: 'CANCELADA',
            canceladaPorId: pacienteId,
            canceladaEm: agora,
            motivoCancelamento: 'Reagendada pelo paciente',
          },
        });
        if (!count)
          throw new ConflictException('A consulta já não está agendada.');
        const consulta = await tx.consulta.create({
          data: {
            pacienteId,
            medicoId: nova.medicoId,
            disponibilidadeId: nova.id,
            consultaOrigemId: consultaId,
            linkVideochamada: nova.linkVideochamada,
            // O consentimento para telessaúde (RN18) dado no agendamento vale
            // para o mesmo atendimento remarcado.
            termoTelemedicinaAceitoEm: anterior.termoTelemedicinaAceitoEm,
          },
          select: { id: true },
        });
        await this.auditoria.registrarEm(tx, {
          usuarioId: pacienteId,
          acao: 'REAGENDAR_CONSULTA',
          entidade: 'consulta',
          entidadeId: consulta.id,
          detalhes: { consultaOrigemId: consultaId },
        });
        return consulta;
      });

      const [consulta] = (await this.listar(pacienteId, agora)).filter(
        (c) => c.id === criada.id,
      );
      return { mensagem: 'Consulta reagendada.', consulta };
    } catch (erro) {
      // FE02 do UC09: outra pessoa reservou o horário entre a consulta e a gravação.
      if (String(erro).includes('consulta_disponibilidade_ativa_excl')) {
        throw new ConflictException(MENSAGEM_HORARIO_OCUPADO);
      }
      throw erro;
    }
  }

  private async agendadaDoPaciente(pacienteId: string, consultaId: string) {
    const consulta = await this.prisma.consulta.findFirst({
      where: { id: consultaId, pacienteId },
      select: {
        status: true,
        disponibilidadeId: true,
        termoTelemedicinaAceitoEm: true,
        disponibilidade: { select: { inicio: true } },
      },
    });
    if (!consulta) throw new NotFoundException('Consulta não encontrada.');
    if (consulta.status !== 'AGENDADA') {
      throw new UnprocessableEntityException(
        'Só consultas agendadas podem ser canceladas ou reagendadas.',
      );
    }
    return consulta;
  }

  // FE01
  private verificarAntecedencia(inicio: Date, agora: Date) {
    if (
      inicio.getTime() - agora.getTime() <
      ANTECEDENCIA_MINIMA_HORAS * 3_600_000
    ) {
      throw new UnprocessableEntityException(MENSAGEM_ANTECEDENCIA);
    }
  }

  private apresentar(
    c: {
      id: string;
      status: string;
      linkVideochamada: string;
      motivoCancelamento: string | null;
      canceladaEm: Date | null;
      consultaOrigemId: string | null;
      disponibilidade: {
        inicio: Date;
        fim: Date;
        hospital?: { nome: string } | null;
      };
      medico: { usuario: { nome: string }; hospital: { nome: string } };
    },
    agora: Date,
  ) {
    const inicio = c.disponibilidade.inicio;
    const agendada = c.status === 'AGENDADA';
    const linkLiberadoEm = new Date(
      inicio.getTime() - MINUTOS_LIBERACAO_LINK * 60_000,
    );
    const podeAlterar =
      agendada &&
      inicio.getTime() - agora.getTime() >=
        ANTECEDENCIA_MINIMA_HORAS * 3_600_000;
    return {
      id: c.id,
      status: c.status,
      medico: c.medico.usuario.nome,
      hospital: c.disponibilidade.hospital?.nome ?? c.medico.hospital.nome,
      inicio,
      fim: c.disponibilidade.fim,
      // RN18: o link só aparece ao próprio paciente a partir de 15 minutos antes.
      linkVideochamada:
        agendada && agora >= linkLiberadoEm ? c.linkVideochamada : null,
      linkLiberadoEm: agendada ? linkLiberadoEm : null,
      podeCancelarOuReagendar: podeAlterar,
      motivoCancelamento: c.motivoCancelamento,
      canceladaEm: c.canceladaEm,
      consultaOrigemId: c.consultaOrigemId,
    };
  }
}
