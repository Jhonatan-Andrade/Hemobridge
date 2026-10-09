import { BadRequestException, Controller, Get, Param, ParseEnumPipe, Query, StreamableFile } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import { HospitalDoRepresentanteService } from '../representante/hospital-do-representante.service.js';
import { PeriodoOpcionalDto, PeriodoRelatorioDto } from './dto/periodo.dto.js';
import { IndicadoresService } from './indicadores.service.js';
import { RelatoriosService, TIPOS_RELATORIO, type TipoRelatorio } from './relatorios.service.js';

const tipoRelatorio = new ParseEnumPipe(Object.fromEntries(TIPOS_RELATORIO.map((t) => [t, t])), {
  exceptionFactory: () => new BadRequestException(`Tipo de relatório deve ser: ${TIPOS_RELATORIO.join(', ')}`),
});

const pdf = ({ pdf: conteudo, nomeArquivo }: { pdf: Buffer; nomeArquivo: string }) =>
  new StreamableFile(conteudo, {
    type: 'application/pdf',
    disposition: `attachment; filename="${nomeArquivo}"`,
    length: conteudo.length,
  });

// UC23 / UC24 do Representante: só o próprio hospital (RN08). Telas H01 e H05.
@Perfis('REPRESENTANTE')
@Controller('representante')
export class IndicadoresRepresentanteController {
  constructor(
    private readonly indicadores: IndicadoresService,
    private readonly relatorios: RelatoriosService,
    private readonly hospital: HospitalDoRepresentanteService,
  ) {}

  @Get('indicadores')
  async dashboard(@UsuarioAtual() rep: UsuarioAutenticado, @Query() { de, ate }: PeriodoOpcionalDto) {
    return this.indicadores.doHospital(await this.hospital.obterId(rep.id), de, ate);
  }

  @Get('relatorios/:tipo')
  async relatorio(
    @UsuarioAtual() rep: UsuarioAutenticado,
    @Param('tipo', tipoRelatorio) tipo: TipoRelatorio,
    @Query() { de, ate }: PeriodoRelatorioDto,
  ) {
    const hospitalId = await this.hospital.obterId(rep.id);
    return pdf(await this.relatorios.emitir(tipo, { hospitalId }, rep, de, ate));
  }
}

// UC23 FA01 / UC24 do Administrador: visão agregada. Telas A01 e A04.
@Perfis('ADMINISTRADOR')
@Controller('admin')
export class IndicadoresAdminController {
  constructor(
    private readonly indicadores: IndicadoresService,
    private readonly relatorios: RelatoriosService,
  ) {}

  @Get('indicadores')
  dashboard(@Query() { de, ate }: PeriodoOpcionalDto) {
    return this.indicadores.daPlataforma(de, ate);
  }

  @Get('relatorios/:tipo')
  async relatorio(
    @UsuarioAtual() admin: UsuarioAutenticado,
    @Param('tipo', tipoRelatorio) tipo: TipoRelatorio,
    @Query() { de, ate }: PeriodoRelatorioDto,
  ) {
    return pdf(await this.relatorios.emitir(tipo, {}, admin, de, ate));
  }
}
