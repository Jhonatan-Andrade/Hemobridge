import { Injectable } from '@nestjs/common';
import { SIGLAS_TIPOS } from '../common/tipos-sanguineos.js';
import type { NivelNecessidade } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type Periodo, diaDe, resolverPeriodo } from './periodo.js';

/** Escopo dos dados (RN08): um hospital (representante) ou todos (administrador). */
export interface Escopo {
  hospitalId?: string;
}

const NIVEIS: NivelNecessidade[] = ['CRITICO', 'BAIXO', 'ESTAVEL', 'ADEQUADO', 'NAO_INFORMADO'];

/**
 * UC23 – Visualizar Dashboards (RF26). Só dados agregados de doações e
 * necessidades: nenhum conteúdo clínico (consultas, exames, observações).
 */
@Injectable()
export class IndicadoresService {
  constructor(private readonly prisma: PrismaService) {}

  // HEM-51: dashboard do hospital do representante.
  async doHospital(hospitalId: string, de?: string, ate?: string) {
    const periodo = resolverPeriodo(de, ate);
    const escopo = { hospitalId };
    const [hospital, doacoes, necessidades, evolucao] = await Promise.all([
      this.prisma.hospital.findUniqueOrThrow({ where: { id: hospitalId }, select: { id: true, nome: true } }),
      this.doacoesPorTipo(escopo, periodo),
      this.necessidadesAtuais(escopo),
      this.evolucao(escopo, periodo),
    ]);
    return this.montar({ hospital }, periodo, doacoes, necessidades, evolucao);
  }

  // HEM-52: visão agregada de todos os hospitais ativos (UC23 FA01).
  async daPlataforma(de?: string, ate?: string) {
    const periodo = resolverPeriodo(de, ate);
    const [doacoes, necessidades, evolucao, doadoresAprovados, criticosPorEstado, hospitaisAtivos] = await Promise.all([
      this.doacoesPorTipo({}, periodo),
      this.necessidadesAtuais({}),
      this.evolucao({}, periodo),
      this.prisma.paciente.count({ where: { situacao: 'APROVADO', usuario: { status: 'ATIVO' } } }),
      this.criticosPorEstado(),
      this.prisma.hospital.count({ where: { ativo: true } }),
    ]);
    return {
      ...this.montar({}, periodo, doacoes, necessidades, evolucao),
      totalDoadoresAprovados: doadoresAprovados,
      hospitaisAtivos,
      criticosPorEstado,
    };
  }

  /** Doações do período por hospital (relatório consolidado do administrador). */
  async doacoesPorHospital(periodo: Periodo) {
    const linhas = await this.prisma.doacao.groupBy({
      by: ['hospitalId'],
      where: { dataColeta: this.filtroDatas(periodo) },
      _count: { _all: true },
    });
    const hospitais = await this.prisma.hospital.findMany({
      where: { id: { in: linhas.map((l) => l.hospitalId) } },
      select: { id: true, nome: true, cidade: true, estado: true },
    });
    const total = new Map(linhas.map((l) => [l.hospitalId, l._count._all]));
    const criticos = await this.prisma.necessidadeEstoque.groupBy({
      by: ['hospitalId'],
      where: { nivel: 'CRITICO', hospital: { ativo: true } },
      _count: { _all: true },
    });
    const criticosPor = new Map(criticos.map((c) => [c.hospitalId, c._count._all]));
    return hospitais
      .map((h) => ({ ...h, doacoes: total.get(h.id) ?? 0, tiposCriticos: criticosPor.get(h.id) ?? 0 }))
      .sort((a, b) => b.doacoes - a.doacoes || a.nome.localeCompare(b.nome));
  }

