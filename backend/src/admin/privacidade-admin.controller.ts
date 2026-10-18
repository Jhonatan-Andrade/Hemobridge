import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Equals,
} from 'class-validator';
import { Perfis, UsuarioAtual } from '../auth/decorators.js';
import type { UsuarioAutenticado } from '../auth/auth.types.js';
import { PrivacidadeAdminService } from './privacidade-admin.service.js';
import { Transform } from 'class-transformer';

export class DecisaoPrivacidadeDto {
  @IsIn(['CONCLUIR', 'RECUSAR']) decisao!: 'CONCLUIR' | 'RECUSAR';
  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  justificativa!: string;
  @IsOptional() @IsDateString() reavaliarEm?: string;
  @Equals(true) confirmarAnalise!: boolean;
}
@Perfis('ADMINISTRADOR')
@Controller('admin/solicitacoes-exclusao')
export class PrivacidadeAdminController {
  constructor(private readonly service: PrivacidadeAdminService) {}
  @Get() listar() {
    return this.service.listar();
  }
  @Post(':id/decisao') decidir(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() u: UsuarioAutenticado,
    @Body() dto: DecisaoPrivacidadeDto,
  ) {
    return this.service.decidir(id, u.id, dto);
  }
}
