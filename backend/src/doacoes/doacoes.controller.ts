import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { MembroAtual, Papeis } from '../auth/decorators.js';
import { DoacoesService } from './doacoes.service.js';
import { AgendaDoDiaDto, AtendimentosDto, RegistrarDoacaoDto, RegistrarExamesDto } from './dto/doacao.dto.js';

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

// RF11: registro da doação (triagem, aferições, coleta e aptidão), vinculado ao hemocentro do médico,
// e os dados clínicos que só o médico desse hemocentro lê: triagem e exames da amostra.
@Papeis('MEDICO')
@Controller('doacoes')
export class DoacoesController {
  constructor(private readonly doacoes: DoacoesService) {}

  @Post()
  registrar(@MembroAtual() medico: MembroDaEquipe, @Body() dto: RegistrarDoacaoDto) {
    return this.doacoes.registrar(medico, dto);
  }

  @Get(':id')
  detalhe(@MembroAtual() medico: MembroDaEquipe, @Param('id', ParseUUIDPipe) id: string) {
    return this.doacoes.detalhe(medico, id);
  }

  @Post(':id/exames')
  registrarExames(
    @MembroAtual() medico: MembroDaEquipe,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarExamesDto,
  ) {
    return this.doacoes.registrarExames(medico, id, dto);
  }
}
