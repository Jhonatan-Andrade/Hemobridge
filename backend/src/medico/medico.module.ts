import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller.js';
import { AgendaService } from './agenda.service.js';

// Área do médico: agenda, atendimento e avaliação de exames (UC13–UC16).
@Module({
  controllers: [AgendaController],
  providers: [AgendaService],
})
export class MedicoModule {}
