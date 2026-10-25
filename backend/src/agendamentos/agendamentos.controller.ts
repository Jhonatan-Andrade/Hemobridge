import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { AgendamentosService } from './agendamentos.service.js';
import { HorarioEscolhidoDto } from './dto/agendamento.dto.js';

// RF06 / RF07: agendamentos do paciente logado.
@Perfis('PACIENTE')
@Controller('agendamentos')
export class AgendamentosController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  @Post()
  agendar(@UsuarioAtual() paciente: UsuarioAutenticado, @Body() dto: HorarioEscolhidoDto) {
    return this.agendamentos.agendar(paciente.id, dto.horarioId);
  }

  @Get('meus')
  meus(@UsuarioAtual() paciente: UsuarioAutenticado) {
    return this.agendamentos.meus(paciente.id);
  }

  @Patch(':id/cancelar')
  cancelar(@UsuarioAtual() paciente: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.agendamentos.cancelar(paciente.id, id);
  }

  @Patch(':id/reagendar')
  reagendar(
    @UsuarioAtual() paciente: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HorarioEscolhidoDto,
  ) {
    return this.agendamentos.reagendar(paciente.id, id, dto.horarioId);
  }
}
