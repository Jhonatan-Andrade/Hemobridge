import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { MembroAtual, Papeis } from '../auth/decorators.js';
import { DoacoesService } from './doacoes.service.js';
import { AgendaDoDiaDto, AtendimentosDto, RegistrarDoacaoDto } from './dto/doacao.dto.js';

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

// Histórico de atendimentos do próprio hemocentro, para o médico e o Admin do hemocentro.
@Papeis('MEDICO', 'ADMIN_HEMOCENTRO')
@Controller('atendimentos')
export class AtendimentosController {
  constructor(private readonly doacoes: DoacoesService) {}

  @Get()
  listar(@MembroAtual() membro: MembroDaEquipe, @Query() filtro: AtendimentosDto) {
    return this.doacoes.atendimentos(membro, filtro);
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
