import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsIn, ValidateNested } from 'class-validator';
import { SIGLAS_TIPOS } from '../../common/tipos-sanguineos.js';
import { maiusculas } from '../../common/transformacoes.js';
import { NivelNecessidade } from '../../generated/prisma/enums.js';

export class NivelTipoDto {
  @Transform(maiusculas)
  @IsIn(SIGLAS_TIPOS, { message: 'Tipo sanguíneo inválido' })
  tipo: string;

  @Transform(maiusculas)
  @IsEnum(NivelNecessidade, { message: 'Nível deve ser URGENTE, NECESSARIO ou ESTAVEL' })
  nivel: NivelNecessidade;
}

// RF17: um ou mais tipos de uma vez.
export class AtualizarNecessidadesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SIGLAS_TIPOS.length)
  @ValidateNested({ each: true })
  @Type(() => NivelTipoDto)
  niveis: NivelTipoDto[];
}
