import { Module } from '@nestjs/common';
import { HospitalDoRepresentanteService } from './hospital-do-representante.service.js';
import { MedicosController } from './medicos.controller.js';
import { MedicosService } from './medicos.service.js';
import { NecessidadesController } from './necessidades.controller.js';
import { NecessidadesService } from './necessidades.service.js';

@Module({
  controllers: [MedicosController, NecessidadesController],
  providers: [HospitalDoRepresentanteService, MedicosService, NecessidadesService],
})
export class RepresentanteModule {}
