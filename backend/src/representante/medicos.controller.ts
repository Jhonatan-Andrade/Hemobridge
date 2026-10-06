import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { AtualizarMedicoDto, ListarMedicosDto, NovoMedicoDto } from './dto/medico.dto.js';
import { HospitalDoRepresentanteService } from './hospital-do-representante.service.js';
import { MedicosService } from './medicos.service.js';

// UC22 – Gerenciar Médicos (RF13)
@Perfis('REPRESENTANTE')
@Controller('representante/medicos')
export class MedicosController {
  constructor(
    private readonly medicos: MedicosService,
    private readonly hospital: HospitalDoRepresentanteService,
  ) {}

  @Get()
  async listar(@UsuarioAtual() rep: UsuarioAutenticado, @Query() filtros: ListarMedicosDto) {
    return this.medicos.listar(await this.hospital.obterId(rep.id), filtros);
  }

  @Post()
  async criar(@UsuarioAtual() rep: UsuarioAutenticado, @Body() dto: NovoMedicoDto) {
    return this.medicos.criar(await this.hospital.obterId(rep.id), rep.id, dto);
  }

  @Get(':id')
  async detalhar(@UsuarioAtual() rep: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.medicos.detalhar(await this.hospital.obterId(rep.id), id);
  }

  @Patch(':id')
  async atualizar(
    @UsuarioAtual() rep: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarMedicoDto,
  ) {
    return this.medicos.atualizar(await this.hospital.obterId(rep.id), id, dto);
  }

  @Post(':id/desativar')
  @HttpCode(HttpStatus.OK)
  async desativar(@UsuarioAtual() rep: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.medicos.desativar(await this.hospital.obterId(rep.id), id);
  }

  @Post(':id/ativar')
  @HttpCode(HttpStatus.OK)
  async ativar(@UsuarioAtual() rep: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.medicos.ativar(await this.hospital.obterId(rep.id), id);
  }

  @Post(':id/reenviar-senha-provisoria')
  @HttpCode(HttpStatus.OK)
  async reenviarSenhaProvisoria(
    @UsuarioAtual() rep: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.medicos.reenviarSenhaProvisoria(await this.hospital.obterId(rep.id), id);
  }
}