  /** Alterações de nível no período (relatório de histórico, RN03). */
  async historico(escopo: Escopo, periodo: Periodo) {
    const registros = await this.prisma.historicoNecessidade.findMany({
      where: {
        alteradoEm: { gte: periodo.inicio, lt: periodo.fim },
        necessidade: { hospitalId: escopo.hospitalId, hospital: escopo.hospitalId ? undefined : { ativo: true } },
      },
      select: {
        nivelAnterior: true,
        nivelNovo: true,
        alteradoEm: true,
        alteradoPor: { select: { nome: true } },
        necessidade: { select: { tipoSanguineo: { select: { sigla: true } }, hospital: { select: { nome: true } } } },
      },
      orderBy: { alteradoEm: 'asc' },
    });
    return registros.map((r) => ({
      alteradoEm: r.alteradoEm,
      hospital: r.necessidade.hospital.nome,
      tipo: r.necessidade.tipoSanguineo.sigla,
      de: r.nivelAnterior,
      para: r.nivelNovo,
      alteradoPor: r.alteradoPor.nome,
    }));
  }

  async doacoesPorTipo(escopo: Escopo, periodo: Periodo) {
    const linhas = await this.prisma.doacao.groupBy({
      by: ['tipoSanguineoId', 'pacienteId'],
      where: { hospitalId: escopo.hospitalId, dataColeta: this.filtroDatas(periodo) },
      _count: { _all: true },
    });
    const tipos = await this.siglas();
    const porTipo = new Map(SIGLAS_TIPOS.map((s) => [s as string, { tipo: s as string, total: 0, vinculadas: 0, avulsas: 0 }]));
    for (const l of linhas) {
      const item = porTipo.get(tipos.get(l.tipoSanguineoId)!)!;
      item.total += l._count._all;
      if (l.pacienteId) item.vinculadas += l._count._all;
      else item.avulsas += l._count._all;
    }
    return [...porTipo.values()];
  }

  private filtroDatas(periodo: Periodo) {
    return { gte: new Date(`${periodo.de}T00:00:00Z`), lte: new Date(`${periodo.ate}T00:00:00Z`) };
  }

  // Situação atual: no hospital, o nível de cada tipo; na plataforma, quantos hospitais em cada nível.
  private async necessidadesAtuais(escopo: Escopo) {
    const registros = await this.prisma.necessidadeEstoque.findMany({
      where: escopo.hospitalId ? { hospitalId: escopo.hospitalId } : { hospital: { ativo: true } },
      select: { nivel: true, atualizadoEm: true, tipoSanguineo: { select: { sigla: true } } },
    });
    return SIGLAS_TIPOS.map((tipo) => {
      const doTipo = registros.filter((r) => r.tipoSanguineo.sigla === tipo);
      const porNivel = Object.fromEntries(NIVEIS.map((n) => [n, doTipo.filter((r) => r.nivel === n).length])) as Record<
        NivelNecessidade,
        number
      >;
      return escopo.hospitalId
        ? { tipo, nivel: doTipo[0]?.nivel ?? 'NAO_INFORMADO', atualizadoEm: doTipo[0]?.atualizadoEm ?? null }
        : { tipo, hospitaisPorNivel: porNivel };
    });
  }

