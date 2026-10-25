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
import type { MembroDaEquipe } from '../auth/auth.types.js';
import { MembroAtual, Papeis } from '../auth/decorators.js';
import { AtualizarMedicoDto, ListarEquipeDto, NovoMedicoDto } from './dto/equipe.dto.js';
import { EquipeService } from './equipe.service.js';

// RF14: equipe do hemocentro do Admin logado.
@Papeis('ADMIN_HEMOCENTRO')
@Controller('equipe')
export class EquipeController {
  constructor(private readonly equipe: EquipeService) {}

  @Get()
  listar(@MembroAtual() admin: MembroDaEquipe, @Query() filtros: ListarEquipeDto) {
    return this.equipe.listar(admin.hemocentro.id, filtros);
  }

  @Post()
  criar(@MembroAtual() admin: MembroDaEquipe, @Body() dto: NovoMedicoDto) {
    return this.equipe.criarMedico(admin.hemocentro.id, dto);
  }

  @Get(':id')
  detalhar(@MembroAtual() admin: MembroDaEquipe, @Param('id', ParseUUIDPipe) id: string) {
    return this.equipe.detalhar(admin.hemocentro.id, id);
  }

  @Patch(':id')
  atualizar(
    @MembroAtual() admin: MembroDaEquipe,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarMedicoDto,
  ) {
    return this.equipe.atualizarMedico(admin.hemocentro.id, id, dto);
  }

  @Post(':id/reenviar-senha-provisoria')
  @HttpCode(HttpStatus.OK)
  reenviarSenhaProvisoria(@MembroAtual() admin: MembroDaEquipe, @Param('id', ParseUUIDPipe) id: string) {
    return this.equipe.reenviarSenhaProvisoria(admin.hemocentro.id, id);
  }
}
