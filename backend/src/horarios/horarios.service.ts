import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OCUPA_VAGA } from '../agendamentos/vaga.js';
import { dataIsoParaDate, hojeIso, instanteLocal, somarDias } from '../common/data.js';
import { apresentarHorario, diaDaSemana, horaParaTime } from '../common/horario.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AtualizarHorarioDto, LoteHorariosDto, NovoHorarioDto, PeriodoDto } from './dto/horario.dto.js';

export const DIAS_PADRAO = 30;
export const MAX_DIAS_PERIODO = 62;

const SELECAO_HORARIO = {
  id: true,
  data: true,
  horaInicio: true,
  horaFim: true,
  vagasTotal: true,
  ativo: true,
} satisfies Prisma.HorarioSelect;

// RF05 / RF08 / RF09: horários de atendimento e vagas de cada hemocentro.
@Injectable()
export class HorariosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Página Doar: horários ativos e ainda não iniciados, com as vagas restantes.
   * Horário lotado aparece com `disponivel: false`.
   */
  async listarPublico(hemocentroId: string, periodo: PeriodoDto) {
    const hemocentro = await this.prisma.hemocentro.findFirst({
      where: { id: hemocentroId, ativo: true },
      select: { id: true, nome: true },
    });
    if (!hemocentro) throw new NotFoundException('Hemocentro não encontrado.');

    const { de, ate } = this.periodo(periodo);
    const agora = new Date();
    const horarios = (await this.buscar(hemocentroId, de, ate, { ativo: true })).filter(
      (h) => new Date(h.inicio) > agora,
    );
    return {
      hemocentro,
      de,
      ate,
      // O total de agendados não é exposto publicamente; só as vagas restantes.
      horarios: horarios.map((h) => ({
        id: h.id,
        data: h.data,
        horaInicio: h.horaInicio,
        horaFim: h.horaFim,
        inicio: h.inicio,
        fim: h.fim,
        vagasTotal: h.vagasTotal,
        vagasRestantes: h.vagasRestantes,
        disponivel: h.vagasRestantes > 0,
      })),
    };
  }

  /** Admin do hemocentro: todos os horários do período, inclusive inativos e passados. */
  async listarDoHemocentro(hemocentroId: string, periodo: PeriodoDto) {
    const { de, ate } = this.periodo(periodo);
    return { de, ate, horarios: await this.buscar(hemocentroId, de, ate) };
  }

  async criar(hemocentroId: string, dto: NovoHorarioDto) {
    this.validarPeriodoDoDia(dto.horaInicio, dto.horaFim);
    if (instanteLocal(dto.data, dto.horaInicio) <= new Date()) {
      throw new BadRequestException('Não é possível criar horário no passado.');
    }
    try {
      const horario = await this.prisma.horario.create({
        data: {
          hemocentroId,
          data: dataIsoParaDate(dto.data),
          horaInicio: horaParaTime(dto.horaInicio),
          horaFim: horaParaTime(dto.horaFim),
          vagasTotal: dto.vagasTotal,
        },
        select: SELECAO_HORARIO,
      });
      return {
        mensagem: 'Horário criado.',
        horario: { ...apresentarHorario(horario), agendados: 0, vagasRestantes: horario.vagasTotal },
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Já existe um horário neste dia começando nessa hora.');
      }
      throw e;
    }
  }

  /** Cria o mesmo horário nas próximas N ocorrências do dia da semana; ignora os que já existem. */
  async criarLote(hemocentroId: string, dto: LoteHorariosDto) {
    this.validarPeriodoDoDia(dto.horaInicio, dto.horaFim);
    const inicio = dto.aPartirDe && dto.aPartirDe > hojeIso() ? dto.aPartirDe : hojeIso();
    const primeira = somarDias(inicio, (dto.diaSemana - diaDaSemana(inicio) + 7) % 7);
    const agora = new Date();
    const datas = Array.from({ length: dto.semanas }, (_, i) => somarDias(primeira, i * 7)).filter(
      (data) => instanteLocal(data, dto.horaInicio) > agora,
    );

    const { count } = await this.prisma.horario.createMany({
      data: datas.map((data) => ({
        hemocentroId,
        data: dataIsoParaDate(data),
        horaInicio: horaParaTime(dto.horaInicio),
        horaFim: horaParaTime(dto.horaFim),
        vagasTotal: dto.vagasTotal,
      })),
      skipDuplicates: true,
    });
    const ignorados = dto.semanas - count;
    return {
      mensagem: count === 1 ? '1 horário criado.' : `${count} horários criados.`,
      criados: count,
      // Datas que já tinham horário nessa hora ou cujo início já passou.
      ignorados,
      datas,
    };
  }

  /**
   * Ajusta as vagas ou ativa/desativa. A linha do horário fica bloqueada durante a
   * alteração para não reduzir as vagas abaixo dos agendamentos feitos ao mesmo tempo.
   * Desativar não cancela quem já agendou: só impede novos agendamentos.
   */
  async atualizar(hemocentroId: string, id: string, dto: AtualizarHorarioDto) {
    return this.prisma.$transaction(async (tx) => {
      const [linha] = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM horario WHERE id = ${id}::uuid AND hemocentro_id = ${hemocentroId}::uuid FOR UPDATE`;
      if (!linha) throw new NotFoundException('Horário não encontrado.');

      const agendados = await tx.agendamento.count({ where: { horarioId: id, ...OCUPA_VAGA } });
      if (dto.vagasTotal !== undefined && dto.vagasTotal < agendados) {
        throw new ConflictException(
          `Já há ${agendados} paciente(s) agendado(s) ou atendido(s) neste horário; as vagas não podem ficar abaixo disso.`,
        );
      }
      const horario = await tx.horario.update({
        where: { id },
        data: { vagasTotal: dto.vagasTotal, ativo: dto.ativo },
        select: SELECAO_HORARIO,
      });
      return {
        mensagem: 'Horário atualizado.',
        horario: { ...apresentarHorario(horario), agendados, vagasRestantes: Math.max(0, horario.vagasTotal - agendados) },
      };
    });
  }

  private async buscar(hemocentroId: string, de: string, ate: string, filtro: Prisma.HorarioWhereInput = {}) {
    const horarios = await this.prisma.horario.findMany({
      where: { hemocentroId, data: { gte: dataIsoParaDate(de), lte: dataIsoParaDate(ate) }, ...filtro },
      select: SELECAO_HORARIO,
      orderBy: [{ data: 'asc' }, { horaInicio: 'asc' }],
    });
    const contagem = await this.prisma.agendamento.groupBy({
      by: ['horarioId'],
      where: { horarioId: { in: horarios.map((h) => h.id) }, ...OCUPA_VAGA },
      _count: { _all: true },
    });
    const agendadosPorHorario = new Map(contagem.map((c) => [c.horarioId, c._count._all]));

    return horarios.map((h) => {
      const agendados = agendadosPorHorario.get(h.id) ?? 0;
      return { ...apresentarHorario(h), agendados, vagasRestantes: Math.max(0, h.vagasTotal - agendados) };
    });
  }

  private periodo({ de, ate }: PeriodoDto) {
    const inicio = de ?? hojeIso();
    const fim = ate ?? somarDias(inicio, DIAS_PADRAO);
    if (fim < inicio) throw new BadRequestException('A data final deve ser igual ou posterior à inicial.');
    if (fim > somarDias(inicio, MAX_DIAS_PERIODO)) {
      throw new BadRequestException(`O período pode ter no máximo ${MAX_DIAS_PERIODO} dias.`);
    }
    return { de: inicio, ate: fim };
  }

  private validarPeriodoDoDia(horaInicio: string, horaFim: string) {
    if (horaFim <= horaInicio) throw new BadRequestException('A hora final deve ser posterior à inicial.');
  }
}
