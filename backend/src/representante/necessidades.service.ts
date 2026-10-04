import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AtualizarNecessidadesDto,
  HistoricoNecessidadesDto,
} from './dto/necessidade.dto.js';

// UC18 – Atualizar Necessidades de Estoque (RF17). Sempre no hospital do representante (RN08).
@Injectable()
export class NecessidadesService {
  constructor(private readonly prisma: PrismaService) {}

  // Passo 2: os oito tipos com nível atual e data da última atualização.
  async listar(hospitalId: string) {
    const [hospital, necessidades] = await Promise.all([
      this.prisma.hospital.findUniqueOrThrow({
        where: { id: hospitalId },
        select: { id: true, nome: true },
      }),
      this.prisma.necessidadeEstoque.findMany({
        where: { hospitalId },
        select: {
          nivel: true,
          atualizadoEm: true,
          tipoSanguineo: { select: { sigla: true } },
          atualizadoPor: { select: { nome: true } },
        },
        orderBy: { tipoSanguineoId: 'asc' },
      }),
    ]);

    const datas = necessidades.flatMap((n) => (n.atualizadoEm ? [n.atualizadoEm.getTime()] : []));
    return {
      hospital,
      ultimaAtualizacao: datas.length ? new Date(Math.max(...datas)).toISOString() : null,
      necessidades: necessidades.map((n) => ({
        tipo: n.tipoSanguineo.sigla,
        nivel: n.nivel,
        atualizadoEm: n.atualizadoEm,
        atualizadoPor: n.atualizadoPor?.nome ?? null,
      })),
    };
  }

  // Passos 3–6. O histórico (RN03) é gravado pelo trigger do banco.
  async atualizar(hospitalId: string, representanteId: string, { niveis }: AtualizarNecessidadesDto) {
    const tipos = niveis.map((n) => n.tipo);
    if (new Set(tipos).size !== tipos.length) {
      throw new BadRequestException('Cada tipo sanguíneo deve aparecer uma única vez.');
    }

    const atuais = await this.prisma.necessidadeEstoque.findMany({
      where: { hospitalId, tipoSanguineo: { sigla: { in: tipos } } },
      select: { id: true, nivel: true, tipoSanguineo: { select: { sigla: true } } },
    });
    const porTipo = new Map(atuais.map((a) => [a.tipoSanguineo.sigla, a]));

    const alteracoes = niveis.flatMap(({ tipo, nivel }) => {
      const atual = porTipo.get(tipo);
      return atual && atual.nivel !== nivel ? [{ id: atual.id, tipo, de: atual.nivel, para: nivel }] : [];
    });

    // FA01
    if (!alteracoes.length) {
      return {
        mensagem: 'Não há alterações a salvar.',
        alteracoes: [],
        passaramACritico: [],
        ...(await this.listar(hospitalId)),
      };
    }

    const agora = new Date();
    await this.prisma.$transaction(
      alteracoes.map(({ id, para }) =>
        this.prisma.necessidadeEstoque.update({
          where: { id },
          data: { nivel: para, atualizadoPorId: representanteId, atualizadoEm: agora },
        }),
      ),
    );

    // UC18 passo 5: ponto de extensão "Nível crítico".
    // TODO(etapa 10): disparar UC19 (notificar doadores compatíveis) para estes tipos.
    const passaramACritico = alteracoes.filter((a) => a.para === 'CRITICO').map((a) => a.tipo);

    return {
      mensagem: 'Necessidades atualizadas.',
      alteracoes: alteracoes.map(({ tipo, de, para }) => ({ tipo, de, para })),
      passaramACritico,
      ...(await this.listar(hospitalId)),
    };
  }

  // RN03: evolução das necessidades do próprio hospital.
  async historico(hospitalId: string, { tipo, de, ate, pagina, tamanhoPagina }: HistoricoNecessidadesDto) {
    const where = {
      necessidade: { hospitalId, ...(tipo ? { tipoSanguineo: { sigla: tipo } } : {}) },
      alteradoEm: { gte: de ? new Date(de) : undefined, lte: ate ? new Date(ate) : undefined },
    };

    const [registros, total] = await Promise.all([
      this.prisma.historicoNecessidade.findMany({
        where,
        select: {
          nivelAnterior: true,
          nivelNovo: true,
          alteradoEm: true,
          alteradoPor: { select: { nome: true } },
          necessidade: { select: { tipoSanguineo: { select: { sigla: true } } } },
        },
        orderBy: { alteradoEm: 'desc' },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      this.prisma.historicoNecessidade.count({ where }),
    ]);

    return {
      itens: registros.map((r) => ({
        tipo: r.necessidade.tipoSanguineo.sigla,
        de: r.nivelAnterior,
        para: r.nivelNovo,
        alteradoEm: r.alteradoEm,
        alteradoPor: r.alteradoPor.nome,
      })),
      total,
      pagina,
      tamanhoPagina,
    };
  }
}
