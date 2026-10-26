import { Module } from '@nestjs/common';
import { AgendaController, AtendimentosController, DoacoesController } from './doacoes.controller.js';
import { DoacoesService } from './doacoes.service.js';

@Module({
  controllers: [AgendaController, AtendimentosController, DoacoesController],
  providers: [DoacoesService],
})
export class DoacoesModule {}
