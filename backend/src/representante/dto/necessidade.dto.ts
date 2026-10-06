import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { SIGLAS_TIPOS } from '../../common/tipos-sanguineos.js';
import { maiusculas } from '../../common/transformacoes.js';
import { NivelNecessidade } from '../../generated/prisma/enums.js';

// RN02 / FE01: NAO_INFORMADO é apenas o estado inicial, não um valor que o
// representante possa escolher.
export const NIVEIS_INFORMAVEIS = [
  NivelNecessidade.CRITICO,
  NivelNecessidade.BAIXO,
  NivelNecessidade.ESTAVEL,
  NivelNecessidade.ADEQUADO,
] as const;

export class NivelTipoDto {
  @Transform(maiusculas)
  @IsIn(SIGLAS_TIPOS, { message: 'Tipo sanguíneo inválido' })
  tipo: string;

  @Transform(maiusculas)
  @IsIn(NIVEIS_INFORMAVEIS, { message: 'Nível deve ser CRITICO, BAIXO, ESTAVEL ou ADEQUADO' })
  nivel: (typeof NIVEIS_INFORMAVEIS)[number];
}

// UC18 passo 3: um ou mais tipos de uma vez.
export class AtualizarNecessidadesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SIGLAS_TIPOS.length)
  @ValidateNested({ each: true })
  @Type(() => NivelTipoDto)
  niveis: NivelTipoDto[];
}

export class HistoricoNecessidadesDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/ /g, '+').trim().toUpperCase() : value))
  @IsIn(SIGLAS_TIPOS, { message: 'Tipo sanguíneo inválido' })
  tipo?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Data inicial inválida' })
  de?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Data final inválida' })
  ate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  tamanhoPagina: number = 50;
}
