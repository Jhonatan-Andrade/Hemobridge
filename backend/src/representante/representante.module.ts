import { Module } from '@nestjs/common';
import { DoacoesController } from './doacoes.controller.js';
import { DoacoesService } from './doacoes.service.js';
import { HospitalDoRepresentanteService } from './hospital-do-representante.service.js';
import { MedicosController } from './medicos.controller.js';
import { MedicosService } from './medicos.service.js';
import { NecessidadesController } from './necessidades.controller.js';
import { NecessidadesService } from './necessidades.service.js';

@Module({
  controllers: [MedicosController, NecessidadesController, DoacoesController],
  providers: [HospitalDoRepresentanteService, MedicosService, NecessidadesService, DoacoesService],
})
export class RepresentanteModule {}
