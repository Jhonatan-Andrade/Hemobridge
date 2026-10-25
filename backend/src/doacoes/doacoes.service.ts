import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ACOES_AUDITORIA, AuditoriaService } from '../auditoria/auditoria.service.js';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { calcularIdade, dataIsoParaDate, hojeIso } from '../common/data.js';
import { apresentarHorario, dateParaIso } from '../common/horario.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegistrarDoacaoDto } from './dto/doacao.dto.js';

const SELECAO_DOACAO = {
  id: true,
  compareceu: true,
  doou: true,
  motivoNaoDoacao: true,
  observacoes: true,
  registradoEm: true,
  tipoSanguineo: { select: { sigla: true } },
} satisfies Prisma.DoacaoSelect;

type DoacaoSelecionada = Prisma.DoacaoGetPayload<{ select: typeof SELECAO_DOACAO }>;

export function apresentarDoacao({ tipoSanguineo, ...d }: DoacaoSelecionada) {
  return { ...d, tipoSanguineo: tipoSanguineo?.sigla ?? null };
}

// RF10 / RF11: agenda do dia e registro da doação pelo médico do hemocentro.
@Injectable()
export class DoacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /**
   * Horários do dia com os pacientes agendados. Cada paciente traz a data e o
   * hemocentro da última doação, inclusive de outro hemocentro (registrado em auditoria).
   */
  async agenda(membro: MembroDaEquipe, data = hojeIso()) {
    const hemocentroId = membro.hemocentro.id;
    const horarios = await this.prisma.horario.findMany({
      where: { hemocentroId, data: dataIsoParaDate(data) },
      select: {
        id: true,
        data: true,
        horaInicio: true,
        horaFim: true,
        vagasTotal: true,
        ativo: true,
        agendamentos: {
          where: { status: { not: 'CANCELADO' } },
          select: {
            id: true,
            status: true,
            paciente: {
              select: {
                usuarioId: true,
                dataNascimento: true,
                situacao: true,
                tipoSanguineo: { select: { sigla: true } },
                usuario: { select: { nome: true } },
              },
            },
            doacao: { select: SELECAO_DOACAO },
          },
          orderBy: { criadoEm: 'asc' },
        },
      },
      orderBy: { horaInicio: 'asc' },
    });

    const pacienteIds = [...new Set(horarios.flatMap((h) => h.agendamentos.map((a) => a.paciente.usuarioId)))];
    const ultimas = await this.ultimasDoacoes(pacienteIds);
    const compartilhadas = [...ultimas].filter(([, d]) => d.hemocentro.id !== hemocentroId);
    await this.auditoria.registrar(
      compartilhadas.map(([pacienteId]) => ({
        usuarioId: membro.id,
        acao: ACOES_AUDITORIA.VER_ULTIMA_DOACAO_COMPARTILHADA,
        entidade: 'paciente' as const,
        entidadeId: pacienteId,
        hemocentroId,
      })),
    );

    return {
      data,
      hemocentro: membro.hemocentro,
      horarios: horarios.map(({ agendamentos, ...h }) => ({
        ...apresentarHorario(h),
        agendamentos: agendamentos.map(({ paciente: p, doacao, ...a }) => {
          const ultima = ultimas.get(p.usuarioId);
          return {
            ...a,
            paciente: {
              id: p.usuarioId,
              nome: p.usuario.nome,
              idade: p.dataNascimento ? calcularIdade(dateParaIso(p.dataNascimento)) : null,
              situacao: p.situacao,
              tipoSanguineo: p.tipoSanguineo?.sigla ?? null,
              ultimaDoacao: ultima
                ? { registradoEm: ultima.registradoEm, hemocentro: ultima.hemocentro }
                : null,
            },
            doacao: doacao ? apresentarDoacao(doacao) : null,
          };
        }),
      })),
    };
  }

  async registrar(membro: MembroDaEquipe, dto: RegistrarDoacaoDto) {
    this.validarRegistro(dto);
    const hemocentroId = membro.hemocentro.id;

    const agendamento = await this.prisma.agendamento.findFirst({
      // Agendamento de outro hemocentro é tratado como inexistente (RNF04).
      where: { id: dto.agendamentoId, horario: { hemocentroId } },
      select: { id: true, status: true, pacienteId: true, horario: { select: { data: true } } },
    });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    if (agendamento.status !== 'AGENDADO') {
      throw new ConflictException(
        agendamento.status === 'CANCELADO'
          ? 'O paciente cancelou este agendamento.'
          : 'A doação deste agendamento já foi registrada.',
      );
    }
    if (dateParaIso(agendamento.horario.data) > hojeIso()) {
      throw new BadRequestException('A doação só pode ser registrada a partir do dia do agendamento.');
    }

    const tipo = dto.tipoSanguineo
      ? await this.prisma.tipoSanguineo.findUniqueOrThrow({ where: { sigla: dto.tipoSanguineo }, select: { id: true } })
      : null;

    const doacao = await this.prisma.$transaction(async (tx) => {
      // O filtro por status impede dois registros simultâneos para o mesmo agendamento.
      const { count } = await tx.agendamento.updateMany({
        where: { id: agendamento.id, status: 'AGENDADO' },
        data: { status: dto.compareceu ? 'CONCLUIDO' : 'AUSENTE' },
      });
      if (!count) throw new ConflictException('A doação deste agendamento já foi registrada.');

      const criada = await tx.doacao.create({
        data: {
          agendamentoId: agendamento.id,
          pacienteId: agendamento.pacienteId,
          hemocentroId,
          medicoId: membro.id,
          compareceu: dto.compareceu,
          doou: dto.doou,
          tipoSanguineoId: tipo?.id ?? null,
          motivoNaoDoacao: dto.compareceu && !dto.doou ? dto.motivoNaoDoacao : null,
          observacoes: dto.observacoes || null,
        },
        select: SELECAO_DOACAO,
      });
      await this.auditoria.registrar(
        {
          usuarioId: membro.id,
          acao: ACOES_AUDITORIA.REGISTRAR_DOACAO,
          entidade: 'doacao',
          entidadeId: criada.id,
          hemocentroId,
        },
        tx,
      );
      return criada;
    });

    return {
      mensagem: dto.compareceu ? 'Doação registrada.' : 'Ausência registrada.',
      doacao: apresentarDoacao(doacao),
    };
  }

  /** Última doação efetiva de cada paciente, em qualquer hemocentro. */
  private async ultimasDoacoes(pacienteIds: string[]) {
    if (!pacienteIds.length) return new Map<string, { registradoEm: Date; hemocentro: { id: string; nome: string } }>();
    const doacoes = await this.prisma.doacao.findMany({
      where: { pacienteId: { in: pacienteIds }, doou: true },
      select: { pacienteId: true, registradoEm: true, hemocentro: { select: { id: true, nome: true } } },
      orderBy: { registradoEm: 'desc' },
      distinct: ['pacienteId'],
    });
    return new Map(doacoes.map(({ pacienteId, ...d }) => [pacienteId, d]));
  }

  private validarRegistro({ compareceu, doou, tipoSanguineo, motivoNaoDoacao }: RegistrarDoacaoDto) {
    if (!compareceu && (doou || tipoSanguineo)) {
      throw new BadRequestException('Paciente ausente não tem doação nem tipo sanguíneo registrados.');
    }
    if (compareceu && !doou && !motivoNaoDoacao) {
      throw new BadRequestException('Informe o motivo de o paciente não ter doado.');
    }
  }
}
