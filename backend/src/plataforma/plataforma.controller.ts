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
import { AgendamentoService } from '../consultas/agendamento.service.js';
import { AtendimentoService } from '../consultas/atendimento.service.js';
import { ConsultasModule } from '../consultas/consultas.module.js';
import {
  consultaComVinculoClinicoAtivo,
  horarioComVinculoClinicoAtivo,
} from '../consultas/acesso-clinico.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import { gerarHashSenha, verificarSenha } from '../common/senha.js';
import { dataParaIso, estimarElegibilidade } from '../common/elegibilidade.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AgendarDto,
  AgendaQueryDto,
  AtendimentoDto,
  CancelarConsultaMedicoDto,
  BolsaDto,
  DisponibilidadeDto,
  MovimentoBolsaDto,
  PerfilPacienteDto,
  SenhaAtualDto,
  TrocarSenhaDto,
  VerificacaoHospitalDto,
} from './plataforma.dto.js';

@Controller()
export class PlataformaController {
  constructor(private readonly prisma: PrismaService, private readonly agendamentos: AgendamentoService,
    private readonly atendimentos: AtendimentoService) {}
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
  @Perfis('PACIENTE') @Get('paciente/orientacoes-doacao')
  @Auditar({ acao: 'VISUALIZAR_ORIENTACOES_DOACAO', entidade: 'paciente' })
  async orientacoes(
    @UsuarioAtual() u: UsuarioAutenticado,
  ) {
    const p = await this.prisma.paciente.findUniqueOrThrow({
      where: { usuarioId: u.id },
      include: { doacoes: { select: { dataColeta: true, doouAntesDos60Confirmado: true } } },
    });
    return estimarElegibilidade({
      dataNascimento: dataParaIso(p.dataNascimento),
      sexo: p.sexo,
      pesoKg: Number(p.pesoKg),
      doacoes: p.doacoes.map((d) => dataParaIso(d.dataColeta)),
      doouAntesDos60Confirmado: p.doacoes.some((d) => d.doouAntesDos60Confirmado === true),
    });
  }

  @Perfis('PACIENTE') @Get('paciente/perfil')
  @Auditar({ acao: 'VISUALIZAR_PERFIL', entidade: 'paciente' })
  async perfil(
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
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM usuario WHERE id=${u.id}::uuid FOR UPDATE`;
      const existente = await tx.solicitacaoExclusao.findFirst({
        where: {
          usuarioId: u.id,
          status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
        },
        select: { id: true, status: true },
      });
      return (
        existente ??
        tx.solicitacaoExclusao.create({
          data: { usuarioId: u.id },
          select: { id: true, status: true },
        })
      );
    });
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
    return this.agendamentos.agendar(u.id, dto);
  }
  @Perfis('MEDICO') @Get('medico/hospitais') async hospitais(
    @UsuarioAtual() u: UsuarioAutenticado,
  ) {
    return this.prisma.hospital.findMany({
      where: {
        ativo: true,
        OR: [
          { medicos: { some: { usuarioId: u.id, vinculos: { none: {} } } } },
          { vinculosMedicos: { some: { medicoId: u.id, ativo: true } } },
        ],
      },
      select: { id: true, nome: true, cidade: true, estado: true },
    });
  }
  @Perfis('MEDICO') @Get('medico/agenda')
  @Auditar({ acao: 'VISUALIZAR_AGENDA_CLINICA', entidade: 'consulta' })
  async agenda(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Query() q: AgendaQueryDto,
  ) {
    if (q.hospitalId) await this.validarVinculo(u, q.hospitalId);
    return this.prisma.disponibilidadeMedico.findMany({
      where: {
        AND: [
          horarioComVinculoClinicoAtivo(u.id),
          ...(q.periodo === 'historico' || (!q.periodo && q.incluirRealizadas === 'true') ? [] : [{ canceladaEm: null }]),
          ...(q.periodo === 'proximos' ? [{ fim: { gte: new Date() } }] : []),
          ...(q.periodo === 'historico' ? [{ OR: [{ fim: { lt: new Date() } }, { canceladaEm: { not: null } }] }] : []),
          ...(q.hospitalId
            ? [
                {
                  OR: [
                    { hospitalId: q.hospitalId },
                    { hospitalId: null, medico: { hospitalId: q.hospitalId } },
                  ],
                },
              ]
            : []),
        ],
      },
      orderBy: [{ inicio: q.periodo === 'historico' ? 'desc' : 'asc' }, { id: q.periodo === 'historico' ? 'desc' : 'asc' }],
      take: q.tamanhoPagina ?? 100,
      skip: ((q.pagina ?? 1) - 1) * (q.tamanhoPagina ?? 100),
      select: {
        id: true,
        inicio: true,
        fim: true,
        hospitalId: true,
        canceladaEm: true,
        linkVideochamada: true,
        consultas: {
          where: {
            status: q.incluirRealizadas === 'true' ? { in: ['AGENDADA', 'REALIZADA', 'NAO_COMPARECEU', 'CANCELADA'] } : 'AGENDADA',
            paciente: { usuario: { status: 'ATIVO' } },
          },
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
  async atendimento(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtendimentoDto,
  ) {
    return this.atendimentos.registrar(u.id, id, dto);
  }
  @Perfis('MEDICO') @Get('medico/consultas/:id')
  @Auditar({ acao: 'VISUALIZAR_ATENDIMENTO', entidade: 'consulta' })
  detalhesAtendimento(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.atendimentos.detalhes(u.id, id);
  }
  @Perfis('MEDICO') @Post('medico/consultas/:id/cancelar')
  cancelarAtendimento(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarConsultaMedicoDto) {
    return this.atendimentos.cancelar(u.id, id, dto.motivo);
  }
  @Perfis('MEDICO') @Get('medico/exames')
  @Auditar({ acao: 'LISTAR_EXAMES_CLINICOS', entidade: 'exame' })
  async exames(
    @UsuarioAtual() u: UsuarioAutenticado,
  ) {
    const solicitacoes = await this.prisma.solicitacaoExame.findMany({
      where: { consulta: consultaComVinculoClinicoAtivo(u.id) },
      select: {
        id: true,
        descricao: true,
        solicitadoEm: true,
        consulta: {
          select: {
            id: true,
            status: true,
            motivoReprovacao: true,
            paciente: { select: { usuario: { select: { nome: true } },
              consultas: { orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], take: 1, select: { id: true } } } },
          },
        },
        exames: {
          select: {
            id: true,
            situacao: true,
            nomeOriginal: true,
            enviadoEm: true,
            motivoReprovacao: true,
            avaliadoEm: true,
            tipoSanguineoId: true,
          },
          orderBy: [{ enviadoEm: 'desc' }, { id: 'desc' }],
        },
      },
      orderBy: { solicitadoEm: 'desc' },
      take: 100,
    });
    return solicitacoes.map((s) => ({
      ...s,
      consulta: { ...s.consulta,
        paciente: { usuario: s.consulta.paciente.usuario },
        cicloAtual: s.consulta.paciente.consultas[0]?.id === s.consulta.id },
      exames: s.exames.map((e, index) => ({
        ...e,
        podeAvaliar:
          index === 0 &&
          e.situacao === 'EM_ANALISE' &&
          s.consulta.status === 'REALIZADA' && !s.consulta.motivoReprovacao &&
          s.consulta.paciente.consultas[0]?.id === s.consulta.id,
      })),
    }));
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
@Module({ imports: [ConsultasModule], controllers: [PlataformaController] })
export class PlataformaModule {}
