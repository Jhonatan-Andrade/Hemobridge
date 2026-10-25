import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ArmazenamentoService } from '../armazenamento/armazenamento.service.js';
import { calcularIdade } from '../common/data.js';
import { Prisma } from '../generated/prisma/client.js';
import { SELECAO_ENVIO } from '../pacientes/exames.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AprovarExameDto, ListarExamesMedicoDto, ReprovarExameDto } from './dto/exame.dto.js';

const SELECAO_DETALHE = {
  id: true,
  exames: true,
  orientacoes: true,
  situacao: true,
  criadoEm: true,
  consulta: { select: { id: true, disponibilidade: { select: { inicio: true } } } },
  paciente: {
    select: {
      dataNascimento: true,
      sexo: true,
      pesoKg: true,
      situacao: true,
      tipoSanguineo: { select: { sigla: true } },
      usuario: { select: { id: true, nome: true } },
    },
  },
  envios: { select: SELECAO_ENVIO, orderBy: { enviadoEm: 'desc' } },
} satisfies Prisma.SolicitacaoExameSelect;

type SolicitacaoDetalhada = Prisma.SolicitacaoExameGetPayload<{ select: typeof SELECAO_DETALHE }>;

function apresentar({ consulta, paciente, ...s }: SolicitacaoDetalhada) {
  return {
    ...s,
    consulta: { id: consulta.id, inicio: consulta.disponibilidade.inicio },
    paciente: {
      id: paciente.usuario.id,
      nome: paciente.usuario.nome,
      idade: calcularIdade(paciente.dataNascimento.toISOString().slice(0, 10)),
      sexo: paciente.sexo,
      pesoKg: Number(paciente.pesoKg),
      situacao: paciente.situacao,
      tipoSanguineo: paciente.tipoSanguineo?.sigla ?? null,
    },
  };
}

/**
 * UC16 – Avaliar Cadastro do Paciente (RF08–RF10, RF12). O médico só vê as
 * solicitações que ele mesmo fez (RN19, RNF04).
 * TODO(UC12): notificar o paciente da aprovação ou reprovação.
 */
@Injectable()
export class ExamesMedicoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  // Passo 2
  async listar(medicoId: string, { situacao, pagina, tamanhoPagina }: ListarExamesMedicoDto) {
    const where: Prisma.SolicitacaoExameWhereInput = { medicoId, situacao };
    const [solicitacoes, total] = await Promise.all([
      this.prisma.solicitacaoExame.findMany({
        where,
        select: {
          id: true,
          exames: true,
          situacao: true,
          atualizadoEm: true,
          paciente: { select: { usuario: { select: { id: true, nome: true } } } },
          envios: { select: { enviadoEm: true }, orderBy: { enviadoEm: 'desc' }, take: 1 },
        },
        orderBy: { atualizadoEm: 'desc' },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      this.prisma.solicitacaoExame.count({ where }),
    ]);
    return {
      itens: solicitacoes.map(({ paciente, envios, ...s }) => ({
        ...s,
        paciente: paciente.usuario,
        ultimoEnvioEm: envios[0]?.enviadoEm ?? null,
      })),
      total,
      pagina,
      tamanhoPagina,
    };
  }

  // Passo 3
  async detalhar(medicoId: string, id: string) {
    const solicitacao = await this.prisma.solicitacaoExame.findFirst({ where: { id, medicoId }, select: SELECAO_DETALHE });
    if (!solicitacao) throw new NotFoundException('Solicitação de exame não encontrada.');
    return apresentar(solicitacao);
  }

  async arquivo(medicoId: string, solicitacaoId: string, exameId: string) {
    const exame = await this.prisma.exame.findFirst({
      where: { id: exameId, solicitacao: { id: solicitacaoId, medicoId } },
      select: { nomeArquivo: true, mimeType: true, chaveArmazenamento: true },
    });
    if (!exame) throw new NotFoundException('Arquivo não encontrado.');
    return { ...exame, conteudo: await this.armazenamento.ler(exame.chaveArmazenamento) };
  }

  // Passos 4–6
  async aprovar(medicoId: string, id: string, { tipoSanguineo }: AprovarExameDto) {
    const { pacienteId, envioId } = await this.emAnalise(medicoId, id);
    const tipo = await this.prisma.tipoSanguineo.findUniqueOrThrow({ where: { sigla: tipoSanguineo }, select: { id: true } });
    const agora = new Date();

    await this.prisma.$transaction([
      this.prisma.exame.update({
        where: { id: envioId },
        data: { situacao: 'VALIDADO', avaliadoPorId: medicoId, avaliadoEm: agora },
      }),
      this.prisma.solicitacaoExame.update({ where: { id }, data: { situacao: 'VALIDADO' } }),
      // RN01 / RN10: Em análise → Aprovado (Doador), com a tipagem registrada pelo médico.
      this.prisma.paciente.update({
        where: { usuarioId: pacienteId },
        data: { situacao: 'APROVADO', tipoSanguineoId: tipo.id, medicoValidadorId: medicoId, validadoEm: agora },
      }),
    ]);
    return { mensagem: `Cadastro aprovado. Tipo sanguíneo ${tipoSanguineo} registrado.`, solicitacao: await this.detalhar(medicoId, id) };
  }

  // FA01
  async reprovar(medicoId: string, id: string, { motivo }: ReprovarExameDto) {
    const { pacienteId, envioId } = await this.emAnalise(medicoId, id);
    const agora = new Date();

    await this.prisma.$transaction([
      this.prisma.exame.update({
        where: { id: envioId },
        data: { situacao: 'REPROVADO', motivoReprovacao: motivo, avaliadoPorId: medicoId, avaliadoEm: agora },
      }),
      this.prisma.solicitacaoExame.update({ where: { id }, data: { situacao: 'REPROVADO' } }),
      // RN10: Em análise → Reprovado; o paciente pode enviar novo exame (UC11 FA01).
      this.prisma.paciente.update({ where: { usuarioId: pacienteId }, data: { situacao: 'REPROVADO' } }),
    ]);
    return { mensagem: 'Cadastro reprovado. O paciente poderá enviar um novo exame.', solicitacao: await this.detalhar(medicoId, id) };
  }

  private async emAnalise(medicoId: string, id: string) {
    const solicitacao = await this.prisma.solicitacaoExame.findFirst({
      where: { id, medicoId },
      select: {
        situacao: true,
        pacienteId: true,
        paciente: { select: { situacao: true } },
        envios: { select: { id: true, situacao: true }, orderBy: { enviadoEm: 'desc' }, take: 1 },
      },
    });
    if (!solicitacao) throw new NotFoundException('Solicitação de exame não encontrada.');
    const envio = solicitacao.envios[0];
    if (solicitacao.situacao !== 'EM_ANALISE' || envio?.situacao !== 'EM_ANALISE' || solicitacao.paciente.situacao !== 'EM_ANALISE') {
      throw new ConflictException('Não há exame em análise nesta solicitação.');
    }
    return { pacienteId: solicitacao.pacienteId, envioId: envio.id };
  }
}
