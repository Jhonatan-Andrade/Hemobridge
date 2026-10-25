import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { hojeIso, instanteLocal, somarDias } from '../common/data.js';
import {
  DIAS_JANELA_AGENDAMENTO,
  HORAS_ANTECEDENCIA_CANCELAMENTO,
  linkDisponivelEm,
  linkVisivel,
  podeCancelar,
} from '../common/teleconsulta.js';
import { Prisma } from '../generated/prisma/client.js';
import type { SituacaoPaciente } from '../generated/prisma/enums.js';
import { TERMO_TELESSAUDE } from '../lgpd/termo-telessaude.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AgendarConsultaDto, HorariosDisponiveisDto } from './dto/consulta.dto.js';

const DIA = 24 * 60 * 60_000;
const MAX_HORARIOS_LISTADOS = 500;

const SELECAO_CONSULTA = {
  id: true,
  situacao: true,
  canceladaPor: true,
  motivoCancelamento: true,
  motivoReprovacao: true,
  criadoEm: true,
  disponibilidade: { select: { inicio: true, fim: true, linkSala: true } },
  medico: {
    select: {
      crm: true,
      ufCrm: true,
      usuario: { select: { nome: true } },
      hospital: { select: { nome: true, cidade: true, estado: true } },
    },
  },
  solicitacaoExame: { select: { id: true, situacao: true } },
} satisfies Prisma.ConsultaSelect;

type ConsultaSelecionada = Prisma.ConsultaGetPayload<{ select: typeof SELECAO_CONSULTA }>;

// RN18: o link só aparece ao paciente da consulta, a partir de 15 minutos antes.
function apresentar(c: ConsultaSelecionada, agora = new Date()) {
  const { inicio, fim, linkSala } = c.disponibilidade;
  const agendada = c.situacao === 'AGENDADA';
  return {
    id: c.id,
    situacao: c.situacao,
    inicio,
    fim,
    medico: { nome: c.medico.usuario.nome, crm: c.medico.crm, ufCrm: c.medico.ufCrm },
    hospital: c.medico.hospital,
    linkSala: agendada && linkVisivel(inicio, fim, agora) ? linkSala : null,
    linkDisponivelEm: agendada ? linkDisponivelEm(inicio) : null,
    podeCancelar: agendada && podeCancelar(inicio, agora),
    canceladaPor: c.canceladaPor,
    motivoCancelamento: c.motivoCancelamento,
    motivoReprovacao: c.motivoReprovacao,
    solicitacaoExame: c.solicitacaoExame,
  };
}

const formatoDataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
});

// UC09 – Agendar Consulta e UC10 – Cancelar ou Reagendar Consulta (RF04, RF05).
@Injectable()
export class ConsultasPacienteService {
  constructor(private readonly prisma: PrismaService) {}

  termoTelessaude() {
    return TERMO_TELESSAUDE;
  }

  /** Horários livres de médicos ativos em hospitais ativos, nos próximos 30 dias. */
  private filtroHorariosLivres(agora: Date, data?: string): Prisma.DisponibilidadeMedicoWhereInput {
    const limite = new Date(agora.getTime() + DIAS_JANELA_AGENDAMENTO * DIA);
    const inicio = data
      ? { gte: new Date(Math.max(instanteLocal(data).getTime(), agora.getTime())), lt: instanteLocal(somarDias(data, 1)), lte: limite }
      : { gt: agora, lte: limite };
    return {
      removidoEm: null,
      inicio,
      consultas: { none: { situacao: 'AGENDADA' } },
      medico: { usuario: { status: 'ATIVO' }, hospital: { ativo: true } },
    };
  }

