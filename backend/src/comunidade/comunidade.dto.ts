import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  StatusConteudo,
  TemaComunidade,
  TipoPublicacao,
} from '../generated/prisma/enums.js';

export const VERSAO_NORMAS = '2026-10';
export class PaginaComunidadeDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) pagina = 1;
}
export class AceiteNormasDto {
  @Equals(true) aceiteNormas: boolean;
  @Equals(VERSAO_NORMAS) versaoNormas: string;
}
export class CriarPublicacaoDto extends AceiteNormasDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(8, 120)
  titulo: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(20, 2000)
  texto: string;
  @IsEnum(TemaComunidade) tema: TemaComunidade;
  @IsOptional() @IsEnum(TipoPublicacao) tipo: TipoPublicacao = 'COMUM';
  @IsOptional() @IsISO8601() fixadaAte?: string;
}
export class CriarComentarioDto extends AceiteNormasDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 2000)
  texto: string;
}
export class ModerarConteudoDto {
  @IsEnum(StatusConteudo) status: StatusConteudo;
}
export class DenunciarPublicacaoDto {
  @IsString() @Length(10, 500) motivo: string;
}
