import { Body, Controller, Get, Ip, Post } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, Publico, UsuarioAtual } from '../auth/decorators.js';
import { LimiteCadastro } from '../common/limite-requisicoes.js';
import { TERMO_CONSENTIMENTO } from '../lgpd/termo-consentimento.js';
import { PreCadastroDto } from './dto/pre-cadastro.dto.js';
import { PacientesService } from './pacientes.service.js';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  // Versão vigente do termo, para o formulário de pré-cadastro (RN12).
  @Publico()
  @Get('termo-consentimento')
  termoConsentimento() {
    return TERMO_CONSENTIMENTO;
  }

  // Dados do painel do paciente logado.
  @Perfis('PACIENTE')
  @Get('me')
  meuPerfil(@UsuarioAtual() paciente: UsuarioAutenticado) {
    return this.pacientesService.meuPerfil(paciente.id);
  }

  // UC01: pré-condição é o visitante não estar autenticado.
  @Publico()
  @LimiteCadastro()
  @Post()
  preCadastrar(@Body() dto: PreCadastroDto, @Ip() ip: string) {
    return this.pacientesService.preCadastrar(dto, ip);
  }
}