  // Passo 5: agrupados por médico, priorizando a cidade e o estado do paciente.
  async horariosDisponiveis(pacienteId: string, { data }: HorariosDisponiveisDto) {
    if (data && (data < hojeIso() || data > somarDias(hojeIso(), DIAS_JANELA_AGENDAMENTO))) {
      throw new BadRequestException(`Escolha uma data entre hoje e os próximos ${DIAS_JANELA_AGENDAMENTO} dias.`);
    }
    const paciente = await this.obterPaciente(pacienteId);
    const horarios = await this.prisma.disponibilidadeMedico.findMany({
      where: this.filtroHorariosLivres(new Date(), data),
      select: {
        id: true,
        inicio: true,
        fim: true,
        medico: {
          select: {
            usuarioId: true,
            crm: true,
            ufCrm: true,
            usuario: { select: { nome: true } },
            hospital: { select: { nome: true, cidade: true, estado: true } },
          },
        },
      },
      orderBy: { inicio: 'asc' },
      take: MAX_HORARIOS_LISTADOS,
    });

    const porMedico = new Map<string, { medico: object; prioridade: number; horarios: object[] }>();
    for (const { medico, ...h } of horarios) {
      let grupo = porMedico.get(medico.usuarioId);
      if (!grupo) {
        const { hospital } = medico;
        const prioridade =
          hospital.estado === paciente.estado
            ? hospital.cidade.localeCompare(paciente.cidade, 'pt-BR', { sensitivity: 'base' }) === 0 ? 0 : 1
            : 2;
        grupo = {
          prioridade,
          medico: { id: medico.usuarioId, nome: medico.usuario.nome, crm: medico.crm, ufCrm: medico.ufCrm, hospital },
          horarios: [],
        };
        porMedico.set(medico.usuarioId, grupo);
      }
      grupo.horarios.push(h);
    }

    // A ordenação é estável: dentro da mesma prioridade, vem antes quem tem o horário mais cedo.
    const medicos = [...porMedico.values()]
      .sort((a, b) => a.prioridade - b.prioridade)
      .map(({ medico, horarios: hs }) => ({ ...medico, horarios: hs }));

    // FE01: lista vazia indica que não há horários no período.
    return { data: data ?? null, medicos };
  }

  // UC10 passos 1–2: consultas do paciente, da mais recente para a mais antiga.
  async listar(pacienteId: string) {
    const consultas = await this.prisma.consulta.findMany({
      where: { pacienteId },
      select: SELECAO_CONSULTA,
      orderBy: { disponibilidade: { inicio: 'desc' } },
    });
    const agora = new Date();
    return consultas.map((c) => apresentar(c, agora));
  }

  async detalhar(pacienteId: string, id: string) {
    const consulta = await this.prisma.consulta.findFirst({ where: { id, pacienteId }, select: SELECAO_CONSULTA });
    if (!consulta) throw new NotFoundException('Consulta não encontrada.');
    return apresentar(consulta);
  }

  // Passos 6–9
  async agendar(pacienteId: string, dto: AgendarConsultaDto, ipOrigem?: string) {
    if (dto.versaoTermoTelessaude !== TERMO_TELESSAUDE.versao) {
      throw new BadRequestException(
        'A versão do termo de telessaúde aceita não é a vigente. Recarregue a página e aceite o termo atual.',
      );
    }
    const paciente = await this.obterPaciente(pacienteId);
    await this.garantirPodeAgendar(pacienteId, paciente.situacao);

    const id = await this.reservar(async (tx) => {
      const medicoId = await this.medicoDoHorarioLivre(tx, dto.disponibilidadeId);
      const consulta = await tx.consulta.create({
        data: {
          pacienteId,
          medicoId,
          disponibilidadeId: dto.disponibilidadeId,
          versaoTermoTelessaude: TERMO_TELESSAUDE.versao,
          ipOrigem,
        },
        select: { id: true },
      });
      // RN10: Pré-cadastrado (ou Reprovado) → Consulta agendada.
      await tx.paciente.update({ where: { usuarioId: pacienteId }, data: { situacao: 'CONSULTA_AGENDADA' } });
      return consulta.id;
    });

    return {
      mensagem: 'Consulta agendada. O link da sala ficará disponível 15 minutos antes do horário.',
      consulta: await this.detalhar(pacienteId, id),
    };
  }

  // UC10 passos 3–6
  async cancelar(pacienteId: string, id: string) {
    await this.consultaCancelavel(pacienteId, id);
    await this.prisma.$transaction([
      this.prisma.consulta.update({
        where: { id },
        data: { situacao: 'CANCELADA', canceladaPor: 'PACIENTE', encerradaEm: new Date() },
      }),
      // RN10: Consulta agendada → Pré-cadastrado.
      this.prisma.paciente.update({ where: { usuarioId: pacienteId }, data: { situacao: 'PRE_CADASTRADO' } }),
    ]);
    return { mensagem: 'Consulta cancelada. O horário foi liberado.', consulta: await this.detalhar(pacienteId, id) };
  }

