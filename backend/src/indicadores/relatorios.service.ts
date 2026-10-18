import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type Escopo, IndicadoresService } from './indicadores.service.js';
import { type ConteudoRelatorio, gerarPdf } from './pdf.js';
import { resolverPeriodo } from './periodo.js';

// UC24 passo 2
export const TIPOS_RELATORIO = ['doacoes-por-tipo', 'historico-necessidades', 'consolidado-por-hospital'] as const;
export type TipoRelatorio = (typeof TIPOS_RELATORIO)[number];

const TITULOS: Record<TipoRelatorio, string> = {
  'doacoes-por-tipo': 'Doações por tipo sanguíneo',
  'historico-necessidades': 'Histórico de necessidades',
  'consolidado-por-hospital': 'Consolidado por hospital',
};

const NIVEL: Record<string, string> = {
  CRITICO: 'Crítico',
  BAIXO: 'Baixo',
  ESTAVEL: 'Estável',
  ADEQUADO: 'Adequado',
  NAO_INFORMADO: 'Não informado',
};

const fmtData = (iso: string) => iso.split('-').reverse().join('/');
const fmtInstante = (d: Date) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(d);

export interface Emissor {
  id: string;
  nome: string;
}

// UC24 – Emitir Relatórios (RF26).
@Injectable()
export class RelatoriosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indicadores: IndicadoresService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async emitir(tipo: TipoRelatorio, escopo: Escopo, emissor: Emissor, de: string, ate: string, agora = new Date()) {
    // Passo 2: o consolidado é exclusivo do Administrador.
    if (tipo === 'consolidado-por-hospital' && escopo.hospitalId) {
      throw new ForbiddenException('O relatório consolidado por hospital é exclusivo do administrador.');
    }
    const periodo = resolverPeriodo(de, ate); // FE01

    const nomeEscopo = escopo.hospitalId
      ? (await this.prisma.hospital.findUniqueOrThrow({ where: { id: escopo.hospitalId }, select: { nome: true } })).nome
      : 'Todos os hospitais';

    const secoes = await this.secoes(tipo, escopo, periodo);
    // FE02
    if (!secoes) throw new UnprocessableEntityException('Não há dados para o período informado.');

    const conteudo: ConteudoRelatorio = {
      titulo: TITULOS[tipo],
      escopo: nomeEscopo,
      periodo: `${fmtData(periodo.de)} a ${fmtData(periodo.ate)}`,
      emitidoEm: fmtInstante(agora),
      responsavel: emissor.nome,
      secoes,
    };
    const pdf = await gerarPdf(conteudo);

    await this.auditoria.registrar({
      usuarioId: emissor.id,
      acao: 'EMITIR_RELATORIO',
      entidade: 'relatorio',
      entidadeId: tipo,
      detalhes: { de: periodo.de, ate: periodo.ate, hospitalId: escopo.hospitalId ?? null },
    });

    return { pdf, nomeArquivo: `hemobridge-${tipo}-${periodo.de}-a-${periodo.ate}.pdf` };
  }

  private async secoes(tipo: TipoRelatorio, escopo: Escopo, periodo: ReturnType<typeof resolverPeriodo>) {
    if (tipo === 'doacoes-por-tipo') {
      const linhas = await this.indicadores.doacoesPorTipo(escopo, periodo);
      const total = linhas.reduce((s, l) => s + l.total, 0);
      if (!total) return null;
      return [
        {
          colunas: [
            { titulo: 'Tipo sanguíneo', largura: 2 },
            { titulo: 'Vinculadas', largura: 1, alinhar: 'right' as const },
            { titulo: 'Avulsas', largura: 1, alinhar: 'right' as const },
            { titulo: 'Total', largura: 1, alinhar: 'right' as const },
          ],
          linhas: [
            ...linhas.map((l) => [l.tipo, String(l.vinculadas), String(l.avulsas), String(l.total)]),
            [
              'Total',
              String(linhas.reduce((s, l) => s + l.vinculadas, 0)),
              String(linhas.reduce((s, l) => s + l.avulsas, 0)),
              String(total),
            ],
          ],
          rodape:
            'Doação avulsa: pessoa sem cadastro aprovado na plataforma (registro apenas estatístico). ' +
            'O registro de doação não altera o nível de necessidade (RN11).',
        },
      ];
    }

    if (tipo === 'historico-necessidades') {
      const historico = await this.indicadores.historico(escopo, periodo);
      if (!historico.length) return null;
      const comHospital = !escopo.hospitalId;
      return [
        {
          colunas: [
            { titulo: 'Data/hora', largura: 2 },
            ...(comHospital ? [{ titulo: 'Hospital', largura: 3 }] : []),
            { titulo: 'Tipo', largura: 1 },
            { titulo: 'De', largura: 1.6 },
            { titulo: 'Para', largura: 1.6 },
            { titulo: 'Responsável', largura: 2.5 },
          ],
          linhas: historico.map((h) => [
            fmtInstante(h.alteradoEm),
            ...(comHospital ? [h.hospital] : []),
            h.tipo,
            NIVEL[h.de],
            NIVEL[h.para],
            h.alteradoPor,
          ]),
          rodape: `${historico.length} alteração(ões) de nível no período (RN03).`,
        },
      ];
    }

    const hospitais = await this.indicadores.doacoesPorHospital(periodo);
    if (!hospitais.length) return null;
    return [
      {
        colunas: [
          { titulo: 'Hospital', largura: 4 },
          { titulo: 'Cidade/UF', largura: 2.5 },
          { titulo: 'Doações', largura: 1, alinhar: 'right' as const },
          { titulo: 'Tipos críticos hoje', largura: 1.5, alinhar: 'right' as const },
        ],
        linhas: hospitais.map((h) => [h.nome, `${h.cidade}/${h.estado}`, String(h.doacoes), String(h.tiposCriticos)]),
        rodape: 'Hospitais com doação registrada no período.',
      },
    ];
  }
}
