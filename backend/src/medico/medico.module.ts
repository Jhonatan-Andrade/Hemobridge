import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller.js';
import { AgendaService } from './agenda.service.js';
import { AtendimentoController } from './atendimento.controller.js';
import { AtendimentoService } from './atendimento.service.js';
import { ExamesMedicoController } from './exames.controller.js';
import { ExamesMedicoService } from './exames.service.js';

// Área do médico: agenda, atendimento e avaliação de exames (UC13–UC16).
@Module({
  controllers: [AgendaController, AtendimentoController, ExamesMedicoController],
  providers: [AgendaService, AtendimentoService, ExamesMedicoService],
})
export class MedicoModule {}
