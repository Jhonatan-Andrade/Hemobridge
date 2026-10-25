import { Module } from '@nestjs/common';
import { AgendaController, DoacoesController } from './doacoes.controller.js';
import { DoacoesService } from './doacoes.service.js';

@Module({
  controllers: [AgendaController, DoacoesController],
  providers: [DoacoesService],
})
export class DoacoesModule {}
