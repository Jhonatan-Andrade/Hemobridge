import { Equals, IsISO8601, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class HorariosDisponiveisDto {
  // FA01 – Filtrar por data
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true }, { message: 'Data inválida' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve estar no formato AAAA-MM-DD' })
  data?: string;
}

// UC09 passos 6–8
export class AgendarConsultaDto {
  @IsUUID('all', { message: 'Horário inválido' })
  disponibilidadeId: string;

  // FE04 / RN18
  @Equals(true, { message: 'O aceite do termo de telessaúde é obrigatório para o atendimento on-line' })
  aceiteTermoTelessaude: boolean;

  @IsString()
  versaoTermoTelessaude: string;
}

// UC10 FA01
export class ReagendarConsultaDto {
  @IsUUID('all', { message: 'Horário inválido' })
  disponibilidadeId: string;
}
