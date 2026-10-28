import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { MembroAtual, Papeis, Publico } from '../auth/decorators.js';
import { AtualizarHorarioDto, LoteHorariosDto, NovoHorarioDto, PeriodoDto } from './dto/horario.dto.js';
import { HorariosService } from './horarios.service.js';

// RF08: o Admin do hemocentro gerencia os horários e vagas do próprio hemocentro.
@Papeis('ADMIN_HEMOCENTRO')
@Controller('horarios')
export class HorariosController {
  constructor(private readonly horarios: HorariosService) {}

  @Get()
  listar(@MembroAtual() admin: MembroDaEquipe, @Query() periodo: PeriodoDto) {
    return this.horarios.listarDoHemocentro(admin.hemocentro.id, periodo);
  }

  @Post()
  criar(@MembroAtual() admin: MembroDaEquipe, @Body() dto: NovoHorarioDto) {
    return this.horarios.criar(admin.hemocentro.id, dto);
  }

  @Post('lote')
  criarLote(@MembroAtual() admin: MembroDaEquipe, @Body() dto: LoteHorariosDto) {
    return this.horarios.criarLote(admin.hemocentro.id, dto);
  }

  @Patch(':id')
  atualizar(
    @MembroAtual() admin: MembroDaEquipe,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarHorarioDto,
  ) {
    return this.horarios.atualizar(admin.hemocentro.id, id, dto);
  }
}

// RF05: horários com vagas restantes, exibidos na página Doar.
@Publico()
@Controller('hemocentros/:hemocentroId/horarios')
export class HorariosPublicosController {
  constructor(private readonly horarios: HorariosService) {}

  @Get()
  listar(@Param('hemocentroId', ParseUUIDPipe) hemocentroId: string, @Query() periodo: PeriodoDto) {
    return this.horarios.listarPublico(hemocentroId, periodo);
  }
}
