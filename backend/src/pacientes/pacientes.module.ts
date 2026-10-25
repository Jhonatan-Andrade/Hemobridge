import { Module } from '@nestjs/common';
import { ConsultasPacienteController } from './consultas.controller.js';
import { ConsultasPacienteService } from './consultas.service.js';
import { ExamesPacienteController } from './exames.controller.js';
import { ExamesPacienteService } from './exames.service.js';
import { PacientesController } from './pacientes.controller.js';
import { PacientesService } from './pacientes.service.js';

@Module({
  controllers: [PacientesController, ConsultasPacienteController, ExamesPacienteController],
  providers: [PacientesService, ConsultasPacienteService, ExamesPacienteService],
})
export class PacientesModule {}
