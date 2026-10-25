import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { ConsultasPacienteService } from './consultas.service.js';
import { AgendarConsultaDto, HorariosDisponiveisDto, ReagendarConsultaDto } from './dto/consulta.dto.js';

// UC09 – Agendar Consulta e UC10 – Cancelar ou Reagendar Consulta (RF04, RF05)
@Perfis('PACIENTE')
@Controller('paciente/consultas')
export class ConsultasPacienteController {
  constructor(private readonly consultas: ConsultasPacienteService) {}

  // RN18: termo apresentado no passo 7 do agendamento.
  @Get('termo-telessaude')
  termoTelessaude() {
    return this.consultas.termoTelessaude();
  }

  @Get('horarios')
  horarios(@UsuarioAtual() paciente: UsuarioAutenticado, @Query() filtros: HorariosDisponiveisDto) {
    return this.consultas.horariosDisponiveis(paciente.id, filtros);
  }

  @Get()
  listar(@UsuarioAtual() paciente: UsuarioAutenticado) {
    return this.consultas.listar(paciente.id);
  }

  @Get(':id')
  detalhar(@UsuarioAtual() paciente: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.consultas.detalhar(paciente.id, id);
  }

  @Post()
  agendar(@UsuarioAtual() paciente: UsuarioAutenticado, @Body() dto: AgendarConsultaDto, @Ip() ip: string) {
    return this.consultas.agendar(paciente.id, dto, ip);
  }

  @Post(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  cancelar(@UsuarioAtual() paciente: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.consultas.cancelar(paciente.id, id);
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
