import { Module } from '@nestjs/common';
import { AtivacaoService } from './ativacao.service.js';
import { HistoricoService } from './historico.service.js';
import { PacientesController } from './pacientes.controller.js';
import { PacientesService } from './pacientes.service.js';

@Module({
  controllers: [PacientesController],
  providers: [PacientesService, AtivacaoService, HistoricoService],
})
export class PacientesModule {}
