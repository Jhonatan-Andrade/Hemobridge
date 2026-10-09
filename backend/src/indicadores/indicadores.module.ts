import { Module } from '@nestjs/common';
import { HospitalDoRepresentanteService } from '../representante/hospital-do-representante.service.js';
import { IndicadoresAdminController, IndicadoresRepresentanteController } from './indicadores.controller.js';
import { IndicadoresService } from './indicadores.service.js';
import { RelatoriosService } from './relatorios.service.js';

// UC23 – Dashboards e UC24 – Relatórios (RF26).
@Module({
  controllers: [IndicadoresRepresentanteController, IndicadoresAdminController],
  providers: [IndicadoresService, RelatoriosService, HospitalDoRepresentanteService],
})
export class IndicadoresModule {}
