import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { DoacoesService } from './doacoes.service.js';
import { BuscarDoadorDto, DoacaoAvulsaDto, ListarDoacoesDto } from './dto/doacao.dto.js';
import { HospitalDoRepresentanteService } from './hospital-do-representante.service.js';

// UC20 – Registrar Doação (RF18). Tela H03.
@Perfis('REPRESENTANTE')
@Controller('representante/doacoes')
export class DoacoesController {
  constructor(
    private readonly doacoes: DoacoesService,
    private readonly hospital: HospitalDoRepresentanteService,
  ) {}

  @Get()
  async listar(@UsuarioAtual() rep: UsuarioAutenticado, @Query() filtros: ListarDoacoesDto) {
    return this.doacoes.listar(await this.hospital.obterId(rep.id), filtros);
  }

  // POST para o CPF não ir na URL (dado pessoal).
  @Post('buscar-doador')
  @HttpCode(HttpStatus.OK)
  buscarDoador(@Body() dto: BuscarDoadorDto) {
    return this.doacoes.buscarDoador(dto.cpf);
  }

  // FA01
  @Post('avulsa')
  async registrarAvulsa(@UsuarioAtual() rep: UsuarioAutenticado, @Body() dto: DoacaoAvulsaDto) {
    return this.doacoes.registrarAvulsa(await this.hospital.obterId(rep.id), rep.id, dto);
  }
}
