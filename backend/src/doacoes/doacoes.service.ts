import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ACOES_AUDITORIA, AuditoriaService } from '../auditoria/auditoria.service.js';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { calcularIdade, dataIsoParaDate, hojeIso, somarDias } from '../common/data.js';
import { apresentarHorario, dateParaIso, timeParaHora } from '../common/horario.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { apresentarClinica, examesAlterados, SELECAO_CLINICA, SELECAO_EXAMES, situacaoExames } from './apresentacao.js';
import { AtendimentosDto, RegistrarDoacaoDto, RegistrarExamesDto } from './dto/doacao.dto.js';

const MENSAGEM_EXAMES_LANCADOS = 'Os exames desta doação já foram lançados.';

const SELECAO_DOACAO = {
  id: true,
  compareceu: true,
  doou: true,
  motivoNaoDoacao: true,
  observacoes: true,
  registradoEm: true,
  tipoSanguineo: { select: { sigla: true } },
  ...SELECAO_CLINICA,
} satisfies Prisma.DoacaoSelect;

type DoacaoSelecionada = Prisma.DoacaoGetPayload<{ select: typeof SELECAO_DOACAO }>;

export function apresentarDoacao(d: DoacaoSelecionada) {
  return {
    id: d.id,
    compareceu: d.compareceu,
    doou: d.doou,
    motivoNaoDoacao: d.motivoNaoDoacao,
    observacoes: d.observacoes,
    registradoEm: d.registradoEm,
    tipoSanguineo: d.tipoSanguineo?.sigla ?? null,
    ...apresentarClinica(d),
  };
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

  /**
   * Atendimentos registrados no hemocentro do membro (nunca de outro), do mais recente ao mais
   * antigo. Sem período informado, mostra os últimos 90 dias.
   */
  async atendimentos(membro: MembroDaEquipe, { de, ate, pagina, tamanhoPagina }: AtendimentosDto) {
    const fim = ate ?? hojeIso();
    const inicio = de ?? somarDias(fim, -90);
    if (inicio > fim) throw new BadRequestException('A data inicial deve ser anterior à final.');

    const where = {
      hemocentroId: membro.hemocentro.id,
      agendamento: { horario: { data: { gte: dataIsoParaDate(inicio), lte: dataIsoParaDate(fim) } } },
    } satisfies Prisma.DoacaoWhereInput;

    const [doacoes, total, doaram, ausentes] = await this.prisma.$transaction([
      this.prisma.doacao.findMany({
        where,
        select: {
          ...SELECAO_DOACAO,
          paciente: { select: { usuarioId: true, usuario: { select: { nome: true } } } },
          medico: { select: { usuario: { select: { nome: true } } } },
          agendamento: { select: { horario: { select: { data: true, horaInicio: true, horaFim: true } } } },
          exames: { select: SELECAO_EXAMES },
        },
        orderBy: [{ agendamento: { horario: { data: 'desc' } } }, { registradoEm: 'desc' }],
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      this.prisma.doacao.count({ where }),
      this.prisma.doacao.count({ where: { ...where, doou: true } }),
      this.prisma.doacao.count({ where: { ...where, compareceu: false } }),
    ]);

    return {
      de: inicio,
      ate: fim,
      resumo: { total, doaram, naoDoaram: total - doaram - ausentes, ausentes },
      itens: doacoes.map(({ paciente, medico, agendamento: { horario }, exames, ...d }) => ({
        ...apresentarDoacao(d),
        // A situação dos exames fica com o médico; o Admin do hemocentro não a vê.
        ...(membro.papel === 'MEDICO' && { situacaoExames: situacaoExames(d.doou, exames) }),
        data: dateParaIso(horario.data),
        horaInicio: timeParaHora(horario.horaInicio),
        horaFim: timeParaHora(horario.horaFim),
        paciente: { id: paciente.usuarioId, nome: paciente.usuario.nome },
        medico: medico.usuario.nome,
      })),
      total,
      pagina,
      tamanhoPagina,
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
    const dataAtendimento = dateParaIso(agendamento.horario.data);
    if (dataAtendimento > hojeIso()) {
      throw new BadRequestException('A doação só pode ser registrada a partir do dia do agendamento.');
    }
    if (dto.aptoAPartirDe && dto.aptoAPartirDe <= dataAtendimento) {
      throw new BadRequestException('A data em que o paciente volta a ser apto deve ser posterior ao atendimento.');
    }

    const tipo = dto.tipoSanguineo
      ? await this.prisma.tipoSanguineo.findUniqueOrThrow({ where: { sigla: dto.tipoSanguineo }, select: { id: true } })
      : null;

    const { doacao, cancelados } = await this.comBolsaUnica(() =>
      this.prisma.$transaction(async (tx) => {
        // O filtro por status impede dois registros simultâneos para o mesmo agendamento.
        const { count } = await tx.agendamento.updateMany({
          where: { id: agendamento.id, status: 'AGENDADO' },
          data: { status: dto.compareceu ? 'CONCLUIDO' : 'AUSENTE' },
        });
        if (!count) throw new ConflictException('A doação deste agendamento já foi registrada.');

        const { afericoes, coleta, triagem } = dto;
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
            pesoKg: afericoes?.pesoKg ?? null,
            alturaCm: afericoes?.alturaCm ?? null,
            pressaoSistolica: afericoes?.pressaoSistolica ?? null,
            pressaoDiastolica: afericoes?.pressaoDiastolica ?? null,
            pulso: afericoes?.pulso ?? null,
            temperatura: afericoes?.temperatura ?? null,
            hemoglobina: afericoes?.hemoglobina ?? null,
            hematocrito: afericoes?.hematocrito ?? null,
            volumeMl: coleta?.volumeMl ?? null,
            numeroBolsa: coleta?.numeroBolsa ?? null,
            reacoes: coleta?.reacoes || null,
            aptidao: dto.aptidao ?? null,
            aptoAPartirDe: dto.aptoAPartirDe ? dataIsoParaDate(dto.aptoAPartirDe) : null,
            triagem: triagem
              ? {
                  create: {
                    doencas: triagem.doencas || null,
                    cirurgias: triagem.cirurgias || null,
                    transfusaoAnterior: triagem.transfusaoAnterior,
                    alergias: triagem.alergias || null,
                    gestacoes: triagem.gestacoes || null,
                    medicamentos: triagem.medicamentos || null,
                    vacinasRecentes: triagem.vacinasRecentes || null,
                    tatuagemOuPiercingRecente: triagem.tatuagemOuPiercingRecente,
                    usoDeDrogas: triagem.usoDeDrogas,
                    comportamentoSexualDeRisco: triagem.comportamentoSexualDeRisco,
                    viagemAreaDeRisco: triagem.viagemAreaDeRisco || null,
                    observacoes: triagem.observacoes || null,
                  },
                }
              : undefined,
          },
          select: SELECAO_DOACAO,
        });

        // Inapto: os agendamentos futuros que caem na inaptidão deixam de valer.
        const inapto = dto.aptidao === 'INAPTO_DEFINITIVO' || dto.aptidao === 'INAPTO_TEMPORARIO';
        const { count: cancelados } = inapto
          ? await tx.agendamento.updateMany({
              where: {
                pacienteId: agendamento.pacienteId,
                status: 'AGENDADO',
                id: { not: agendamento.id },
                horario: {
                  data: {
                    gte: dataIsoParaDate(hojeIso()),
                    ...(dto.aptoAPartirDe && { lt: dataIsoParaDate(dto.aptoAPartirDe) }),
                  },
                },
              },
              data: { status: 'CANCELADO', canceladoEm: new Date() },
            })
          : { count: 0 };

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
        return { doacao: criada, cancelados };
      }),
    );

    const mensagem = [
      dto.compareceu ? 'Doação registrada.' : 'Ausência registrada.',
      cancelados ? `${cancelados} agendamento(s) futuro(s) do paciente foram cancelados pela inaptidão.` : null,
    ]
      .filter(Boolean)
      .join(' ');
    return { mensagem, doacao: apresentarDoacao(doacao) };
  }

  /**
   * Registro completo de uma doação do próprio hemocentro, com a triagem e os exames.
   * Só o médico do hemocentro que atendeu lê esses dados; a leitura é auditada.
   */
  async detalhe(membro: MembroDaEquipe, id: string) {
    const hemocentroId = membro.hemocentro.id;
    const doacao = await this.prisma.doacao.findFirst({
      where: { id, hemocentroId },
      select: {
        ...SELECAO_DOACAO,
        numeroBolsa: true,
        paciente: { select: { usuarioId: true, usuario: { select: { nome: true } } } },
        medico: { select: { usuario: { select: { nome: true } } } },
        agendamento: { select: { horario: { select: { data: true, horaInicio: true, horaFim: true } } } },
        triagem: { omit: { doacaoId: true } },
        exames: {
          select: {
            ...SELECAO_EXAMES,
            observacoes: true,
            registradoEm: true,
            registradoPor: { select: { usuario: { select: { nome: true } } } },
          },
        },
      },
    });
    if (!doacao) throw new NotFoundException('Doação não encontrada.');

    await this.auditoria.registrar({
      usuarioId: membro.id,
      acao: ACOES_AUDITORIA.VER_DADOS_CLINICOS,
      entidade: 'doacao',
      entidadeId: id,
      hemocentroId,
    });

    const { paciente, medico, agendamento, triagem, exames, numeroBolsa, ...d } = doacao;
    const { horario } = agendamento;
    return {
      ...apresentarDoacao(d),
      numeroBolsa,
      data: dateParaIso(horario.data),
      horaInicio: timeParaHora(horario.horaInicio),
      horaFim: timeParaHora(horario.horaFim),
      paciente: { id: paciente.usuarioId, nome: paciente.usuario.nome },
      medico: medico.usuario.nome,
      triagem,
      situacaoExames: situacaoExames(d.doou, exames),
      exames: exames && {
        pesquisaAnticorpos: exames.pesquisaAnticorpos,
        hiv: exames.hiv,
        hepatiteB: exames.hepatiteB,
        hepatiteC: exames.hepatiteC,
        sifilis: exames.sifilis,
        chagas: exames.chagas,
        htlv: exames.htlv,
        malaria: exames.malaria,
        observacoes: exames.observacoes,
        registradoEm: exames.registradoEm,
        registradoPor: exames.registradoPor.usuario.nome,
      },
    };
  }

  /** Exames da amostra, uma única vez por doação, pelo médico do hemocentro que coletou. */
  async registrarExames(membro: MembroDaEquipe, id: string, dto: RegistrarExamesDto) {
    const hemocentroId = membro.hemocentro.id;
    const doacao = await this.prisma.doacao.findFirst({
      where: { id, hemocentroId },
      select: { id: true, doou: true, exames: { select: { doacaoId: true } } },
    });
    if (!doacao) throw new NotFoundException('Doação não encontrada.');
    if (!doacao.doou) throw new BadRequestException('Só há exames quando houve coleta.');
    if (doacao.exames) throw new ConflictException(MENSAGEM_EXAMES_LANCADOS);

    let exames;
    try {
      exames = await this.prisma.$transaction(async (tx) => {
        const criados = await tx.exameDoacao.create({
          data: {
            doacaoId: id,
            pesquisaAnticorpos: dto.pesquisaAnticorpos,
            hiv: dto.hiv,
            hepatiteB: dto.hepatiteB,
            hepatiteC: dto.hepatiteC,
            sifilis: dto.sifilis,
            chagas: dto.chagas,
            htlv: dto.htlv,
            malaria: dto.malaria ?? null,
            observacoes: dto.observacoes || null,
            registradoPorId: membro.id,
          },
          select: SELECAO_EXAMES,
        });
        await this.auditoria.registrar(
          { usuarioId: membro.id, acao: ACOES_AUDITORIA.REGISTRAR_EXAMES, entidade: 'doacao', entidadeId: id, hemocentroId },
          tx,
        );
        return criados;
      });
    } catch (e) {
      // Dois lançamentos simultâneos: a chave primária barra o segundo.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(MENSAGEM_EXAMES_LANCADOS);
      }
      throw e;
    }

    const alterados = examesAlterados(exames);
    return {
      mensagem: alterados
        ? 'Exames lançados. Há resultado alterado: o painel do paciente avisa que o hemocentro vai entrar em contato de forma reservada.'
        : 'Exames lançados.',
      alterados,
    };
  }

  /** O número da bolsa não se repete no hemocentro (índice único). */
  private async comBolsaUnica<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Já existe uma bolsa com este número neste hemocentro.');
      }
      throw e;
    }
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

  private validarRegistro(dto: RegistrarDoacaoDto) {
    const { compareceu, doou, tipoSanguineo, motivoNaoDoacao, triagem, afericoes: a, coleta, aptidao, aptoAPartirDe } = dto;
    const recusar = (mensagem: string) => {
      throw new BadRequestException(mensagem);
    };

    if (!compareceu) {
      if (doou || tipoSanguineo) recusar('Paciente ausente não tem doação nem tipo sanguíneo registrados.');
      if (triagem || a || coleta || aptidao || aptoAPartirDe) {
        recusar('Paciente ausente não tem triagem, aferições, coleta nem aptidão registradas.');
      }
      return;
    }

    if (!triagem) recusar('Registre a triagem clínica de quem compareceu.');
    if (!aptidao) recusar('Informe se o paciente está apto, inapto temporário ou inapto definitivo.');
    if ((aptidao === 'INAPTO_TEMPORARIO') !== Boolean(aptoAPartirDe)) {
      recusar(
        aptoAPartirDe
          ? 'A data de volta só se aplica a inapto temporário.'
          : 'Informe a partir de quando o paciente inapto temporário pode voltar a doar.',
      );
    }
    if (a?.pressaoSistolica !== undefined && a.pressaoDiastolica !== undefined && a.pressaoSistolica <= a.pressaoDiastolica) {
      recusar('A pressão sistólica deve ser maior que a diastólica.');
    }

    if (doou) {
      if (aptidao !== 'APTO') recusar('Quem doou foi considerado apto.');
      const completas =
        a?.pesoKg !== undefined &&
        a.pressaoSistolica !== undefined &&
        a.pressaoDiastolica !== undefined &&
        a.pulso !== undefined &&
        a.temperatura !== undefined &&
        (a.hemoglobina !== undefined || a.hematocrito !== undefined);
      if (!completas) recusar('Quando há doação, informe peso, pressão, pulso, temperatura e hemoglobina ou hematócrito.');
      if (!coleta) recusar('Informe o volume coletado e o número da bolsa.');
    } else {
      if (coleta) recusar('Sem doação, não há dados de coleta.');
      if (!motivoNaoDoacao) recusar('Informe o motivo de o paciente não ter doado.');
    }
  }
}
