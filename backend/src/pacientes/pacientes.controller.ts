import { Body, Controller, Get, Ip, Post } from '@nestjs/common';
import { TERMO_CONSENTIMENTO } from '../lgpd/termo-consentimento.js';
import { PreCadastroDto } from './dto/pre-cadastro.dto.js';
import { PacientesService } from './pacientes.service.js';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  // Versão vigente do termo, para o formulário de pré-cadastro (RN12).
  @Get('termo-consentimento')
  termoConsentimento() {
    return TERMO_CONSENTIMENTO;
  }

  @Post()
  preCadastrar(@Body() dto: PreCadastroDto, @Ip() ip: string) {
    console.log(ip);
    return this.pacientesService.preCadastrar(dto, ip);
  }
}
