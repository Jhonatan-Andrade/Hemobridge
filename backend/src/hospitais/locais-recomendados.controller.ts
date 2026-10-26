import { Controller, Get, Query } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Auditar } from '../auditoria/auditar.decorator.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { ConsultarLocaisRecomendadosDto } from './dto/consultar-locais-recomendados.dto.js';
import { LocaisRecomendadosService } from './locais-recomendados.service.js';

@Perfis('PACIENTE')
@Controller('paciente/locais-recomendados')
export class LocaisRecomendadosController {
  constructor(private readonly locais: LocaisRecomendadosService) {}

  @Get()
  @Auditar({
    acao: 'CONSULTAR_LOCAIS_RECOMENDADOS',
    entidade: 'paciente',
    registrarFalha: true,
  })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() filtros: ConsultarLocaisRecomendadosDto,
  ) {
    return this.locais.listar(usuario.id, filtros);
  }
}
