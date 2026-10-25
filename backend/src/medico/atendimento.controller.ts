import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { AtendimentoService } from './atendimento.service.js';
import { CancelarConsultaMedicoDto, ListarConsultasMedicoDto, RegistrarRealizadaDto } from './dto/atendimento.dto.js';

// UC14 – Registrar Atendimento e UC15 – Solicitar Exames (RF06, RF29)
@Perfis('MEDICO')
@Controller('medico/consultas')
export class AtendimentoController {
  constructor(private readonly atendimento: AtendimentoService) {}

  @Get()
  listar(@UsuarioAtual() medico: UsuarioAutenticado, @Query() filtros: ListarConsultasMedicoDto) {
    return this.atendimento.listar(medico.id, filtros);
  }

  @Get(':id')
  detalhar(@UsuarioAtual() medico: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.atendimento.detalhar(medico.id, id);
  }

  @Post(':id/realizada')
  @HttpCode(HttpStatus.OK)
  registrarRealizada(
    @UsuarioAtual() medico: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarRealizadaDto,
  ) {
    return this.atendimento.registrarRealizada(medico.id, id, dto);
  }

  @Post(':id/nao-compareceu')
  @HttpCode(HttpStatus.OK)
  registrarNaoComparecimento(@UsuarioAtual() medico: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.atendimento.registrarNaoComparecimento(medico.id, id);
  }

  @Post(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  cancelar(
    @UsuarioAtual() medico: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarConsultaMedicoDto,
  ) {
    return this.atendimento.cancelar(medico.id, id, dto);
  }
}
