import { Body, Controller, Get, Ip, Post } from '@nestjs/common';
import { Publico } from '../auth/decorators.js';
import { LimiteCadastro } from '../common/limite-requisicoes.js';
import { TERMO_CONSENTIMENTO } from '../lgpd/termo-consentimento.js';
import { PreCadastroDto } from './dto/pre-cadastro.dto.js';
import { PacientesService } from './pacientes.service.js';
import { Auditar } from '../auditoria/auditar.decorator.js';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  // Versão vigente do termo, para o formulário de pré-cadastro (RN12).
  @Publico()
  @Get('termo-consentimento')
  termoConsentimento() {
    return TERMO_CONSENTIMENTO;
  }

  // UC01: pré-condição é o visitante não estar autenticado.
  @Publico()
  @LimiteCadastro()
  @Auditar({ acao: 'PRE_CADASTRO', entidade: 'paciente', registrarFalha: true })
  @Post()
  preCadastrar(@Body() dto: PreCadastroDto, @Ip() ip: string) {
    return this.pacientesService.preCadastrar(dto, ip);
  }
}
