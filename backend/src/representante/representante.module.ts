import { Module } from '@nestjs/common';
import { HospitalDoRepresentanteService } from './hospital-do-representante.service.js';
import { MedicosController } from './medicos.controller.js';
import { MedicosService } from './medicos.service.js';

@Module({
  controllers: [MedicosController],
  providers: [HospitalDoRepresentanteService, MedicosService],
})
export class RepresentanteModule {}
