import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { CancelarConsultaDto, HorariosDisponiveisDto, ReagendarConsultaDto } from './dto/consulta.dto.js';
import { MinhasConsultasService } from './minhas-consultas.service.js';

// UC10 – Cancelar ou Reagendar Consulta (RF05). Tela P04.
@Perfis('PACIENTE')
@Controller('paciente/consultas')
export class MinhasConsultasController {
  constructor(private readonly consultas: MinhasConsultasService) {}

  @Get()
  listar(@UsuarioAtual() paciente: UsuarioAutenticado) {
    return this.consultas.listar(paciente.id);
  }

  @Get('horarios-disponiveis')
  horarios(@UsuarioAtual() paciente: UsuarioAutenticado, @Query() filtros: HorariosDisponiveisDto) {
    return this.consultas.horariosDisponiveis(paciente.id, filtros);
  }

  @Post(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  cancelar(
    @UsuarioAtual() paciente: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarConsultaDto,
  ) {
    return this.consultas.cancelar(paciente.id, id, dto.motivo);
  }

  @Post(':id/reagendar')
  @HttpCode(HttpStatus.OK)
  reagendar(
    @UsuarioAtual() paciente: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReagendarConsultaDto,
  ) {
    return this.consultas.reagendar(paciente.id, id, dto.disponibilidadeId);
  }
}
