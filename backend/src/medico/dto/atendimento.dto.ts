import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { aparar, maiusculas } from '../../common/transformacoes.js';
import { SituacaoConsulta } from '../../generated/prisma/enums.js';

const apararLista = ({ value }: { value: unknown }) =>
  Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v)) : value;

export class ListarConsultasMedicoDto {
  @IsOptional()
  @Transform(maiusculas)
  @IsEnum(SituacaoConsulta, { message: 'Situação inválida' })
  situacao?: SituacaoConsulta;

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

// UC14 passo 3 com UC15 (exames) ou FA01 (paciente inapto): exatamente um dos dois.
export class RegistrarRealizadaDto {
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(5000)
  observacoes?: string;

  // UC15 passo 2
  @IsOptional()
  @Transform(apararLista)
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe ao menos um exame' })
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(2, 150, { each: true, message: 'Cada exame deve ter entre 2 e 150 caracteres' })
  exames?: string[];

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(2000)
  orientacoes?: string;

  // FA01
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @Length(5, 1000, { message: 'O motivo deve ter entre 5 e 1000 caracteres' })
  motivoReprovacao?: string;
}

// FA03
export class CancelarConsultaMedicoDto {
  @Transform(aparar)
  @IsString()
  @Length(5, 1000, { message: 'Informe o motivo do cancelamento (entre 5 e 1000 caracteres)' })
  motivo: string;
}
