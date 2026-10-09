import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  type ExceptionFilter,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  PayloadTooLargeException,
  Post,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { MENSAGEM_ARQUIVO_INVALIDO, TAMANHO_MAXIMO_EXAME } from '../armazenamento/arquivo-exame.js';
import { SolicitarExamesDto } from './dto/exame.dto.js';
import { type ArquivoParaDownload, type ArquivoRecebido, ExamesService } from './exames.service.js';

const arquivo = (a: ArquivoParaDownload) =>
  new StreamableFile(a.conteudo, {
    type: a.mimeType,
    disposition: `inline; filename*=UTF-8''${encodeURIComponent(a.nomeOriginal)}`,
    length: a.conteudo.length,
  });

/** RN19: arquivo acima de 5 MB (barrado pelo multer) recebe a mensagem do caso de uso. */
@Catch(PayloadTooLargeException)
class ArquivoGrandeFilter implements ExceptionFilter {
  catch(_: PayloadTooLargeException, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(413)
      .json({ statusCode: 413, error: 'Payload Too Large', message: MENSAGEM_ARQUIVO_INVALIDO });
  }
}

// UC11 – Anexar Resultado de Exame (RF07, RF10). Tela P05.
@Perfis('PACIENTE')
@Controller('paciente/exames')
export class MeusExamesController {
  constructor(private readonly exames: ExamesService) {}

  @Get()
  listar(@UsuarioAtual() paciente: UsuarioAutenticado) {
    return this.exames.meusExames(paciente.id);
  }

  @Post(':solicitacaoId/envios')
  @UseFilters(ArquivoGrandeFilter)
  @UseInterceptors(
    FileInterceptor('arquivo', {
      // Recusa no upload o que passa de 5 MB (RN19), sem ler o resto do arquivo.
      limits: { fileSize: TAMANHO_MAXIMO_EXAME, files: 1 },
    }),
  )
  async enviar(
    @UsuarioAtual() paciente: UsuarioAutenticado,
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
    @UploadedFile() arquivoEnviado: ArquivoRecebido | undefined,
  ) {
    return this.exames.enviarResultado(paciente.id, solicitacaoId, arquivoEnviado);
  }

  @Get('envios/:exameId/arquivo')
  async baixar(
    @UsuarioAtual() paciente: UsuarioAutenticado,
    @Param('exameId', ParseUUIDPipe) exameId: string,
    @Ip() ip: string,
  ) {
    return arquivo(await this.exames.arquivoDoPaciente(paciente.id, exameId, ip));
  }
}

// UC15 – Solicitar Exames (RF06) e acesso do médico ao arquivo (UC16).
@Perfis('MEDICO')
@Controller('medico')
export class ExamesMedicoController {
  constructor(private readonly exames: ExamesService) {}

  @Post('consultas/:consultaId/solicitar-exames')
  solicitar(
    @UsuarioAtual() medico: UsuarioAutenticado,
    @Param('consultaId', ParseUUIDPipe) consultaId: string,
    @Body() dto: SolicitarExamesDto,
  ) {
    return this.exames.solicitar(medico.id, consultaId, dto);
  }

  @Get('exames/:exameId/arquivo')
  async baixar(
    @UsuarioAtual() medico: UsuarioAutenticado,
    @Param('exameId', ParseUUIDPipe) exameId: string,
    @Ip() ip: string,
  ) {
    return arquivo(await this.exames.arquivoDoMedico(medico.id, exameId, ip));
  }
}
