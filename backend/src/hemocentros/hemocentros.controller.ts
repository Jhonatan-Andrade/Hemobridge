import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { MembroAtual, Papeis, Perfis, Publico } from '../auth/decorators.js';
import {
  AtualizarHemocentroDto,
  ConsultarHemocentrosDto,
  CriarHemocentroDto,
  ListarHemocentrosGestaoDto,
  NovoAdminHemocentroDto,
} from './dto/hemocentro.dto.js';
import { AtualizarNecessidadesDto } from './dto/necessidade.dto.js';
import { GestaoHemocentrosService } from './gestao-hemocentros.service.js';
import { HemocentrosService } from './hemocentros.service.js';
import { NecessidadesService } from './necessidades.service.js';

@Controller('hemocentros')
export class HemocentrosController {
  constructor(
    private readonly hemocentros: HemocentrosService,
    private readonly gestao: GestaoHemocentrosService,
    private readonly necessidades: NecessidadesService,
  ) {}

  // ---- Administrador da plataforma (RF15). Rotas fixas antes de ":id". ----

  @Perfis('ADMIN_PLATAFORMA')
  @Get('gestao')
  listarGestao(@Query() filtros: ListarHemocentrosGestaoDto) {
    return this.gestao.listar(filtros);
  }

  @Perfis('ADMIN_PLATAFORMA')
  @Get('gestao/:id')
  detalharGestao(@Param('id', ParseUUIDPipe) id: string) {
    return this.gestao.detalhar(id);
  }

  @Perfis('ADMIN_PLATAFORMA')
  @Post()
  criar(@Body() dto: CriarHemocentroDto) {
    return this.gestao.criar(dto);
  }

  @Perfis('ADMIN_PLATAFORMA')
  @Patch(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarHemocentroDto) {
    return this.gestao.atualizar(id, dto);
  }

  @Perfis('ADMIN_PLATAFORMA')
  @Post(':id/admins')
  adicionarAdmin(@Param('id', ParseUUIDPipe) id: string, @Body() dto: NovoAdminHemocentroDto) {
    return this.gestao.adicionarAdmin(id, dto);
  }

  @Perfis('ADMIN_PLATAFORMA')
  @Post(':id/admins/:usuarioId/reenviar-senha-provisoria')
  @HttpCode(HttpStatus.OK)
  reenviarSenhaAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
  ) {
    return this.gestao.reenviarSenhaAdmin(id, usuarioId);
  }

  // ---- Consulta pública (RF03, RF05, RF18) ----

  @Publico()
  @Get()
  listar(@Query() filtros: ConsultarHemocentrosDto) {
    return this.hemocentros.listar(filtros);
  }

  @Publico()
  @Get(':id')
  detalhar(@Param('id', ParseUUIDPipe) id: string) {
    return this.hemocentros.detalhar(id);
  }

  @Publico()
  @Get(':id/necessidades')
  listarNecessidades(@Param('id', ParseUUIDPipe) id: string) {
    return this.necessidades.listar(id);
  }

  // RF17: escrita só do Admin do hemocentro dono.
  @Papeis('ADMIN_HEMOCENTRO')
  @Put(':id/necessidades')
  atualizarNecessidades(
    @Param('id', ParseUUIDPipe) id: string,
    @MembroAtual() membro: MembroDaEquipe,
    @Body() dto: AtualizarNecessidadesDto,
  ) {
    return this.necessidades.atualizar(id, membro, dto);
  }
}
