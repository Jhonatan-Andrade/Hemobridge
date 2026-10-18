import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import { gerarHashSenha, verificarSenha } from '../common/senha.js';
import { dataParaIso, estimarElegibilidade } from '../common/elegibilidade.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AgendarDto,
  AtendimentoDto,
  BolsaDto,
  DisponibilidadeDto,
  HospitalQueryDto,
  MovimentoBolsaDto,
  PerfilPacienteDto,
  SenhaAtualDto,
  TrocarSenhaDto,
  VerificacaoHospitalDto,
} from './plataforma.dto.js';

@Controller()
export class PlataformaController {
  constructor(private readonly prisma: PrismaService) {}
  @Perfis('ADMINISTRADOR') @Get('admin/mapa-necessidades') async mapa() {
    const linhas = await this.prisma.$queryRaw<
      {
        estado: string;
        tipo: string;
        nivel: string;
        unidades: bigint;
        atualizadoEm: Date;
      }[]
    >`SELECT h.estado,t.sigla AS tipo,n.nivel,count(DISTINCT h.id) AS unidades,max(n.atualizado_em) AS "atualizadoEm" FROM necessidade_estoque n JOIN hospital h ON h.id=n.hospital_id JOIN tipo_sanguineo t ON t.id=n.tipo_sanguineo_id WHERE h.ativo AND h.verificado_em IS NOT NULL AND n.atualizado_em>now()-interval '24 hours' AND n.nivel<>'NAO_INFORMADO' GROUP BY h.estado,t.sigla,n.nivel`;
    const instituicoesVerificadas = await this.prisma.hospital.count({
      where: { ativo: true, verificadoEm: { not: null } },
    });
    return {
      janelaHoras: 24,
      instituicoesVerificadas,
      itens: linhas.map((l) => ({ ...l, unidades: Number(l.unidades) })),
      geradoEm: new Date(),
    };
  }
  @Perfis('PACIENTE') @Get('paciente/orientacoes-doacao') async orientacoes(
    @UsuarioAtual() u: UsuarioAutenticado,
  ) {
    const p = await this.prisma.paciente.findUniqueOrThrow({
      where: { usuarioId: u.id },
      include: { doacoes: { select: { dataColeta: true } } },
    });
    return estimarElegibilidade({
      dataNascimento: dataParaIso(p.dataNascimento),
      sexo: p.sexo,
      pesoKg: Number(p.pesoKg),
      doacoes: p.doacoes.map((d) => dataParaIso(d.dataColeta)),
    });
  }

