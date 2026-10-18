import { Injectable, Logger } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { SIGLAS_TIPOS } from '../common/tipos-sanguineos.js';
import { hojeIso } from '../common/data.js';
import { dataParaIso, estimarElegibilidade } from '../common/elegibilidade.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificacoesService, type NovaNotificacao } from './notificacoes.service.js';

// RN20: no máximo uma notificação por doador e por banco a cada 7 dias.
export const JANELA_NOTIFICACAO_DIAS = 7;

export interface ResultadoNotificacaoCritica {
  doadoresNotificados: number;
  /** Doadores compatíveis do estado que ficaram de fora por elegibilidade (RN17). */
  inelegiveis: number;
  /** Já notificados por este banco nos últimos 7 dias (RN20). */
  jaNotificadosNaJanela: number;
}

/**
 * UC19 – Notificar Doadores Compatíveis (RF25), executado quando um ou mais
 * tipos passam a CRITICO em UC18.
 */
@Injectable()
export class NecessidadeCriticaService {
  private readonly logger = new Logger(NecessidadeCriticaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificacoesService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async notificarDoadores(
    hospitalId: string,
    tiposCriticos: string[],
    agora: Date = new Date(),
  ): Promise<ResultadoNotificacaoCritica> {
    const vazio = { doadoresNotificados: 0, inelegiveis: 0, jaNotificadosNaJanela: 0 };
    if (!tiposCriticos.length) return vazio;

    const hospital = await this.prisma.hospital.findUniqueOrThrow({
      where: { id: hospitalId },
      select: {
        nome: true,
        endereco: true,
        cidade: true,
        estado: true,
        ativo: true,
        necessidades: {
          where: { tipoSanguineo: { sigla: { in: tiposCriticos } }, nivel: 'CRITICO' },
          select: { id: true, tipoSanguineo: { select: { sigla: true } } },
        },
      },
    });
    if (!hospital.ativo || !hospital.necessidades.length) return vazio;

    const necessidadePorTipo = new Map(hospital.necessidades.map((n) => [n.tipoSanguineo.sigla, n.id]));
    const criticos = [...necessidadePorTipo.keys()];
    const inicioJanela = new Date(agora.getTime() - JANELA_NOTIFICACAO_DIAS * 86_400_000);

    // Passo 2: doadores ativos do mesmo estado, com tipo que pode doar para um tipo crítico (RN05).
    const filtroCompativeis = {
      situacao: 'APROVADO' as const,
      estado: hospital.estado,
      usuario: { status: 'ATIVO' as const },
      tipoSanguineo: { doaPara: { some: { tipoReceptor: { sigla: { in: criticos } } } } },
    };
    const [candidatos, compativeisTotal] = await Promise.all([
      this.prisma.paciente.findMany({
        where: {
          ...filtroCompativeis,
          // Passo 3 / RN20: exclui quem já foi avisado por este banco na janela.
          usuario: {
            status: 'ATIVO',
            notificacoes: { none: { necessidade: { hospitalId }, enviadaEm: { gt: inicioJanela } } },
          },
        },
        select: {
          usuarioId: true,
          dataNascimento: true,
          sexo: true,
          pesoKg: true,
          doacoes: { select: { dataColeta: true } },
          tipoSanguineo: {
            select: { sigla: true, doaPara: { select: { tipoReceptor: { select: { sigla: true } } } } },
          },
        },
      }),
      this.prisma.paciente.count({ where: filtroCompativeis }),
    ]);

    // RN17: estimativa com o peso do cadastro (o peso aferido só existe na doação).
    const hoje = hojeIso(agora);
    const elegiveis = candidatos.filter(
      (c) =>
        estimarElegibilidade(
          {
            dataNascimento: dataParaIso(c.dataNascimento),
            sexo: c.sexo,
            pesoKg: c.pesoKg.toNumber(),
            doacoes: c.doacoes.map((d) => dataParaIso(d.dataColeta)),
          },
          hoje,
        ).elegivel,
    );

    const resultado = {
      doadoresNotificados: elegiveis.length,
      inelegiveis: candidatos.length - elegiveis.length,
      jaNotificadosNaJanela: compativeisTotal - candidatos.length,
    };

    // FE01: sem doador apto, registra a ocorrência.
    if (!elegiveis.length) {
      await this.auditoria.registrar({
        acao: 'NOTIFICACAO_CRITICA_SEM_DESTINATARIOS',
        entidade: 'hospital',
        entidadeId: hospitalId,
        detalhes: { tipos: criticos, ...resultado },
      });
      return resultado;
    }

    // Passo 4: uma notificação por doador, listando os tipos críticos que ele pode suprir.
    const avisos: NovaNotificacao[] = elegiveis.map((c) => {
      const supridos = ordenar(
        c.tipoSanguineo!.doaPara.map((d) => d.tipoReceptor.sigla).filter((s) => necessidadePorTipo.has(s)),
      );
      // Prioriza o próprio tipo do doador como necessidade de referência.
      const referencia = supridos.includes(c.tipoSanguineo!.sigla) ? c.tipoSanguineo!.sigla : supridos[0];
      return {
        usuarioId: c.usuarioId,
        necessidadeId: necessidadePorTipo.get(referencia)!,
        titulo: `Necessidade crítica de sangue ${supridos.join(', ')}`,
        mensagem:
          `O banco de sangue ${hospital.nome} registrou necessidade CRÍTICA de sangue ${supridos.join(', ')}, ` +
          `compatível com o seu tipo (${c.tipoSanguineo!.sigla}). ` +
          `Endereço: ${hospital.endereco}, ${hospital.cidade}/${hospital.estado}. ` +
          'A aptidão final é confirmada pela triagem do hemocentro.',
        link: `/bancos-de-sangue/${hospitalId}`,
        email: true,
      };
    });

    try {
      await this.notificacoes.notificar(avisos);
    } catch (erro) {
      this.logger.error(`Falha ao registrar notificações críticas do hospital ${hospitalId}: ${String(erro)}`);
      throw erro;
    }

    // Passo 5
    await this.auditoria.registrar({
      acao: 'NOTIFICACAO_CRITICA',
      entidade: 'hospital',
      entidadeId: hospitalId,
      detalhes: { tipos: criticos, ...resultado },
    });
    return resultado;
  }
}

const ordenar = (siglas: string[]) =>
  [...new Set(siglas)].sort(
    (a, b) => SIGLAS_TIPOS.indexOf(a as never) - SIGLAS_TIPOS.indexOf(b as never),
  );
