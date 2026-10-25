import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { MembroAtual, Papeis } from '../auth/decorators.js';
import { DoacoesService } from './doacoes.service.js';
import { AgendaDoDiaDto, RegistrarDoacaoDto } from './dto/doacao.dto.js';

// RF10: agenda do dia, por horário, no hemocentro do médico.
@Papeis('MEDICO')
@Controller('agenda')
export class AgendaController {
  constructor(private readonly doacoes: DoacoesService) {}

  @Get()
  agenda(@MembroAtual() medico: MembroDaEquipe, @Query() { data }: AgendaDoDiaDto) {
    return this.doacoes.agenda(medico, data);
  }
}

// RF11: registro da doação, vinculado ao hemocentro do médico.
@Papeis('MEDICO')
@Controller('doacoes')
export class DoacoesController {
  constructor(private readonly doacoes: DoacoesService) {}

  @Post()
  registrar(@MembroAtual() medico: MembroDaEquipe, @Body() dto: RegistrarDoacaoDto) {
    return this.doacoes.registrar(medico, dto);
  }
}
