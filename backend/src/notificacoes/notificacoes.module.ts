import { Global, Module } from '@nestjs/common';
import { CaixaNotificacoesService } from './caixa-notificacoes.service.js';
import { NecessidadeCriticaService } from './necessidade-critica.service.js';
import { NotificacoesController } from './notificacoes.controller.js';
import { NotificacoesService } from './notificacoes.service.js';

// Global: qualquer módulo injeta NotificacoesService para avisar usuários.
@Global()
@Module({
  controllers: [NotificacoesController],
  providers: [NotificacoesService, CaixaNotificacoesService, NecessidadeCriticaService],
  exports: [NotificacoesService, NecessidadeCriticaService],
})
export class NotificacoesModule {}
