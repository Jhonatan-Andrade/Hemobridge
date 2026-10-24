import { Module } from '@nestjs/common';
import { HospitaisController } from './hospitais.controller.js';
import { HospitaisService } from './hospitais.service.js';
import { LocaisRecomendadosController } from './locais-recomendados.controller.js';
import { LocaisRecomendadosService } from './locais-recomendados.service.js';

@Module({
  controllers: [HospitaisController, LocaisRecomendadosController],
  providers: [HospitaisService, LocaisRecomendadosService],
})
export class HospitaisModule {}
