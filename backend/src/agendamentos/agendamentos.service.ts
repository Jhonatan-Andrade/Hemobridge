import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { apresentarHorario, inicioDoHorario } from '../common/horario.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const MENSAGEM_ESGOTADO = 'Horário esgotado. Escolha outro horário.';
const MENSAGEM_DUPLICADO = 'Você já tem um agendamento neste horário.';

const SELECAO_AGENDAMENTO = {
  id: true,
  status: true,
  criadoEm: true,
  canceladoEm: true,
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
} satisfies Prisma.AgendamentoSelect;

type AgendamentoSelecionado = Prisma.AgendamentoGetPayload<{ select: typeof SELECAO_AGENDAMENTO }>;

function apresentar({ horario: { hemocentro, ...horario }, ...a }: AgendamentoSelecionado, agora = new Date()) {
  const { id, data, horaInicio, horaFim, inicio, fim } = apresentarHorario(horario);
  return {
    ...a,
    horario: { id, data, horaInicio, horaFim, inicio, fim },
    hemocentro,
    // RF07: cancelar ou reagendar enquanto o horário não começou.
    podeCancelar: a.status === 'AGENDADO' && new Date(inicio) > agora,
  };
}

// RF06, RF07 e RF09: agendamento do paciente em horário com vaga.
@Injectable()
export class AgendamentosService {
  constructor(private readonly prisma: PrismaService) {}

  async meus(pacienteId: string) {
    const agendamentos = await this.prisma.agendamento.findMany({
      where: { pacienteId },
      select: SELECAO_AGENDAMENTO,
      orderBy: [{ horario: { data: 'desc' } }, { horario: { horaInicio: 'desc' } }],
    });
    const agora = new Date();
    return agendamentos.map((a) => apresentar(a, agora));
  }

  async agendar(pacienteId: string, horarioId: string) {
    const agendamento = await this.comUnicidade(() =>
      this.prisma.$transaction(async (tx) => {
        await this.reservarVaga(tx, pacienteId, horarioId);
        return tx.agendamento.create({ data: { pacienteId, horarioId }, select: SELECAO_AGENDAMENTO });
      }),
    );
    return { mensagem: 'Agendamento confirmado.', agendamento: apresentar(agendamento) };
  }

  /** RF07: a vaga é liberada na hora. */
  async cancelar(pacienteId: string, id: string) {
    const agendamento = await this.agendamentoAtivo(this.prisma, pacienteId, id);
    // O filtro por status evita cancelar duas vezes em requisições simultâneas.
    const { count } = await this.prisma.agendamento.updateMany({
      where: { id: agendamento.id, status: 'AGENDADO' },
      data: { status: 'CANCELADO', canceladoEm: new Date() },
    });
    if (!count) throw new ConflictException('Este agendamento não pode mais ser cancelado.');
    return {
      mensagem: 'Agendamento cancelado. A vaga foi liberada.',
      agendamento: apresentar(
        await this.prisma.agendamento.findUniqueOrThrow({ where: { id }, select: SELECAO_AGENDAMENTO }),
      ),
    };
  }

  /** RF07: troca de horário numa única transação; se o novo lotar, o antigo é mantido. */
  async reagendar(pacienteId: string, id: string, horarioId: string) {
    const novo = await this.comUnicidade(() =>
      this.prisma.$transaction(async (tx) => {
        const atual = await this.agendamentoAtivo(tx, pacienteId, id);
        if (atual.horario.id === horarioId) {
          throw new BadRequestException('Escolha um horário diferente do atual.');
        }
        await this.reservarVaga(tx, pacienteId, horarioId);
        const { count } = await tx.agendamento.updateMany({
          where: { id, status: 'AGENDADO' },
          data: { status: 'CANCELADO', canceladoEm: new Date() },
        });
        if (!count) throw new ConflictException('Este agendamento não pode mais ser alterado.');
        return tx.agendamento.create({ data: { pacienteId, horarioId }, select: SELECAO_AGENDAMENTO });
      }),
    );
    return { mensagem: 'Agendamento alterado.', agendamento: apresentar(novo) };
  }

  /**
   * RF09 / RNF06: bloqueia a linha do horário (SELECT … FOR UPDATE) até o fim da
   * transação. Agendamentos simultâneos no mesmo horário esperam aqui, um de cada
   * vez, e cada um conta as vagas já confirmadas pelos anteriores.
   */
  private async reservarVaga(tx: Prisma.TransactionClient, pacienteId: string, horarioId: string) {
    const [bloqueado] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM horario WHERE id = ${horarioId}::uuid FOR UPDATE`;
    const horario = bloqueado
      ? await tx.horario.findUnique({
          where: { id: horarioId },
          select: { data: true, horaInicio: true, vagasTotal: true, ativo: true, hemocentro: { select: { ativo: true } } },
        })
      : null;
    if (!horario || !horario.hemocentro.ativo) throw new NotFoundException('Horário não encontrado.');
    if (!horario.ativo) throw new ConflictException('Este horário não está disponível para agendamento.');
    if (inicioDoHorario(horario) <= new Date()) {
      throw new BadRequestException('Não é possível agendar um horário que já começou.');
    }

    const [jaAgendado, ocupadas] = await Promise.all([
      tx.agendamento.count({ where: { pacienteId, horarioId, status: 'AGENDADO' } }),
      tx.agendamento.count({ where: { horarioId, status: 'AGENDADO' } }),
    ]);
    if (jaAgendado) throw new ConflictException(MENSAGEM_DUPLICADO);
    if (ocupadas >= horario.vagasTotal) throw new ConflictException(MENSAGEM_ESGOTADO);
  }

  private async agendamentoAtivo(cliente: Prisma.TransactionClient | PrismaService, pacienteId: string, id: string) {
    const agendamento = await cliente.agendamento.findFirst({
      where: { id, pacienteId },
      select: SELECAO_AGENDAMENTO,
    });
    // Agendamento de outro paciente é tratado como inexistente.
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    if (!apresentar(agendamento).podeCancelar) {
      throw new ConflictException('Só é possível alterar agendamentos ativos de horários que ainda não começaram.');
    }
    return agendamento;
  }

  /** Índice único parcial (paciente, horário) com status AGENDADO: última barreira contra duplicidade. */
  private async comUnicidade<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(MENSAGEM_DUPLICADO);
      }
      throw e;
    }
  }
}
