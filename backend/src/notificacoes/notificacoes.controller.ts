import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { UsuarioAtual } from '../auth/decorators.js';
import { CaixaNotificacoesService } from './caixa-notificacoes.service.js';
import { ListarNotificacoesDto } from './dto/listar-notificacoes.dto.js';

// UC12 – Visualizar Notificações (RF30). Cada usuário vê só as próprias.
@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly caixa: CaixaNotificacoesService) {}

  @Get()
  listar(@UsuarioAtual() usuario: UsuarioAutenticado, @Query() filtros: ListarNotificacoesDto) {
    return this.caixa.listar(usuario.id, filtros);
  }

  // Contador do ícone de notificações (passo 1).
  @Get('nao-lidas')
  async naoLidas(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return { naoLidas: await this.caixa.contarNaoLidas(usuario.id) };
  }

  @Post('marcar-todas-lidas')
  @HttpCode(HttpStatus.OK)
  marcarTodasComoLidas(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.caixa.marcarTodasComoLidas(usuario.id);
  }

  @Get(':id')
  abrir(@UsuarioAtual() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.caixa.abrir(usuario.id, id);
  }
}
