import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { AgendaService } from './agenda.service.js';
import { ListarAgendaDto, NovosHorariosDto } from './dto/agenda.dto.js';

// UC13 – Gerenciar Agenda (RF03)
@Perfis('MEDICO')
@Controller('medico/agenda')
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  @Get()
  listar(@UsuarioAtual() medico: UsuarioAutenticado, @Query() filtros: ListarAgendaDto) {
    return this.agenda.listar(medico.id, filtros);
  }

  @Post()
  criar(@UsuarioAtual() medico: UsuarioAutenticado, @Body() dto: NovosHorariosDto) {
    return this.agenda.criar(medico.id, dto);
  }

  @Delete(':id')
  remover(@UsuarioAtual() medico: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.agenda.remover(medico.id, id);
  }
}
