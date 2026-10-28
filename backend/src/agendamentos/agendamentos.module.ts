import { Module } from '@nestjs/common';
import { AgendamentosController } from './agendamentos.controller.js';
import { AgendamentosService } from './agendamentos.service.js';

@Module({
  controllers: [AgendamentosController],
  providers: [AgendamentosService],
})
export class AgendamentosModule {}
