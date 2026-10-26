import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Publico, UsuarioAtual } from '../auth/decorators.js';
import { ConsultarHospitaisDto } from './dto/consultar-hospitais.dto.js';
import { HospitaisService } from './hospitais.service.js';

// Consulta pública de bancos de sangue (RF20–RF22).
@Controller('hospitais')
export class HospitaisController {
  constructor(private readonly hospitaisService: HospitaisService) {}

  @Publico()
  @Get()
  listar(@Query() filtros: ConsultarHospitaisDto) {
    return this.hospitaisService.listar(filtros);
  }

  // UC03 FA01: exige login; o frontend usa para pré-preencher os filtros.
  @Get('filtros-padrao')
  filtrosPadrao(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.hospitaisService.filtrosPadrao(usuario.id);
  }

  @Publico()
  @Get(':id')
  detalhar(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hospitaisService.detalhar(id);
  }
}