  /**
   * Evolução dos níveis (RN03): reconstrói, dia a dia, quantos tipos estavam em
   * CRITICO no fim de cada dia, a partir do nível atual e do histórico.
   */
  private async evolucao(escopo: Escopo, periodo: Periodo) {
    const necessidades = await this.prisma.necessidadeEstoque.findMany({
      where: escopo.hospitalId ? { hospitalId: escopo.hospitalId } : { hospital: { ativo: true } },
      select: { id: true, nivel: true, tipoSanguineo: { select: { sigla: true } } },
    });
    const alteracoes = await this.prisma.historicoNecessidade.findMany({
      where: { necessidadeId: { in: necessidades.map((n) => n.id) }, alteradoEm: { gte: periodo.inicio } },
      select: { necessidadeId: true, nivelAnterior: true, nivelNovo: true, alteradoEm: true },
      orderBy: { alteradoEm: 'asc' },
    });

    // Estado no início do período: o nível anterior à primeira alteração depois dele.
    const estado = new Map(necessidades.map((n) => [n.id, n.nivel]));
    const vistos = new Set<string>();
    for (const a of alteracoes) {
      if (!vistos.has(a.necessidadeId)) {
        estado.set(a.necessidadeId, a.nivelAnterior);
        vistos.add(a.necessidadeId);
      }
    }

    const tipoDe = new Map(necessidades.map((n) => [n.id, n.tipoSanguineo.sigla]));
    const criticosPorDia: { data: string; tiposCriticos: number; alteracoes: number }[] = [];
    let i = 0;
    for (const dia of periodo.dias) {
      let alteradasNoDia = 0;
      while (i < alteracoes.length && diaDe(alteracoes[i].alteradoEm) <= dia) {
        estado.set(alteracoes[i].necessidadeId, alteracoes[i].nivelNovo);
        alteradasNoDia++;
        i++;
      }
      criticosPorDia.push({
        data: dia,
        tiposCriticos: [...estado.values()].filter((n) => n === 'CRITICO').length,
        alteracoes: alteradasNoDia,
      });
    }

    // No hospital, também a linha do tempo de cada tipo alterado no período.
    const porTipo = escopo.hospitalId
      ? SIGLAS_TIPOS.map((tipo) => ({
          tipo,
          alteracoes: alteracoes
            .filter((a) => tipoDe.get(a.necessidadeId) === tipo && a.alteradoEm < periodo.fim)
            .map((a) => ({ em: a.alteradoEm, de: a.nivelAnterior, para: a.nivelNovo })),
        })).filter((t) => t.alteracoes.length)
      : undefined;

    const totalAlteracoes = criticosPorDia.reduce((s, d) => s + d.alteracoes, 0);
    return { criticosPorDia, porTipo, totalAlteracoes };
  }

  private async criticosPorEstado() {
    const linhas = await this.prisma.$queryRaw<{ estado: string; quantidade: number; hospitais: number }[]>`
      SELECT h.estado, COUNT(*)::int AS quantidade, COUNT(DISTINCT h.id)::int AS hospitais
        FROM necessidade_estoque n
        JOIN hospital h ON h.id = n.hospital_id
       WHERE h.ativo AND n.nivel = 'CRITICO'
       GROUP BY h.estado
       ORDER BY quantidade DESC, h.estado`;
    return linhas;
  }

  private async siglas() {
    const tipos = await this.prisma.tipoSanguineo.findMany({ select: { id: true, sigla: true } });
    return new Map(tipos.map((t) => [t.id, t.sigla]));
  }

  private montar(
    cabecalho: { hospital?: { id: string; nome: string } },
    periodo: Periodo,
    doacoes: Awaited<ReturnType<IndicadoresService['doacoesPorTipo']>>,
    necessidades: Awaited<ReturnType<IndicadoresService['necessidadesAtuais']>>,
    evolucao: Awaited<ReturnType<IndicadoresService['evolucao']>>,
  ) {
    const totalDoacoes = doacoes.reduce((s, d) => s + d.total, 0);
    // Situação atual (não a do último dia do período, que pode estar no passado).
    const tiposCriticos = necessidades.reduce(
      (soma, n) => soma + ('nivel' in n ? Number(n.nivel === 'CRITICO') : n.hospitaisPorNivel.CRITICO),
      0,
    );
    const semDados = totalDoacoes === 0 && evolucao.totalAlteracoes === 0;
    return {
      ...cabecalho,
      periodo: { de: periodo.de, ate: periodo.ate },
      totalDoacoes,
      doacoesPorTipo: doacoes,
      necessidadesAtuais: necessidades,
      tiposCriticos,
      evolucao: { criticosPorDia: evolucao.criticosPorDia, porTipo: evolucao.porTipo },
      semDados,
      // FE01
      mensagem: semDados ? 'Não há dados suficientes para o período selecionado.' : undefined,
    };
  }
}
