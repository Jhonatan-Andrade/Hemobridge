import { Controller, Get, Param, ParseUUIDPipe, Post, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { ArquivoExameInterceptor, type ArquivoRecebido, disposicaoInline } from '../common/arquivo-exame.js';
import { ExamesPacienteService } from './exames.service.js';

// UC11 – Anexar Resultado de Exame (RF07)
@Perfis('PACIENTE')
@Controller('paciente/exames')
export class ExamesPacienteController {
  constructor(private readonly exames: ExamesPacienteService) {}

  @Get()
  listar(@UsuarioAtual() paciente: UsuarioAutenticado) {
    return this.exames.listar(paciente.id);
  }

  // multipart/form-data com o campo "arquivo".
  @Post(':id/resultado')
  @UseInterceptors(ArquivoExameInterceptor)
  enviarResultado(
    @UsuarioAtual() paciente: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() arquivo?: ArquivoRecebido,
  ) {
    return this.exames.enviarResultado(paciente.id, id, arquivo);
  }

  @Get(':id/envios/:exameId/arquivo')
  async arquivo(
    @UsuarioAtual() paciente: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exameId', ParseUUIDPipe) exameId: string,
  ) {
    const { conteudo, mimeType, nomeArquivo } = await this.exames.arquivo(paciente.id, id, exameId);
    return new StreamableFile(conteudo, { type: mimeType, disposition: disposicaoInline(nomeArquivo) });
  }
}
