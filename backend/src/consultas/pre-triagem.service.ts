import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { dataParaIso, estimarElegibilidade } from '../common/elegibilidade.js';
import { hojeIso } from '../common/data.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { travarPacienteAtivo } from './ciclo-clinico.js';
import { ResponderPreTriagemDto, VERSAO_PRE_TRIAGEM } from './pre-triagem.dto.js';

export const CAMPOS_PRE_TRIAGEM = [
  { id: 'pesoKg', pergunta: 'Qual é o seu peso atual, em quilogramas?', tipo: 'numero' },
  { id: 'doouAntes', pergunta: 'Você já doou sangue?', tipo: 'booleano' },
  { id: 'dataUltimaDoacao', pergunta: 'Em que data ocorreu sua última doação?', tipo: 'data', quando: 'doouAntes' },
  { id: 'doouAntesDos60', pergunta: 'Você já havia doado sangue antes de completar 60 anos?', tipo: 'booleano', quando: 'doouAntes' },
  { id: 'condicaoSaudeRequerAvaliacao', pergunta: 'Há alguma condição de saúde que você precisa conversar com o médico antes de doar?', tipo: 'booleano' },
] as const;

@Injectable()
export class PreTriagemService {
  constructor(private readonly prisma: PrismaService, private readonly auditoria: AuditoriaService) {}

  async questionario(pacienteId: string) {
    const ultima = await this.prisma.preTriagem.findFirst({
      where: { pacienteId }, orderBy: [{ respondidaEm: 'desc' }, { id: 'desc' }],
      select: { id: true, versaoQuestionario: true, resultado: true, respondidaEm: true, proximaDataPossivel: true },
    });
    return { versao: VERSAO_PRE_TRIAGEM, campos: CAMPOS_PRE_TRIAGEM, ultima };
  }

  async responder(pacienteId: string, dto: ResponderPreTriagemDto, agora = new Date()) {
    const hoje = hojeIso(agora);
    if (dto.versao !== VERSAO_PRE_TRIAGEM)
      throw new BadRequestException('O questionário foi atualizado. Reabra a pré-triagem.');
    if (dto.doouAntes && !dto.dataUltimaDoacao)
      throw new BadRequestException('Informe a data da última doação.');
    if (!dto.doouAntes && (dto.dataUltimaDoacao || dto.doouAntesDos60 === true))
      throw new BadRequestException('Revise as informações sobre suas doações anteriores.');
    if (dto.dataUltimaDoacao && dto.dataUltimaDoacao > hoje)
      throw new BadRequestException('A última doação não pode ter uma data futura.');
    return this.prisma.$transaction(async (tx) => {
      await travarPacienteAtivo(tx, pacienteId);
      const paciente = await tx.paciente.findUniqueOrThrow({ where: { usuarioId: pacienteId },
        select: { situacao: true, dataNascimento: true, sexo: true, doacoes: { select: { dataColeta: true, doouAntesDos60Confirmado: true } } } });
      if (!['PRE_CADASTRADO', 'REPROVADO'].includes(paciente.situacao))
        throw new ConflictException('Conclua o atendimento atual antes de iniciar uma nova pré-triagem.');
      if (dto.dataUltimaDoacao && dto.dataUltimaDoacao < dataParaIso(paciente.dataNascimento))
        throw new BadRequestException('A data da última doação deve ser posterior ao nascimento.');
      const datas = paciente.doacoes.map((d) => dataParaIso(d.dataColeta));
      if (dto.dataUltimaDoacao && !datas.includes(dto.dataUltimaDoacao)) datas.push(dto.dataUltimaDoacao);
      const estimativa = estimarElegibilidade({ dataNascimento: dataParaIso(paciente.dataNascimento),
        sexo: paciente.sexo, pesoKg: dto.pesoKg, doacoes: datas, doouAntesDos60Confirmado: dto.doouAntesDos60 === true || paciente.doacoes.some((d) => d.doouAntesDos60Confirmado === true) }, hoje);
      const resultado = dto.condicaoSaudeRequerAvaliacao ? 'REQUER_CONFIRMACAO'
        : estimativa.elegivel ? 'APTO_CRITERIOS_BASICOS'
        : estimativa.proximaData ? 'AGUARDAR_INTERVALO' : 'REQUER_CONFIRMACAO';
      const valores: Record<string, string | number | boolean | undefined> = {
        pesoKg: dto.pesoKg, doouAntes: dto.doouAntes, dataUltimaDoacao: dto.dataUltimaDoacao,
        doouAntesDos60: dto.doouAntesDos60, condicaoSaudeRequerAvaliacao: dto.condicaoSaudeRequerAvaliacao,
      };
      const respostas = CAMPOS_PRE_TRIAGEM.filter((c) => valores[c.id] !== undefined).map((c) => ({
        pergunta: c.pergunta, resposta: String(valores[c.id]),
      }));
      const anterior = await tx.preTriagem.findFirst({ where: { pacienteId }, orderBy: [{ respondidaEm: 'desc' }, { id: 'desc' }], select: { respondidaEm: true } });
      const respondidaEm = new Date(Math.max(agora.getTime(), (anterior?.respondidaEm.getTime() ?? 0) + 1));
      const preTriagem = await tx.preTriagem.create({ data: { pacienteId, resultado, versaoQuestionario: dto.versao,
        respondidaEm, proximaDataPossivel: estimativa.proximaData ? new Date(`${estimativa.proximaData}T00:00:00Z`) : null,
        respostas: { create: respostas } },
        select: { id: true, resultado: true, respondidaEm: true, proximaDataPossivel: true } });
      await this.auditoria.registrarEm(tx, { usuarioId: pacienteId, acao: 'RESPONDER_PRE_TRIAGEM', entidade: 'pre_triagem',
        entidadeId: preTriagem.id, detalhes: { versao: dto.versao } });
      return { ...preTriagem, versao: dto.versao, permiteAgendarConsulta: true,
        orientacoes: [estimativa.mensagem ?? 'Os critérios básicos informados foram registrados.',
          ...(dto.condicaoSaudeRequerAvaliacao ? ['Converse sobre sua condição de saúde na consulta.'] : []),
          ...(estimativa.exigeAutorizacaoResponsavel ? ['Menores de 18 anos precisam da autorização do responsável para doar.'] : []),
          'Esta orientação não aprova nem impede a consulta médica e não substitui a triagem presencial do hemocentro.'] };
    });
  }
}
