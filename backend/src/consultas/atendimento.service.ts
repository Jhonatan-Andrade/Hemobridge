import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AtendimentoDto } from '../plataforma/plataforma.dto.js';
import { consultaComVinculoClinicoAtivo } from './acesso-clinico.js';
import { exigirCicloAtual, travarPacienteAtivo } from './ciclo-clinico.js';

@Injectable()
export class AtendimentoService {
  constructor(private readonly prisma: PrismaService, private readonly notificacoes: NotificacoesService,
    private readonly auditoria: AuditoriaService) {}

  async detalhes(medicoId: string, id: string) {
    const consulta = await this.prisma.consulta.findFirst({ where: { id, ...consultaComVinculoClinicoAtivo(medicoId) },
      select: { id: true, status: true, observacoes: true, motivoReprovacao: true, criadoEm: true,
        pacienteId: true, paciente: { select: { situacao: true, dataNascimento: true, sexo: true, pesoKg: true, usuario: { select: { nome: true } } } },
        disponibilidade: { select: { inicio: true, fim: true, canceladaEm: true } },
        preTriagem: { select: { versaoQuestionario: true, resultado: true, respondidaEm: true, proximaDataPossivel: true,
          respostas: { select: { pergunta: true, resposta: true } } } } } });
    if (!consulta) throw new NotFoundException('Atendimento não encontrado ou vínculo indisponível.');
    const ultima = await this.prisma.consulta.findFirst({ where: { pacienteId: consulta.pacienteId },
      orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], select: { id: true } });
    const atual = ultima?.id === id;
    const agora = new Date();
    const { pacienteId: _, ...detalhes } = consulta;
    return { ...detalhes, cicloAtual: atual,
      podeAtender: atual && consulta.paciente.situacao !== 'APROVADO' && !consulta.motivoReprovacao && ['AGENDADA', 'REALIZADA'].includes(consulta.status) && consulta.disponibilidade.inicio <= agora,
      podeCancelar: atual && consulta.status === 'AGENDADA' && consulta.disponibilidade.inicio > agora };
  }

  async registrar(medicoId: string, id: string, dto: AtendimentoDto, agora = new Date()) {
    const motivo = dto.motivoReprovacao?.trim();
    if (dto.decisao === 'REPROVAR' && (!motivo || motivo.length < 5))
      throw new BadRequestException('Informe o motivo da inaptidão para orientar o paciente.');
    if (dto.status === 'NAO_COMPARECEU' && (dto.decisao || motivo))
      throw new BadRequestException('Uma falta não pode conter uma decisão clínica.');
    if (motivo && dto.decisao !== 'REPROVAR') throw new BadRequestException('Vincule o motivo à decisão de inaptidão.');
    const resultado = await this.prisma.$transaction(async (tx) => {
      const ref = await tx.consulta.findFirst({ where: { id, ...consultaComVinculoClinicoAtivo(medicoId) }, select: { pacienteId: true } });
      if (!ref) throw new ConflictException('Atendimento indisponível para atualização.');
      await travarPacienteAtivo(tx, ref.pacienteId);
      await exigirCicloAtual(tx, ref.pacienteId, id);
      const consulta = await tx.consulta.findFirst({ where: { id, ...consultaComVinculoClinicoAtivo(medicoId) },
        select: { status: true, motivoReprovacao: true, disponibilidade: { select: { inicio: true } },
          paciente: { select: { situacao: true } } } });
      if (!consulta || consulta.disponibilidade.inicio > agora || consulta.motivoReprovacao || consulta.paciente.situacao === 'APROVADO'
        || !['AGENDADA', 'REALIZADA'].includes(consulta.status)
        || (consulta.status === 'REALIZADA' && (dto.status !== 'REALIZADA' || (!dto.decisao && dto.observacoes === undefined))))
        throw new ConflictException('Atendimento indisponível para atualização.');
      await tx.consulta.update({ where: { id }, data: { status: dto.status,
        ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes.trim() || null } : {}),
        ...(dto.decisao === 'REPROVAR' ? { motivoReprovacao: motivo! } : {}) } });
      if (dto.status === 'NAO_COMPARECEU' || dto.decisao === 'REPROVAR') {
        await tx.paciente.update({ where: { usuarioId: ref.pacienteId }, data: {
          situacao: dto.status === 'NAO_COMPARECEU' ? 'PRE_CADASTRADO' : 'REPROVADO',
          tipoSanguineoId: null, medicoValidadorId: null, validadoEm: null,
        } });
      }
      const notificacoes = await this.notificacoes.registrarEm(tx, {
        usuarioId: ref.pacienteId, email: true, link: '/minhas-consultas',
        titulo: dto.status === 'NAO_COMPARECEU' ? 'Ausência registrada na consulta' : dto.decisao === 'REPROVAR' ? 'Orientação após a consulta' : 'Atendimento registrado',
        mensagem: dto.status === 'NAO_COMPARECEU' ? 'Sua ausência foi registrada. Você pode responder uma nova pré-triagem e escolher outro horário.'
          : dto.decisao === 'REPROVAR' ? `A avaliação identificou uma restrição para doação: ${motivo}. Acompanhe seu painel e as orientações médicas.`
          : 'O médico registrou seu atendimento. Acompanhe as orientações e eventuais solicitações em Meus exames.',
      });
      await this.auditoria.registrarEm(tx, { usuarioId: medicoId, acao: 'REGISTRAR_ATENDIMENTO', entidade: 'consulta', entidadeId: id,
        detalhes: { status: dto.status, decisao: dto.decisao ?? null } });
      return { notificacoes, status: dto.status };
    });
    await this.notificacoes.despacharEmails(resultado.notificacoes).catch(() => undefined);
    return { mensagem: 'Atendimento registrado.', status: resultado.status };
  }

  async cancelar(medicoId: string, id: string, motivo: string, agora = new Date()) {
    if (motivo.trim().length < 5) throw new BadRequestException('Informe o motivo do cancelamento.');
    const ids = await this.prisma.$transaction(async (tx) => {
      const ref = await tx.consulta.findFirst({ where: { id, ...consultaComVinculoClinicoAtivo(medicoId) }, select: { pacienteId: true, disponibilidadeId: true } });
      if (!ref) throw new NotFoundException('Consulta não encontrada ou vínculo indisponível.');
      await travarPacienteAtivo(tx, ref.pacienteId);
      await exigirCicloAtual(tx, ref.pacienteId, id);
      await tx.$queryRaw`SELECT id FROM disponibilidade_medico WHERE id=${ref.disponibilidadeId}::uuid FOR UPDATE`;
      const atualizada = await tx.consulta.updateMany({ where: { id, status: 'AGENDADA',
        AND: [consultaComVinculoClinicoAtivo(medicoId), { disponibilidade: { inicio: { gt: agora } } }] },
        data: { status: 'CANCELADA', canceladaPorId: medicoId, canceladaEm: agora, motivoCancelamento: motivo.trim() } });
      if (!atualizada.count) throw new ConflictException('Só é possível cancelar uma consulta agendada antes do início.');
      await tx.disponibilidadeMedico.update({ where: { id: ref.disponibilidadeId }, data: { canceladaEm: agora } });
      await tx.paciente.updateMany({ where: { usuarioId: ref.pacienteId, situacao: 'CONSULTA_AGENDADA' }, data: { situacao: 'PRE_CADASTRADO' } });
      await this.auditoria.registrarEm(tx, { usuarioId: medicoId, acao: 'CANCELAR_CONSULTA_MEDICO', entidade: 'consulta', entidadeId: id });
      return this.notificacoes.registrarEm(tx, { usuarioId: ref.pacienteId, titulo: 'Consulta cancelada pelo médico',
        mensagem: `Sua consulta foi cancelada: ${motivo.trim()}. Escolha outro horário em Minhas consultas.`, link: '/minhas-consultas', email: true });
    });
    await this.notificacoes.despacharEmails(ids).catch(() => undefined);
    return { mensagem: 'Consulta cancelada e paciente notificado. O horário foi retirado da disponibilidade.' };
  }
}
