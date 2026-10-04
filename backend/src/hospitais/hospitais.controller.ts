import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Publico } from '../auth/decorators.js';
import { ConsultarHospitaisDto } from './dto/consultar-hospitais.dto.js';
import { HospitaisService } from './hospitais.service.js';

// Consulta pública de bancos de sangue (RF20–RF22).
@Publico()
@Controller('hospitais')
export class HospitaisController {
  constructor(private readonly hospitaisService: HospitaisService) {}

  @Get()
  listar(@Query() filtros: ConsultarHospitaisDto) {
    return this.hospitaisService.listar(filtros);
  }

  @Get(':id')
  detalhar(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hospitaisService.detalhar(id);
  }
}
