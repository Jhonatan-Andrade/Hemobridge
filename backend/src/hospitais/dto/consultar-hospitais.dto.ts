import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { SIGLAS_TIPOS } from '../../common/tipos-sanguineos.js';
import { UFS } from '../../common/uf.js';

/**
 * Aceita "tipos=O-,A%2B" ou "tipos=O-&tipos=A%2B". Na query string o "+" sem
 * codificação vira espaço ("A+" chega como "A "), então o espaço volta a ser "+".
 */
const paraListaDeTipos = ({ value }: { value: unknown }) => {
  const valores = Array.isArray(value) ? value : [value];
  return valores
    .filter((v): v is string => typeof v === 'string')
    .flatMap((v) => v.replace(/ /g, '+').split(','))
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
};

// UC02 / UC03
export class ConsultarHospitaisDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(UFS, { message: 'Estado deve ser uma UF válida' })
  estado?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 100)
  cidade?: string;

  @IsOptional()
  @Transform(paraListaDeTipos)
  @IsArray()
  @ArrayMaxSize(SIGLAS_TIPOS.length)
  @IsIn(SIGLAS_TIPOS, { each: true, message: 'Tipo sanguíneo inválido' })
  tipos?: string[];

  // Posição de referência para ordenar por proximidade (RF22).
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  raioKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  tamanhoPagina: number = 20;
}
