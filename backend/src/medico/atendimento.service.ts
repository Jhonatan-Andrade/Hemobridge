import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { calcularIdade } from '../common/data.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CancelarConsultaMedicoDto, ListarConsultasMedicoDto, RegistrarRealizadaDto } from './dto/atendimento.dto.js';

const SELECAO_DETALHE = {
  id: true,
  situacao: true,
  observacoes: true,
  motivoReprovacao: true,
  canceladaPor: true,
  motivoCancelamento: true,
  encerradaEm: true,
  consultaOrigemId: true,
  disponibilidade: { select: { inicio: true, fim: true, linkSala: true } },
  paciente: {
    select: {
      dataNascimento: true,
      sexo: true,
      pesoKg: true,
      cidade: true,
      estado: true,
      situacao: true,
      usuario: { select: { id: true, nome: true } },
    },
  },
  solicitacaoExame: { select: { id: true, exames: true, orientacoes: true, situacao: true } },
} satisfies Prisma.ConsultaSelect;

type ConsultaDetalhada = Prisma.ConsultaGetPayload<{ select: typeof SELECAO_DETALHE }>;

// Passo 2: dados do paciente relevantes para a avaliação e acesso à sala.
function apresentar({ disponibilidade, paciente, ...c }: ConsultaDetalhada) {
  return {
    ...c,
    inicio: disponibilidade.inicio,
    fim: disponibilidade.fim,
    linkSala: disponibilidade.linkSala,
    paciente: {
      id: paciente.usuario.id,
      nome: paciente.usuario.nome,
      idade: calcularIdade(paciente.dataNascimento.toISOString().slice(0, 10)),
      sexo: paciente.sexo,
      pesoKg: Number(paciente.pesoKg),
      cidade: paciente.cidade,
      estado: paciente.estado,
      situacao: paciente.situacao,
    },
  };
}

/**
 * UC14 – Registrar Atendimento, estendido por UC15 – Solicitar Exames.
 * Dados clínicos ficam restritos ao médico da consulta (RNF04).
 * TODO(UC12): gerar as notificações ao paciente quando houver notificações na plataforma.
 */
@Injectable()
export class AtendimentoService {
  constructor(private readonly prisma: PrismaService) {}

  // Histórico de consultas do médico (mais recentes primeiro).
  async listar(medicoId: string, { situacao, pagina, tamanhoPagina }: ListarConsultasMedicoDto) {
    const where: Prisma.ConsultaWhereInput = { medicoId, situacao };
    const [consultas, total] = await Promise.all([
      this.prisma.consulta.findMany({
        where,
        select: {
          id: true,
          situacao: true,
          disponibilidade: { select: { inicio: true, fim: true } },
          paciente: { select: { usuario: { select: { id: true, nome: true } } } },
        },
        orderBy: { disponibilidade: { inicio: 'desc' } },
        skip: (pagina - 1) * tamanhoPagina,
        take: tamanhoPagina,
      }),
      this.prisma.consulta.count({ where }),
    ]);
    return {
      itens: consultas.map(({ disponibilidade, paciente, ...c }) => ({ ...c, ...disponibilidade, paciente: paciente.usuario })),
      total,
      pagina,
      tamanhoPagina,
    };
  }

  async detalhar(medicoId: string, id: string) {
    const consulta = await this.prisma.consulta.findFirst({ where: { id, medicoId }, select: SELECAO_DETALHE });
    // Consulta de outro médico é tratada como inexistente.
    if (!consulta) throw new NotFoundException('Consulta não encontrada.');
    return apresentar(consulta);
  }

