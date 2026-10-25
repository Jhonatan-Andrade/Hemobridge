import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, StreamableFile } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { disposicaoInline } from '../common/arquivo-exame.js';
import { AprovarExameDto, ListarExamesMedicoDto, ReprovarExameDto } from './dto/exame.dto.js';
import { ExamesMedicoService } from './exames.service.js';

// UC16 – Avaliar Cadastro do Paciente (RF08–RF10, RF12)
@Perfis('MEDICO')
@Controller('medico/exames')
export class ExamesMedicoController {
  constructor(private readonly exames: ExamesMedicoService) {}

  @Get()
  listar(@UsuarioAtual() medico: UsuarioAutenticado, @Query() filtros: ListarExamesMedicoDto) {
    return this.exames.listar(medico.id, filtros);
  }

  @Get(':id')
  detalhar(@UsuarioAtual() medico: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.exames.detalhar(medico.id, id);
  }

  @Get(':id/envios/:exameId/arquivo')
  async arquivo(
    @UsuarioAtual() medico: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exameId', ParseUUIDPipe) exameId: string,
  ) {
    const { conteudo, mimeType, nomeArquivo } = await this.exames.arquivo(medico.id, id, exameId);
    return new StreamableFile(conteudo, { type: mimeType, disposition: disposicaoInline(nomeArquivo) });
  }

  @Post(':id/aprovar')
  @HttpCode(HttpStatus.OK)
  aprovar(
    @UsuarioAtual() medico: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AprovarExameDto,
  ) {
    return this.exames.aprovar(medico.id, id, dto);
  }

  @Post(':id/reprovar')
  @HttpCode(HttpStatus.OK)
  reprovar(
    @UsuarioAtual() medico: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReprovarExameDto,
  ) {
    return this.exames.reprovar(medico.id, id, dto);
  }
}
