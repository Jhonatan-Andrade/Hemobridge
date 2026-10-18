import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ArmazenamentoService } from '../armazenamento/armazenamento.service.js';
import { MENSAGEM_ARQUIVO_INVALIDO, validarArquivoExame } from '../armazenamento/arquivo-exame.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SolicitarExamesDto } from './dto/exame.dto.js';

/** Arquivo recebido pelo multer (memória). */
export interface ArquivoRecebido {
  originalname: string;
  buffer: Buffer;
  size: number;
}

export interface ArquivoParaDownload {
  conteudo: Buffer;
  nomeOriginal: string;
  mimeType: string;
}

@Injectable()
export class ExamesService {
  private readonly logger = new Logger(ExamesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly armazenamento: ArmazenamentoService,
    private readonly notificacoes: NotificacoesService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------------------------------------------------------------------------
  // UC15 – Solicitar Exames (RF06), pelo médico da consulta
  // ---------------------------------------------------------------------------

  /**
   * Registra a solicitação, passa o paciente a AGUARDANDO_EXAME (RN10) e o
   * notifica. Também usado pelo registro de atendimento (UC14, ponto de extensão).
   */
  async solicitar(medicoId: string, consultaId: string, { exames, orientacoes }: SolicitarExamesDto, agora = new Date()) {
    const lista = exames.map((e) => e.trim()).filter(Boolean);
    // FE01
    if (!lista.length) throw new BadRequestException('Informe ao menos um exame.');

    const consulta = await this.prisma.consulta.findFirst({
      where: { id: consultaId, medicoId },
      select: {
        status: true,
        pacienteId: true,
        disponibilidade: { select: { inicio: true } },
        paciente: { select: { situacao: true } },
      },
    });
    if (!consulta) throw new NotFoundException('Consulta não encontrada.');
    // "Durante ou após a consulta": o atendimento já começou ou foi registrado como realizado.
    const emAndamento = consulta.status === 'AGENDADA' && consulta.disponibilidade.inicio <= agora;
    if (consulta.status !== 'REALIZADA' && !emAndamento) {
      throw new UnprocessableEntityException('Só é possível solicitar exames durante ou após a consulta.');
    }
    if (consulta.paciente.situacao === 'APROVADO') {
      throw new UnprocessableEntityException('O paciente já foi aprovado como doador.');
    }

    const solicitacao = await this.prisma.$transaction(async (tx) => {
      const criada = await tx.solicitacaoExame.create({
        data: { consultaId, descricao: lista.join('\n'), orientacoes: orientacoes?.trim() || null },
        select: { id: true, solicitadoEm: true },
      });
      await tx.paciente.update({
        where: { usuarioId: consulta.pacienteId },
        data: { situacao: 'AGUARDANDO_EXAME' },
      });
      await this.auditoria.registrarEm(tx, {
        usuarioId: medicoId,
        acao: 'SOLICITAR_EXAMES',
        entidade: 'solicitacao_exame',
        entidadeId: criada.id,
        detalhes: { consultaId, quantidade: lista.length },
      });
      return criada;
    });

    // Passo 5: aviso ao paciente (falha no e-mail não desfaz a solicitação).
    await this.notificacoes
      .notificar({
        usuarioId: consulta.pacienteId,
        titulo: 'Exames solicitados',
        mensagem:
          'O(a) médico(a) solicitou exames para validar seu tipo sanguíneo. ' +
          'Veja as orientações e envie o resultado em "Meus exames".',
        link: '/meus-exames',
        email: true,
      })
      .catch((erro) => this.logger.error(`Falha ao notificar solicitação de exame: ${String(erro)}`));

    return {
      id: solicitacao.id,
      exames: lista,
      orientacoes: orientacoes?.trim() || null,
      solicitadoEm: solicitacao.solicitadoEm,
      situacaoPaciente: 'AGUARDANDO_EXAME' as const,
    };
  }

  // ---------------------------------------------------------------------------
  // UC11 – Anexar Resultado de Exame (RF07, RF10), pelo paciente
  // ---------------------------------------------------------------------------

  // Passos 1 e 2: "Meus exames", com situação e orientações; cada envio aparece no histórico.
  async meusExames(pacienteId: string) {
    const solicitacoes = await this.prisma.solicitacaoExame.findMany({
      where: { consulta: { pacienteId } },
      select: {
        id: true,
        descricao: true,
        orientacoes: true,
        solicitadoEm: true,
        consulta: { select: { medico: { select: { usuario: { select: { nome: true } } } } } },
        exames: {
          select: SELECAO_ENVIO,
          orderBy: { enviadoEm: 'desc' },
        },
      },
      orderBy: { solicitadoEm: 'desc' },
    });

    const itens = solicitacoes.map((s) => {
      const ultimo = s.exames[0];
      const situacao = ultimo?.situacao ?? 'AGUARDANDO_RESULTADO';
      return {
        id: s.id,
        exames: s.descricao.split('\n'),
        orientacoes: s.orientacoes,
        medico: s.consulta.medico.usuario.nome,
        solicitadoEm: s.solicitadoEm,
        situacao,
        // FA01: reprovado mostra o motivo e permite novo envio.
        motivoReprovacao: situacao === 'REPROVADO' ? ultimo!.motivoReprovacao : null,
        podeEnviar: situacao === 'AGUARDANDO_RESULTADO' || situacao === 'REPROVADO',
        envios: s.exames,
      };
    });
    return { itens, mensagem: itens.length ? undefined : 'Nenhum exame foi solicitado até o momento.' };
  }

  // Passos 3 a 6.
  async enviarResultado(pacienteId: string, solicitacaoId: string, arquivo: ArquivoRecebido | undefined) {
    if (!arquivo) throw new BadRequestException('Anexe o arquivo do resultado (campo "arquivo").');

    const solicitacao = await this.prisma.solicitacaoExame.findFirst({
      where: { id: solicitacaoId, consulta: { pacienteId } },
      select: {
        id: true,
        consulta: { select: { medicoId: true } },
        exames: { select: { situacao: true }, orderBy: { enviadoEm: 'desc' }, take: 1 },
      },
    });
    if (!solicitacao) throw new NotFoundException('Solicitação de exame não encontrada.');
    const ultima = solicitacao.exames[0]?.situacao;
    if (ultima === 'EM_ANALISE') throw new ConflictException('O resultado enviado ainda está em análise pelo médico.');
    if (ultima === 'VALIDADO') throw new ConflictException('Este exame já foi validado pelo médico.');

    // RN19 / FE01: formato pelo conteúdo e tamanho.
    const mimeType = validarArquivoExame(arquivo.buffer);
    if (!mimeType) throw new BadRequestException(MENSAGEM_ARQUIVO_INVALIDO);

    const armazenado = await this.armazenamento.enviar(arquivo.buffer, {
      prefixo: `exames/${pacienteId}/${solicitacaoId}`,
      mimeType,
    });

    try {
      const exame = await this.prisma.$transaction(async (tx) => {
        // Cada envio é um novo registro: o reprovado anterior permanece no histórico.
        const criado = await tx.exame.create({
          data: {
            solicitacaoExameId: solicitacaoId,
            chaveArmazenamento: armazenado.chave,
            nomeOriginal: nomeSeguro(arquivo.originalname),
            mimeType,
            tamanhoBytes: armazenado.tamanhoBytes,
            hashSha256: armazenado.hashSha256,
          },
          select: SELECAO_ENVIO,
        });
        // RN10: Aguardando exame (ou Reprovado, no reenvio) → Em análise.
        await tx.paciente.update({ where: { usuarioId: pacienteId }, data: { situacao: 'EM_ANALISE' } });
        await this.auditoria.registrarEm(tx, {
          usuarioId: pacienteId,
          acao: 'ENVIAR_EXAME',
          entidade: 'exame',
          entidadeId: criado.id,
          detalhes: { solicitacaoId, tamanhoBytes: armazenado.tamanhoBytes },
        });
        return criado;
      });

      await this.notificacoes
        .notificar({
          usuarioId: solicitacao.consulta.medicoId,
          titulo: 'Novo exame para avaliar',
          mensagem: 'Um paciente enviou o resultado de exame solicitado por você.',
          link: '/exames-para-avaliar',
        })
        .catch((erro) => this.logger.error(`Falha ao notificar médico: ${String(erro)}`));

      return { mensagem: 'Resultado enviado. Seu cadastro está em análise.', situacaoPaciente: 'EM_ANALISE', exame };
    } catch (erro) {
      // Sem registro no banco, o arquivo não deve ficar órfão no armazenamento.
      await this.armazenamento.remover(armazenado.chave).catch(() => undefined);
      throw erro;
    }
  }

  // ---------------------------------------------------------------------------
  // Acesso ao arquivo (RN19 / PT17): só o paciente titular e o médico da consulta
  // ---------------------------------------------------------------------------

  async arquivoDoPaciente(pacienteId: string, exameId: string, ip?: string): Promise<ArquivoParaDownload> {
    return this.baixar(exameId, { solicitacao: { consulta: { pacienteId } } }, pacienteId, ip);
  }

  async arquivoDoMedico(medicoId: string, exameId: string, ip?: string): Promise<ArquivoParaDownload> {
    return this.baixar(exameId, { solicitacao: { consulta: { medicoId } } }, medicoId, ip);
  }

  private async baixar(
    exameId: string,
    vinculo: { solicitacao: { consulta: { pacienteId?: string; medicoId?: string } } },
    usuarioId: string,
    ip?: string,
  ): Promise<ArquivoParaDownload> {
    const exame = await this.prisma.exame.findFirst({
      where: { id: exameId, ...vinculo },
      select: { chaveArmazenamento: true, nomeOriginal: true, mimeType: true, hashSha256: true },
    });
    // Sem vínculo clínico responde como inexistente (não revela que o exame existe).
    if (!exame) throw new NotFoundException('Exame não encontrado.');

    const conteudo = await this.armazenamento.obter(exame.chaveArmazenamento);
    await this.auditoria.registrar({
      usuarioId,
      acao: 'VISUALIZAR_EXAME',
      entidade: 'exame',
      entidadeId: exameId,
      ipOrigem: ip,
    });
    return { conteudo, nomeOriginal: exame.nomeOriginal, mimeType: exame.mimeType };
  }
}

const SELECAO_ENVIO = {
  id: true,
  situacao: true,
  nomeOriginal: true,
  mimeType: true,
  tamanhoBytes: true,
  enviadoEm: true,
  motivoReprovacao: true,
  avaliadoEm: true,
} as const;

/** O multer entrega o nome em latin1; corrige acentos e remove caminhos. */
export function nomeSeguro(original: string): string {
  const utf8 = Buffer.from(original, 'latin1').toString('utf8');
  const nome = (utf8.includes('�') ? original : utf8).split(/[\\/]/).pop()!.trim();
  return (nome || 'resultado').slice(0, 255);
}
