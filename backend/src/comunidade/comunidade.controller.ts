import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Perfis, Publico, UsuarioAtual } from '../auth/decorators.js';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ComunidadeService } from './comunidade.service.js';
import {
  CriarComentarioDto,
  CriarPublicacaoDto,
  DenunciarPublicacaoDto,
  ModerarConteudoDto,
  PaginaComunidadeDto,
  VERSAO_NORMAS,
} from './comunidade.dto.js';

@Controller('comunidade')
export class ComunidadeController {
  constructor(
    private readonly comunidade: ComunidadeService,
    private readonly prisma: PrismaService,
  ) {}
  @Publico() @Get('normas') normas() {
    return {
      versao: VERSAO_NORMAS,
      texto:
        'Converse sobre saúde e doação de sangue. Não publique dados pessoais, exames, diagnósticos individuais, publicidade enganosa, discriminação ou conteúdo ilegal. Orientações públicas não substituem avaliação profissional. Conteúdos podem ser denunciados e moderados.',
    };
  }
  @Publico() @Get('publicacoes') listar(@Query() q: PaginaComunidadeDto) {
    return this.comunidade.listar(q.pagina);
  }
  @Publico() @Get('publicacoes/:id') detalhe(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.comunidade.detalhe(id);
  }
  @Publico() @Get('publicacoes/:id/comentarios') comentarios(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: PaginaComunidadeDto,
  ) {
    return this.comunidade.comentarios(id, q.pagina);
  }
  @Get('minhas-reacoes') reacoes(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.comunidade.minhasReacoes(u.id);
  }
  @Post('publicacoes')
  @Auditar({ acao: 'PUBLICAR', entidade: 'publicacao' })
  criar(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Body() dto: CriarPublicacaoDto,
  ) {
    return this.comunidade.criar(u, dto);
  }
  @Post('publicacoes/:id/comentarios') comentar(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CriarComentarioDto,
  ) {
    return this.comunidade.comentar(u.id, id, dto);
  }
  @Put('publicacoes/:id/reacao') curtir(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.comunidade.reagir(u.id, id, true);
  }
  @Delete('publicacoes/:id/reacao') descurtir(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.comunidade.reagir(u.id, id, false);
  }
  @Post('publicacoes/:id/denuncias') async denunciar(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DenunciarPublicacaoDto,
  ) {
    await this.comunidade.detalhe(id);
    await this.prisma.denunciaPublicacao.upsert({
      where: { publicacaoId_usuarioId: { publicacaoId: id, usuarioId: u.id } },
      create: { publicacaoId: id, usuarioId: u.id, motivo: dto.motivo },
      update: { motivo: dto.motivo },
    });
    return { mensagem: 'Denúncia recebida para análise.' };
  }
  @Perfis('ADMINISTRADOR') @Get('denuncias') denuncias() {
    return this.prisma.denunciaPublicacao.findMany({
      orderBy: { criadaEm: 'desc' },
      take: 100,
      select: { id: true, publicacaoId: true, motivo: true, criadaEm: true },
    });
  }
  @Perfis('ADMINISTRADOR')
  @Patch('publicacoes/:id')
  @Auditar({ acao: 'MODERAR', entidade: 'publicacao' })
  moderar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerarConteudoDto,
  ) {
    return this.prisma.publicacao.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, status: true },
    });
  }
  @Perfis('ADMINISTRADOR')
  @Patch('comentarios/:id')
  @Auditar({ acao: 'MODERAR', entidade: 'comentario' })
  moderarComentario(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerarConteudoDto,
  ) {
    return this.prisma.comentario.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, status: true },
    });
  }
}