  // Passos 3–6 (com UC15) ou FA01
  async registrarRealizada(medicoId: string, id: string, dto: RegistrarRealizadaDto) {
    const temExames = !!dto.exames?.length;
    if (temExames === !!dto.motivoReprovacao) {
      throw new BadRequestException(
        'Informe os exames solicitados ou, se o paciente não estiver apto à doação, o motivo da reprovação.',
      );
    }
    const consulta = await this.consultaIniciada(medicoId, id);
    const agora = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.consulta.update({
        where: { id },
        data: {
          situacao: 'REALIZADA',
          observacoes: dto.observacoes,
          motivoReprovacao: dto.motivoReprovacao,
          encerradaEm: agora,
        },
      });
      if (temExames) {
        // UC15 passo 4
        await tx.solicitacaoExame.create({
          data: {
            consultaId: id,
            pacienteId: consulta.pacienteId,
            medicoId,
            exames: dto.exames!,
            orientacoes: dto.orientacoes,
          },
        });
      }
      // RN10: Consulta agendada → Aguardando exame ou → Reprovado.
      await tx.paciente.update({
        where: { usuarioId: consulta.pacienteId },
        data: { situacao: temExames ? 'AGUARDANDO_EXAME' : 'REPROVADO' },
      });
    });

    return {
      mensagem: temExames
        ? 'Atendimento registrado. Os exames foram solicitados ao paciente.'
        : 'Atendimento registrado. O paciente foi considerado inapto à doação.',
      consulta: await this.detalhar(medicoId, id),
    };
  }

  // FA02
  async registrarNaoComparecimento(medicoId: string, id: string) {
    const consulta = await this.consultaIniciada(medicoId, id);
    await this.prisma.$transaction([
      this.prisma.consulta.update({ where: { id }, data: { situacao: 'NAO_COMPARECEU', encerradaEm: new Date() } }),
      // RN10: Consulta agendada → Pré-cadastrado.
      this.prisma.paciente.update({ where: { usuarioId: consulta.pacienteId }, data: { situacao: 'PRE_CADASTRADO' } }),
    ]);
    return { mensagem: 'Não comparecimento registrado.', consulta: await this.detalhar(medicoId, id) };
  }

  // FA03: só antes do horário; o horário sai da agenda.
  async cancelar(medicoId: string, id: string, { motivo }: CancelarConsultaMedicoDto) {
    const consulta = await this.consultaAgendada(medicoId, id);
    if (consulta.disponibilidade.inicio <= new Date()) {
      throw new UnprocessableEntityException(
        'A consulta já começou. Registre o atendimento ou o não comparecimento do paciente.',
      );
    }
    const agora = new Date();
    await this.prisma.$transaction([
      this.prisma.consulta.update({
        where: { id },
        data: { situacao: 'CANCELADA', canceladaPor: 'MEDICO', motivoCancelamento: motivo, encerradaEm: agora },
      }),
      this.prisma.disponibilidadeMedico.update({ where: { id: consulta.disponibilidadeId }, data: { removidoEm: agora } }),
      this.prisma.paciente.update({ where: { usuarioId: consulta.pacienteId }, data: { situacao: 'PRE_CADASTRADO' } }),
    ]);
    return { mensagem: 'Consulta cancelada. O paciente poderá agendar um novo horário.', consulta: await this.detalhar(medicoId, id) };
  }

  private async consultaAgendada(medicoId: string, id: string) {
    const consulta = await this.prisma.consulta.findFirst({
      where: { id, medicoId },
      select: { situacao: true, pacienteId: true, disponibilidadeId: true, disponibilidade: { select: { inicio: true } } },
    });
    if (!consulta) throw new NotFoundException('Consulta não encontrada.');
    if (consulta.situacao !== 'AGENDADA') throw new ConflictException('O atendimento desta consulta já foi registrado.');
    return consulta;
  }

  // FE01: "Realizada" e "Não compareceu" só a partir do horário da consulta.
  private async consultaIniciada(medicoId: string, id: string) {
    const consulta = await this.consultaAgendada(medicoId, id);
    if (consulta.disponibilidade.inicio > new Date()) {
      throw new UnprocessableEntityException(
        'A consulta ainda não começou. Antes do horário, só é possível cancelá-la.',
      );
    }
    return consulta;
  }
}
