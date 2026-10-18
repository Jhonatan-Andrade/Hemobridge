import { IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class HorariosDisponiveisDto {
  @IsOptional()
  @IsUUID()
  medicoId?: string;

  // UC09 FA01: filtrar por data (YYYY-MM-DD, fuso de Brasília).
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato AAAA-MM-DD' })
  data?: string;
}

export class CancelarConsultaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}

export class ReagendarConsultaDto {
  @IsUUID('all', { message: 'Horário inválido' })
  disponibilidadeId: string;
}
