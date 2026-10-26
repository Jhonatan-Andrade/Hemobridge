import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { AtualizarNecessidadesDto, HistoricoNecessidadesDto } from './dto/necessidade.dto.js';
import { HospitalDoRepresentanteService } from './hospital-do-representante.service.js';
import { NecessidadesService } from './necessidades.service.js';
import { Auditar } from '../auditoria/auditar.decorator.js';

// UC18 – Atualizar Necessidades de Estoque (RF17)
@Perfis('REPRESENTANTE')
@Controller('representante/necessidades')
export class NecessidadesController {
  constructor(
    private readonly necessidades: NecessidadesService,
    private readonly hospital: HospitalDoRepresentanteService,
  ) {}

  @Get()
  async listar(@UsuarioAtual() rep: UsuarioAutenticado) {
    return this.necessidades.listar(await this.hospital.obterId(rep.id));
  }

  @Auditar({ acao: 'ATUALIZAR_NECESSIDADES', entidade: 'necessidade_estoque' })
  @Put()
  async atualizar(@UsuarioAtual() rep: UsuarioAutenticado, @Body() dto: AtualizarNecessidadesDto) {
    return this.necessidades.atualizar(await this.hospital.obterId(rep.id), rep.id, dto);
  }

  @Get('historico')
  async historico(@UsuarioAtual() rep: UsuarioAutenticado, @Query() filtros: HistoricoNecessidadesDto) {
    return this.necessidades.historico(await this.hospital.obterId(rep.id), filtros);
  }
}
