import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsOptional, Matches, Max, Min } from 'class-validator';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const MENSAGEM_HORA = 'Hora deve estar no formato HH:mm';
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const MENSAGEM_DATA = 'Data deve estar no formato AAAA-MM-DD';

export const MAX_VAGAS = 500;
export const MAX_SEMANAS_LOTE = 26;

// RF08: um horário com a quantidade de pacientes atendidos.
export class NovoHorarioDto {
  @IsISO8601({ strict: true }, { message: MENSAGEM_DATA })
  @Matches(DATA, { message: MENSAGEM_DATA })
  data: string;

  @Matches(HORA, { message: MENSAGEM_HORA })
  horaInicio: string;

  @Matches(HORA, { message: MENSAGEM_HORA })
  horaFim: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_VAGAS)
  vagasTotal: number;
}

// RF08: lote semanal (ex.: todo domingo às 13h, 6 vagas, pelas próximas 8 semanas).
export class LoteHorariosDto {
  /** 0 = domingo … 6 = sábado. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana: number;

  @Matches(HORA, { message: MENSAGEM_HORA })
  horaInicio: string;

  @Matches(HORA, { message: MENSAGEM_HORA })
  horaFim: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_VAGAS)
  vagasTotal: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SEMANAS_LOTE)
  semanas: number;

  /** Primeira data considerada (padrão: hoje). */
  @IsOptional()
  @IsISO8601({ strict: true }, { message: MENSAGEM_DATA })
  @Matches(DATA, { message: MENSAGEM_DATA })
  aPartirDe?: string;
}

/** Ajuste de vagas ou ativação/desativação de um horário. */
export class AtualizarHorarioDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_VAGAS)
  vagasTotal?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class PeriodoDto {
  @IsOptional()
  @IsISO8601({ strict: true }, { message: MENSAGEM_DATA })
  @Matches(DATA, { message: MENSAGEM_DATA })
  de?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: MENSAGEM_DATA })
  @Matches(DATA, { message: MENSAGEM_DATA })
  ate?: string;
}
