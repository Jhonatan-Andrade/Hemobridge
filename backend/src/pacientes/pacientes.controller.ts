import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { MembroDaEquipe, UsuarioAutenticado } from '../auth/auth.types.js';
import { MembroAtual, Papeis, Perfis, UsuarioAtual } from '../auth/decorators.js';
import { PaginacaoDto } from '../common/paginacao.dto.js';
import { AtivacaoService } from './ativacao.service.js';
import { ExclusaoDto } from './dto/exclusao.dto.js';
import { HistoricoService } from './historico.service.js';
import { PacientesService } from './pacientes.service.js';

@Controller('pacientes')
export class PacientesController {
  constructor(
    private readonly pacientes: PacientesService,
    private readonly ativacao: AtivacaoService,
    private readonly historicos: HistoricoService,
  ) {}

  // RF04
  @Perfis('PACIENTE')
  @Get('me/painel')
  painel(@UsuarioAtual() paciente: UsuarioAutenticado) {
    return this.pacientes.painel(paciente.id);
  }

  // RF16
  @Perfis('PACIENTE')
  @Post('me/exclusao')
  @HttpCode(HttpStatus.OK)
  excluirDados(@UsuarioAtual() paciente: UsuarioAutenticado, @Body() { senha }: ExclusaoDto) {
    return this.pacientes.excluirDados(paciente.id, senha);
  }

  // RF13
  @Papeis('ADMIN_HEMOCENTRO')
  @Get('pendentes-ativacao')
  pendentes(@MembroAtual() admin: MembroDaEquipe, @Query() paginacao: PaginacaoDto) {
    return this.ativacao.pendentes(admin.hemocentro.id, paginacao);
  }

  @Papeis('ADMIN_HEMOCENTRO')
  @Patch(':id/ativar')
  ativar(@MembroAtual() admin: MembroDaEquipe, @Param('id', ParseUUIDPipe) id: string) {
    return this.ativacao.ativar(admin, id);
  }

  // RF12
  @Papeis('MEDICO', 'ADMIN_HEMOCENTRO')
  @Get(':id/historico')
  historico(@MembroAtual() membro: MembroDaEquipe, @Param('id', ParseUUIDPipe) id: string) {
    return this.historicos.historico(membro, id);
  }
}
