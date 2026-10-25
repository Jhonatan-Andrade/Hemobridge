import { Module } from '@nestjs/common';
import { GestaoHemocentrosService } from './gestao-hemocentros.service.js';
import { HemocentrosController } from './hemocentros.controller.js';
import { HemocentrosService } from './hemocentros.service.js';
import { NecessidadesService } from './necessidades.service.js';

@Module({
  controllers: [HemocentrosController],
  providers: [HemocentrosService, GestaoHemocentrosService, NecessidadesService],
})
export class HemocentrosModule {}
