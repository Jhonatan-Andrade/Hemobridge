import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { SIGLAS_TIPOS } from '../../common/tipos-sanguineos.js';
import { maiusculas, somenteDigitos } from '../../common/transformacoes.js';
import { IsCpf } from '../../common/validators.js';

// UC20 passos 2 e 3 / FE01 (RN06)
export class BuscarDoadorDto {
  @Transform(somenteDigitos)
  @IsCpf()
  cpf: string;
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// UC20 FA01 – doação de pessoa sem cadastro aprovado.
export class DoacaoAvulsaDto {
  @IsISO8601({ strict: true }, { message: 'Data da coleta inválida' })
  @Matches(DATA, { message: 'Data da coleta deve estar no formato AAAA-MM-DD' })
  dataColeta: string;

  // Tipo obtido na triagem do hemocentro.
  @Transform(maiusculas)
  @IsIn(SIGLAS_TIPOS, { message: 'Tipo sanguíneo inválido' })
  tipo: string;
}

/** Coleta de doador identificado: tipagem, hospital e responsável são resolvidos no servidor. */
export class DoacaoVinculadaDto {
  @IsUUID()
  pacienteId: string;

  @IsISO8601({ strict: true }, { message: 'Data da coleta inválida' })
  @Matches(DATA, { message: 'Data da coleta deve estar no formato AAAA-MM-DD' })
  dataColeta: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Informe o peso aferido na triagem, em kg' },
  )
  @Min(1)
  @Max(400)
  pesoAferido: number;

  @IsOptional()
  @IsBoolean()
  autorizacaoResponsavelConfirmada?: boolean;

  @IsOptional()
  @IsBoolean()
  doouAntesDos60Confirmado?: boolean;
}

export class ListarDoacoesDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATA)
  de?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATA)
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
