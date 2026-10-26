import { Body, Controller, Get, Post } from '@nestjs/common';
import { Auditar } from '../auditoria/auditar.decorator.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { ResponderPreTriagemDto } from './pre-triagem.dto.js';
import { PreTriagemService } from './pre-triagem.service.js';

@Perfis('PACIENTE')
@Controller('paciente/pre-triagem')
export class PreTriagemController {
  constructor(private readonly preTriagem: PreTriagemService) {}
  @Get()
  @Auditar({ acao: 'VISUALIZAR_PRE_TRIAGEM', entidade: 'pre_triagem' })
  questionario(@UsuarioAtual() u: UsuarioAutenticado) { return this.preTriagem.questionario(u.id); }
  @Post()
  responder(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: ResponderPreTriagemDto) {
    return this.preTriagem.responder(u.id, dto);
  }
}
