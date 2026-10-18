import { Module } from '@nestjs/common';
import { MinhasConsultasController } from './minhas-consultas.controller.js';
import { MinhasConsultasService } from './minhas-consultas.service.js';

// Agenda e teleconsulta. O agendamento (UC09) e a agenda do médico (UC13/UC14)
// entram neste módulo nas tarefas HEM-39, HEM-41 e HEM-43.
@Module({
  controllers: [MinhasConsultasController],
  providers: [MinhasConsultasService],
})
export class ConsultasModule {}
