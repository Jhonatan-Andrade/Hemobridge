import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ArmazenamentoService } from '../armazenamento/armazenamento.service.js';
import {
  type ArquivoRecebido,
  detectarTipoExame,
  LIMITE_ARQUIVO_EXAME,
  MENSAGEM_ARQUIVO_INVALIDO,
  nomeArquivoSeguro,
} from '../common/arquivo-exame.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const SELECAO_ENVIO = {
  id: true,
  situacao: true,
  nomeArquivo: true,
  mimeType: true,
  tamanhoBytes: true,
  enviadoEm: true,
  avaliadoEm: true,
  motivoReprovacao: true,
} as const;

/**
 * UC11 – Anexar Resultado de Exame (RF07). O arquivo é acessível só ao próprio
 * paciente e ao médico responsável pela consulta (RN19).
 */
@Injectable()
export class ExamesPacienteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  // Passo 2: exames solicitados, com situação, orientações e envios anteriores.
  async listar(pacienteId: string) {
    const solicitacoes = await this.prisma.solicitacaoExame.findMany({
      where: { pacienteId },
      select: {
        id: true,
        exames: true,
        orientacoes: true,
        situacao: true,
        criadoEm: true,
        medico: { select: { usuario: { select: { nome: true } } } },
        consulta: { select: { id: true, disponibilidade: { select: { inicio: true } } } },
        envios: { select: SELECAO_ENVIO, orderBy: { enviadoEm: 'desc' } },
      },
      orderBy: { criadoEm: 'desc' },
    });
    return solicitacoes.map(({ medico, consulta, ...s }) => ({
      ...s,
      medico: { nome: medico.usuario.nome },
      consulta: { id: consulta.id, inicio: consulta.disponibilidade.inicio },
      // FA01: depois da reprovação, o paciente envia um novo arquivo.
      podeEnviar: s.situacao === 'AGUARDANDO_RESULTADO' || s.situacao === 'REPROVADO',
    }));
  }

  // Passos 3–6
  async enviarResultado(pacienteId: string, solicitacaoId: string, arquivo?: ArquivoRecebido) {
    if (!arquivo) throw new BadRequestException('Anexe o arquivo do resultado do exame.');
    const tipo = detectarTipoExame(arquivo.buffer);
    // FE01
    if (!tipo || arquivo.size === 0 || arquivo.size > LIMITE_ARQUIVO_EXAME) {
      throw new BadRequestException(MENSAGEM_ARQUIVO_INVALIDO);
    }

    const solicitacao = await this.prisma.solicitacaoExame.findFirst({
      where: { id: solicitacaoId, pacienteId },
      select: { situacao: true, paciente: { select: { situacao: true } } },
    });
    if (!solicitacao) throw new NotFoundException('Solicitação de exame não encontrada.');
    if (solicitacao.situacao === 'EM_ANALISE') {
      throw new ConflictException('O resultado deste exame já foi enviado e está em análise pelo médico.');
    }
    if (solicitacao.situacao === 'VALIDADO') throw new ConflictException('Este exame já foi validado pelo médico.');
    const situacaoPaciente = solicitacao.paciente.situacao;
    if (situacaoPaciente !== 'AGUARDANDO_EXAME' && situacaoPaciente !== 'REPROVADO') {
      throw new ConflictException('O envio de exame não está disponível na etapa atual do seu processo.');
    }

    const chave = `exames/${solicitacaoId}/${randomUUID()}.${tipo.extensao}`;
    await this.armazenamento.salvar(chave, arquivo.buffer);
    try {
      await this.prisma.$transaction([
        this.prisma.exame.create({
          data: {
            solicitacaoId,
            nomeArquivo: nomeArquivoSeguro(arquivo.originalname, tipo.extensao),
            mimeType: tipo.mimeType,
            tamanhoBytes: arquivo.size,
            hashSha256: createHash('sha256').update(arquivo.buffer).digest('hex'),
            chaveArmazenamento: chave,
          },
        }),
        this.prisma.solicitacaoExame.update({ where: { id: solicitacaoId }, data: { situacao: 'EM_ANALISE' } }),
        // RN10: Aguardando exame (ou Reprovado, no reenvio) → Em análise.
        this.prisma.paciente.update({ where: { usuarioId: pacienteId }, data: { situacao: 'EM_ANALISE' } }),
      ]);
    } catch (e) {
      await this.armazenamento.remover(chave);
      throw e;
    }

    return {
      mensagem: 'Resultado enviado. O médico vai analisar o exame.',
      solicitacao: (await this.listar(pacienteId)).find((s) => s.id === solicitacaoId),
    };
  }

  async arquivo(pacienteId: string, solicitacaoId: string, exameId: string) {
    const exame = await this.prisma.exame.findFirst({
      where: { id: exameId, solicitacao: { id: solicitacaoId, pacienteId } },
      select: { nomeArquivo: true, mimeType: true, chaveArmazenamento: true },
    });
    if (!exame) throw new NotFoundException('Arquivo não encontrado.');
    return { ...exame, conteudo: await this.armazenamento.ler(exame.chaveArmazenamento) };
  }
}