  @Perfis('PACIENTE') @Get('paciente/perfil') async perfil(
    @UsuarioAtual() u: UsuarioAutenticado,
  ) {
    const p = await this.prisma.paciente.findUniqueOrThrow({
      where: { usuarioId: u.id },
      include: {
        usuario: {
          select: { nome: true, email: true, cpf: true, telefone: true },
        },
        tipoSanguineo: { select: { sigla: true } },
      },
    });
    return {
      name: p.usuario.nome,
      email: p.usuario.email,
      cpf: p.usuario.cpf,
      phone: p.usuario.telefone ?? '',
      birth: p.dataNascimento.toISOString().slice(0, 10),
      sex: p.sexo,
      weight: p.pesoKg.toString(),
      city: p.cidade,
      state: p.estado,
      status: p.situacao,
      bloodType: p.tipoSanguineo?.sigla ?? null,
    };
  }
  @Perfis('PACIENTE')
  @Patch('paciente/perfil')
  @Auditar({ acao: 'ATUALIZAR_PERFIL', entidade: 'paciente' })
  async salvarPerfil(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Body() dto: PerfilPacienteDto,
  ) {
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: u.id },
        data: { telefone: dto.telefone },
      }),
      this.prisma.paciente.update({
        where: { usuarioId: u.id },
        data: { pesoKg: dto.pesoKg, cidade: dto.cidade, estado: dto.estado },
      }),
    ]);
    return this.perfil(u);
  }
  @Post('conta/senha')
  @Auditar({ acao: 'TROCAR_SENHA', entidade: 'usuario' })
  async senha(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Body() dto: TrocarSenhaDto,
  ) {
    await this.confirmarSenha(u.id, dto.senhaAtual);
    if (dto.senhaAtual === dto.novaSenha)
      throw new BadRequestException(
        'A nova senha deve ser diferente da atual.',
      );
    await this.prisma.usuario.update({
      where: { id: u.id },
      data: {
        senhaHash: await gerarHashSenha(dto.novaSenha),
        versaoSessao: { increment: 1 },
      },
    });
    return { mensagem: 'Senha alterada. Entre novamente.' };
  }
  @Post('conta/solicitacoes-exclusao')
  @Auditar({ acao: 'SOLICITAR_EXCLUSAO', entidade: 'usuario' })
  async solicitarExclusao(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Body() dto: SenhaAtualDto,
  ) {
    await this.confirmarSenha(u.id, dto.senhaAtual);
    const existente = await this.prisma.solicitacaoExclusao.findFirst({
      where: { usuarioId: u.id, status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } },
      select: { id: true, status: true },
    });
    return (
      existente ??
      this.prisma.solicitacaoExclusao.create({
        data: { usuarioId: u.id },
        select: { id: true, status: true },
      })
    );
  }
  @Get('jornada/estimativas') estimativas() {
    return this.prisma.estimativaEtapa.findMany({
      where: { hospital: { ativo: true, verificadoEm: { not: null } } },
      select: {
        etapa: true,
        minutos: true,
        fonte: true,
        atualizadaEm: true,
        hospital: { select: { id: true, nome: true } },
      },
      take: 100,
    });
  }

  @Perfis('PACIENTE')
  @Post('paciente/agendamentos')
  @Auditar({ acao: 'AGENDAR_CONSULTA', entidade: 'consulta' })
  async agendar(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Body() dto: AgendarDto,
  ) {
    const h = await this.prisma.disponibilidadeMedico.findFirst({
      where: {
        id: dto.disponibilidadeId,
        inicio: { gt: new Date(), lte: new Date(Date.now() + 30 * 86400000) },
        medico: { usuario: { status: 'ATIVO' } },
        OR: [
          { hospitalId: null, medico: { hospital: { ativo: true } } },
          { hospital: { ativo: true } },
        ],
      },
      include: {
        medico: {
          select: {
            hospitalId: true,
            vinculos: { where: { ativo: true }, select: { hospitalId: true } },
          },
        },
      },
    });
    if (!h) throw new BadRequestException('Horário indisponível.');
    if (
      h.hospitalId &&
      h.hospitalId !== h.medico.hospitalId &&
      !h.medico.vinculos.some((v) => v.hospitalId === h.hospitalId)
    )
      throw new BadRequestException('Horário indisponível.');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const p = await tx.paciente.updateMany({
          where: { usuarioId: u.id, situacao: 'PRE_CADASTRADO' },
          data: { situacao: 'CONSULTA_AGENDADA' },
        });
        if (!p.count)
          throw new ConflictException(
            'Sua situação atual não permite outro agendamento.',
          );
        return tx.consulta.create({
          data: {
            pacienteId: u.id,
            medicoId: h.medicoId,
            disponibilidadeId: h.id,
            linkVideochamada: h.linkVideochamada,
            termoTelemedicinaAceitoEm: new Date(),
          },
          select: { id: true, status: true },
        });
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2004'].includes(e.code)
      )
        throw new ConflictException('Horário ocupado. Escolha outro.');
      throw e;
    }
  }
  @Perfis('MEDICO') @Get('medico/hospitais') async hospitais(
    @UsuarioAtual() u: UsuarioAutenticado,
  ) {
    return this.prisma.hospital.findMany({
      where: {
        ativo: true,
        OR: [
          { medicos: { some: { usuarioId: u.id } } },
          { vinculosMedicos: { some: { medicoId: u.id, ativo: true } } },
        ],
      },
      select: { id: true, nome: true, cidade: true, estado: true },
    });
  }
  @Perfis('MEDICO') @Get('medico/agenda') async agenda(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Query() q: HospitalQueryDto,
  ) {
    if (q.hospitalId) await this.validarVinculo(u, q.hospitalId);
    return this.prisma.disponibilidadeMedico.findMany({
      where: {
        medicoId: u.id,
        ...(q.hospitalId
          ? {
              OR: [
                { hospitalId: q.hospitalId },
                { hospitalId: null, medico: { hospitalId: q.hospitalId } },
              ],
            }
          : {}),
      },
      orderBy: { inicio: 'asc' },
      take: 100,
      select: {
        id: true,
        inicio: true,
        fim: true,
        hospitalId: true,
        consultas: {
          where: { status: 'AGENDADA' },
          select: {
            id: true,
            status: true,
            paciente: { select: { usuario: { select: { nome: true } } } },
          },
        },
      },
    });
  }
  @Perfis('MEDICO')
  @Post('medico/agenda')
  @Auditar({ acao: 'PUBLICAR_HORARIO', entidade: 'disponibilidade_medico' })
  async publicarHorario(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Body() dto: DisponibilidadeDto,
  ) {
    await this.validarVinculo(u, dto.hospitalId);
    if (
      new Date(dto.inicio) <= new Date() ||
      new Date(dto.fim) <= new Date(dto.inicio) ||
      new Date(dto.fim).getTime() - new Date(dto.inicio).getTime() > 4 * 3600000
    )
      throw new BadRequestException(
        'Informe um período futuro de até quatro horas.',
      );
    try {
      return await this.prisma.disponibilidadeMedico.create({
        data: {
          medicoId: u.id,
          hospitalId: dto.hospitalId,
          inicio: new Date(dto.inicio),
          fim: new Date(dto.fim),
          linkVideochamada: dto.linkVideochamada,
        },
        select: { id: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError)
        throw new ConflictException(
          'O período coincide com um horário já publicado.',
        );
      throw e;
    }
  }
  @Perfis('MEDICO')
  @Patch('medico/consultas/:id')
  @Auditar({ acao: 'REGISTRAR_ATENDIMENTO', entidade: 'consulta' })
  async atendimento(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtendimentoDto,
  ) {
    const result = await this.prisma.consulta.updateMany({
      where: {
        id,
        medicoId: u.id,
        status: 'AGENDADA',
        disponibilidade: { inicio: { lte: new Date() } },
      },
      data: { status: dto.status },
    });
    if (!result.count)
      throw new ConflictException('Atendimento indisponível para atualização.');
    return { mensagem: 'Atendimento registrado.' };
  }
  @Perfis('MEDICO') @Get('medico/exames') exames(
    @UsuarioAtual() u: UsuarioAutenticado,
  ) {
    return this.prisma.solicitacaoExame.findMany({
      where: { consulta: { medicoId: u.id } },
      select: {
        id: true,
        descricao: true,
        solicitadoEm: true,
        consulta: {
          select: {
            id: true,
            paciente: { select: { usuario: { select: { nome: true } } } },
          },
        },
        exames: {
          select: {
            id: true,
            situacao: true,
            nomeOriginal: true,
            enviadoEm: true,
          },
        },
      },
      orderBy: { solicitadoEm: 'desc' },
      take: 100,
    });
  }

  @Perfis('REPRESENTANTE') @Get('representante/estoque') async estoque(
    @UsuarioAtual() u: UsuarioAutenticado,
  ) {
    const hospitalId = await this.hospitalRepresentante(u.id);
    return this.prisma.bolsaSangue.findMany({
      where: { hospitalId },
      orderBy: { validadeEm: 'asc' },
      take: 200,
      include: { tipoSanguineo: { select: { sigla: true } } },
    });
  }
  @Perfis('REPRESENTANTE')
  @Post('representante/estoque')
  @Auditar({ acao: 'REGISTRAR_BOLSA', entidade: 'bolsa_sangue' })
  async bolsa(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: BolsaDto) {
    const hospitalId = await this.hospitalRepresentante(u.id);
    if (
      new Date(dto.coletadaEm) > new Date() ||
      new Date(dto.validadeEm) <= new Date(dto.coletadaEm)
    )
      throw new BadRequestException('Datas da bolsa inválidas.');
    if (
      !(await this.prisma.tipoSanguineo.findUnique({
        where: { id: dto.tipoSanguineoId },
        select: { id: true },
      }))
    )
      throw new BadRequestException('Tipo sanguíneo inválido.');
    return this.prisma.bolsaSangue.create({
      data: {
        codigo: dto.codigo,
        componente: dto.componente,
        tipoSanguineoId: dto.tipoSanguineoId,
        coletadaEm: new Date(dto.coletadaEm),
        validadeEm: new Date(dto.validadeEm),
        hospitalId,
        movimentos: {
          create: {
            usuarioId: u.id,
            atual: 'QUARENTENA',
            motivo: 'Registro inicial',
          },
        },
      },
      select: { id: true, status: true },
    });
  }
  @Perfis('REPRESENTANTE')
  @Patch('representante/estoque/:id')
  @Auditar({ acao: 'MOVIMENTAR_BOLSA', entidade: 'bolsa_sangue' })
  async mover(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MovimentoBolsaDto,
  ) {
    const hospitalId = await this.hospitalRepresentante(u.id);
    const permitidas: Record<string, string[]> = {
      QUARENTENA: ['DISPONIVEL', 'DESCARTADA'],
      DISPONIVEL: ['RESERVADA', 'DESCARTADA'],
      RESERVADA: ['DISPONIVEL', 'UTILIZADA', 'DESCARTADA'],
    };
    if (!permitidas[dto.anterior]?.includes(dto.status))
      throw new BadRequestException('Transição de estoque inválida.');
    if (
      dto.status === 'DISPONIVEL' &&
      dto.anterior === 'QUARENTENA' &&
      !dto.liberacaoReferencia
    )
      throw new BadRequestException(
        'Informe a referência da liberação técnica.',
      );
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.bolsaSangue.updateMany({
        where: {
          id,
          hospitalId,
          status: dto.anterior,
          ...(dto.status === 'DISPONIVEL' || dto.status === 'RESERVADA'
            ? { validadeEm: { gt: new Date() } }
            : {}),
        },
        data: {
          status: dto.status,
          ...(dto.liberacaoReferencia
            ? { liberacaoReferencia: dto.liberacaoReferencia }
            : {}),
        },
      });
      if (!result.count)
        throw new ConflictException(
          'Bolsa alterada, vencida ou indisponível. Atualize a lista.',
        );
      await tx.movimentoEstoque.create({
        data: {
          bolsaId: id,
          usuarioId: u.id,
          anterior: dto.anterior,
          atual: dto.status,
          motivo: dto.motivo,
        },
      });
      return { id, status: dto.status };
    });
  }
  @Perfis('ADMINISTRADOR')
  @Post('admin/hospitais/:id/verificacao')
  @Auditar({ acao: 'VERIFICAR_INSTITUICAO', entidade: 'hospital' })
  verificarHospital(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerificacaoHospitalDto,
  ) {
    return this.prisma.hospital.update({
      where: { id, ativo: true },
      data: { verificadoEm: new Date(), fonteVerificacao: dto.fonte },
      select: { id: true, verificadoEm: true },
    });
  }

  private async confirmarSenha(id: string, senha: string) {
    const u = await this.prisma.usuario.findUniqueOrThrow({
      where: { id },
      select: { senhaHash: true },
    });
    if (!(await verificarSenha(u.senhaHash, senha)))
      throw new UnauthorizedException('Senha atual incorreta.');
  }
  private async hospitalRepresentante(id: string) {
    return (
      await this.prisma.representanteHospital.findUniqueOrThrow({
        where: { usuarioId: id },
        select: { hospitalId: true },
      })
    ).hospitalId;
  }
  private async validarVinculo(u: UsuarioAutenticado, id: string) {
    const hospitais = await this.hospitais(u);
    if (!hospitais.some((h) => h.id === id))
      throw new ForbiddenException('Instituição não vinculada ao seu perfil.');
  }
}
@Module({ controllers: [PlataformaController] })
export class PlataformaModule {}
