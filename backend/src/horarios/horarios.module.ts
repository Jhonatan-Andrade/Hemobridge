import { Module } from '@nestjs/common';
import { HorariosController, HorariosPublicosController } from './horarios.controller.js';
import { HorariosService } from './horarios.service.js';

@Module({
  controllers: [HorariosController, HorariosPublicosController],
  providers: [HorariosService],
})
export class HorariosModule {}
