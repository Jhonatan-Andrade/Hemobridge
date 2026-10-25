import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { SIGLAS_TIPOS } from '../../common/tipos-sanguineos.js';
import { aparar, maiusculas } from '../../common/transformacoes.js';
import { SituacaoExame } from '../../generated/prisma/enums.js';

export class ListarExamesMedicoDto {
  // UC16 passo 2: "Exames para avaliar" usa EM_ANALISE.
  @IsOptional()
  @Transform(maiusculas)
  @IsEnum(SituacaoExame, { message: 'Situação inválida' })
  situacao?: SituacaoExame;

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

// UC16 passos 4–6 (RN01). FE01: sem tipo sanguíneo não há aprovação.
export class AprovarExameDto {
  @Transform(maiusculas)
  @IsIn(SIGLAS_TIPOS, { message: 'Informe o tipo sanguíneo do paciente (A+, A-, B+, B-, AB+, AB-, O+ ou O-)' })
  tipoSanguineo: string;
}

// FA01
export class ReprovarExameDto {
  @Transform(aparar)
  @IsString()
  @Length(5, 1000, { message: 'Informe o motivo da reprovação (entre 5 e 1000 caracteres)' })
  motivo: string;
}
