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
import { Perfis } from '../auth/decorators.js';
import {
  AtualizarHospitalDto,
  CriarHospitalDto,
  ListarHospitaisAdminDto,
  NovoRepresentanteDto,
} from './dto/hospital.dto.js';
import { HospitaisAdminService } from './hospitais-admin.service.js';
import { Auditar } from '../auditoria/auditar.decorator.js';

// UC25 (RF15, RF16, RF22)
@Perfis('ADMINISTRADOR')
@Controller('admin/hospitais')
export class HospitaisAdminController {
  constructor(private readonly service: HospitaisAdminService) {}

  @Get()
  listar(@Query() filtros: ListarHospitaisAdminDto) {
    return this.service.listar(filtros);
  }

  @Get(':id')
  detalhar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detalhar(id);
  }

  @Auditar({ acao: 'CRIAR_HOSPITAL', entidade: 'hospital' })
  @Post()
  criar(@Body() dto: CriarHospitalDto) {
    return this.service.criar(dto);
  }

  @Auditar({ acao: 'ATUALIZAR_HOSPITAL', entidade: 'hospital' })
  @Patch(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarHospitalDto) {
    return this.service.atualizar(id, dto);
  }

  @Auditar({ acao: 'DESATIVAR_HOSPITAL', entidade: 'hospital' })
  @Post(':id/desativar')
  @HttpCode(HttpStatus.OK)
  desativar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.desativar(id);
  }

  @Auditar({ acao: 'ATIVAR_HOSPITAL', entidade: 'hospital' })
  @Post(':id/ativar')
  @HttpCode(HttpStatus.OK)
  ativar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.ativar(id);
  }

  @Auditar({ acao: 'CRIAR_REPRESENTANTE', entidade: 'hospital' })
  @Post(':id/representantes')
  adicionarRepresentante(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: NovoRepresentanteDto,
  ) {
    return this.service.adicionarRepresentante(id, dto);
  }
}
