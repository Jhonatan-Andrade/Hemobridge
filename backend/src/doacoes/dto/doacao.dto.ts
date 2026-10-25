import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';
import { SIGLAS_TIPOS } from '../../common/tipos-sanguineos.js';
import { aparar, maiusculas } from '../../common/transformacoes.js';

export class AgendaDoDiaDto {
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Data deve estar no formato AAAA-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato AAAA-MM-DD' })
  data?: string;
}

// RF11: registro do atendimento pelo médico.
export class RegistrarDoacaoDto {
  @IsUUID('all', { message: 'Agendamento inválido' })
  agendamentoId: string;

  @IsBoolean()
  compareceu: boolean;

  @IsBoolean()
  doou: boolean;

  /** ABO + Rh, quando houver tipagem. */
  @IsOptional()
  @Transform(maiusculas)
  @IsIn(SIGLAS_TIPOS, { message: 'Tipo sanguíneo inválido' })
  tipoSanguineo?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @Length(3, 500, { message: 'O motivo deve ter entre 3 e 500 caracteres' })
  motivoNaoDoacao?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}
