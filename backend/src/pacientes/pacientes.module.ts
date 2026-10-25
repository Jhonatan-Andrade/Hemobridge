import { Module } from '@nestjs/common';
import { ConsultasPacienteController } from './consultas.controller.js';
import { ConsultasPacienteService } from './consultas.service.js';
import { PacientesController } from './pacientes.controller.js';
import { PacientesService } from './pacientes.service.js';

@Module({
  controllers: [PacientesController, ConsultasPacienteController],
  providers: [PacientesService, ConsultasPacienteService],
})
export class PacientesModule {}