  // UC10 FA01: a consulta original é cancelada e a nova guarda a referência a ela.
  async reagendar(pacienteId: string, id: string, disponibilidadeId: string) {
    const original = await this.consultaCancelavel(pacienteId, id);
    if (original.disponibilidadeId === disponibilidadeId) {
      throw new BadRequestException('Escolha um horário diferente do atual.');
    }

    const novaId = await this.reservar(async (tx) => {
      const medicoId = await this.medicoDoHorarioLivre(tx, disponibilidadeId);
      await tx.consulta.update({
        where: { id },
        data: {
          situacao: 'CANCELADA',
          canceladaPor: 'PACIENTE',
          motivoCancelamento: 'Reagendada pelo paciente.',
          encerradaEm: new Date(),
        },
      });
      const nova = await tx.consulta.create({
        data: {
          pacienteId,
          medicoId,
          disponibilidadeId,
          consultaOrigemId: id,
          // O consentimento dado no agendamento original continua valendo.
          versaoTermoTelessaude: original.versaoTermoTelessaude,
          termoTelessaudeAceitoEm: original.termoTelessaudeAceitoEm,
          ipOrigem: original.ipOrigem,
        },
        select: { id: true },
      });
      return nova.id;
    });

    return { mensagem: 'Consulta reagendada.', consulta: await this.detalhar(pacienteId, novaId) };
  }

  private async obterPaciente(pacienteId: string) {
    const paciente = await this.prisma.paciente.findUnique({
      where: { usuarioId: pacienteId },
      select: { situacao: true, cidade: true, estado: true },
    });
    if (!paciente) throw new NotFoundException('Paciente não encontrado.');
    return paciente;
  }

  private async garantirPodeAgendar(pacienteId: string, situacao: SituacaoPaciente) {
    // FE03
    const futura = await this.prisma.consulta.findFirst({
      where: { pacienteId, situacao: 'AGENDADA' },
      select: { disponibilidade: { select: { inicio: true } } },
    });
    if (futura) {
      throw new ConflictException(
        `Você já tem uma consulta agendada para ${formatoDataHora.format(futura.disponibilidade.inicio)}. ` +
          'Para mudar o horário, use a opção Reagendar.',
      );
    }
    if (situacao === 'APROVADO') {
      throw new UnprocessableEntityException('Seu cadastro já foi aprovado. Não é necessário agendar consulta.');
    }
    if (situacao === 'AGUARDANDO_EXAME' || situacao === 'EM_ANALISE') {
      throw new UnprocessableEntityException(
        'Há exames em andamento no seu processo. Envie o resultado ou aguarde a avaliação do médico.',
      );
    }
  }

  private async consultaCancelavel(pacienteId: string, id: string) {
    const consulta = await this.prisma.consulta.findFirst({
      where: { id, pacienteId },
      select: {
        situacao: true,
        disponibilidadeId: true,
        versaoTermoTelessaude: true,
        termoTelessaudeAceitoEm: true,
        ipOrigem: true,
        disponibilidade: { select: { inicio: true } },
      },
    });
    if (!consulta) throw new NotFoundException('Consulta não encontrada.');
    if (consulta.situacao !== 'AGENDADA') throw new ConflictException('Esta consulta não está mais agendada.');
    // FE01
    if (!podeCancelar(consulta.disponibilidade.inicio)) {
      throw new UnprocessableEntityException(
        `A consulta não pode mais ser cancelada ou reagendada pela plataforma: faltam menos de ${HORAS_ANTECEDENCIA_CANCELAMENTO} horas.`,
      );
    }
    return consulta;
  }

  private async medicoDoHorarioLivre(tx: Prisma.TransactionClient, disponibilidadeId: string): Promise<string> {
    const livre = await tx.disponibilidadeMedico.findFirst({
      where: { id: disponibilidadeId, ...this.filtroHorariosLivres(new Date()) },
      select: { medicoId: true },
    });
    // FE02
    if (!livre) throw new ConflictException('Este horário não está mais disponível. Escolha outro horário.');
    return livre.medicoId;
  }

  /** Executa a reserva em transação; corrida pelo mesmo horário vira FE02 (índice único parcial). */
  private async reservar(operacao: (tx: Prisma.TransactionClient) => Promise<string>): Promise<string> {
    try {
      return await this.prisma.$transaction(operacao);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Este horário acabou de ser reservado. Escolha outro horário.');
      }
      throw e;
    }
  }
}
