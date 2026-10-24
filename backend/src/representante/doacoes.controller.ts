import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import { DoacoesService } from './doacoes.service.js';
import {
  BuscarDoadorDto,
  DoacaoAvulsaDto,
  DoacaoVinculadaDto,
  ListarDoacoesDto,
} from './dto/doacao.dto.js';
import { HospitalDoRepresentanteService } from './hospital-do-representante.service.js';

// Doações registradas pelo representante da instituição autenticada.
@Perfis('REPRESENTANTE')
@Controller('representante/doacoes')
export class DoacoesController {
  constructor(
    private readonly doacoes: DoacoesService,
    private readonly hospital: HospitalDoRepresentanteService,
  ) {}

  @Get()
  @Auditar({ acao: 'LISTAR_DOACOES', entidade: 'doacao' })
  async listar(
    @UsuarioAtual() rep: UsuarioAutenticado,
    @Query() filtros: ListarDoacoesDto,
  ) {
    return this.doacoes.listar(await this.hospital.obterId(rep.id), filtros);
  }

  // POST para o CPF não ir na URL (dado pessoal).
  @Post('buscar-doador')
  @HttpCode(HttpStatus.OK)
  @Auditar({ acao: 'BUSCAR_DOADOR', entidade: 'paciente' })
  buscarDoador(@Body() dto: BuscarDoadorDto) {
    return this.doacoes.buscarDoador(dto.cpf);
  }

  @Post()
  async registrarVinculada(
    @UsuarioAtual() rep: UsuarioAutenticado,
    @Body() dto: DoacaoVinculadaDto,
  ) {
    return this.doacoes.registrarVinculada(
      await this.hospital.obterId(rep.id),
      rep.id,
      dto,
    );
  }

  // FA01
  @Post('avulsa')
  async registrarAvulsa(
    @UsuarioAtual() rep: UsuarioAutenticado,
    @Body() dto: DoacaoAvulsaDto,
  ) {
    return this.doacoes.registrarAvulsa(
      await this.hospital.obterId(rep.id),
      rep.id,
      dto,
    );
  }
}
