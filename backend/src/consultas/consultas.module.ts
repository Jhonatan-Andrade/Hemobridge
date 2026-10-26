import { Module } from '@nestjs/common';
import { MinhasConsultasController } from './minhas-consultas.controller.js';
import { MinhasConsultasService } from './minhas-consultas.service.js';
import { PreTriagemController } from './pre-triagem.controller.js';
import { PreTriagemService } from './pre-triagem.service.js';
import { AgendamentoService } from './agendamento.service.js';
import { AtendimentoService } from './atendimento.service.js';

@Module({
  controllers: [MinhasConsultasController, PreTriagemController],
  providers: [MinhasConsultasService, PreTriagemService, AgendamentoService, AtendimentoService],
  exports: [AgendamentoService, AtendimentoService],
})
export class ConsultasModule {}
