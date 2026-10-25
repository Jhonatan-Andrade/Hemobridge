import { Transform, Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsUrl, Matches, Max, MaxLength, Min } from 'class-validator';
import { aparar } from '../../common/transformacoes.js';

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// UC13 passo 3: o intervalo é dividido em horários com a duração informada.
export class NovosHorariosDto {
  @IsISO8601({ strict: true, strictSeparator: true }, { message: 'Data inválida' })
  @Matches(DATA, { message: 'Data deve estar no formato AAAA-MM-DD' })
  data: string;

  @Matches(HORA, { message: 'Horário de início deve estar no formato HH:mm' })
  inicio: string;

  @Matches(HORA, { message: 'Horário de término deve estar no formato HH:mm' })
  fim: string;

  @Type(() => Number)
  @IsInt({ message: 'Duração deve ser um número inteiro de minutos' })
  @Min(10, { message: 'Duração mínima de 10 minutos' })
  @Max(180, { message: 'Duração máxima de 180 minutos' })
  duracaoMinutos: number;

  // FE03
  @Transform(aparar)
  @IsUrl(
    { protocols: ['https'], require_protocol: true, require_valid_protocol: true },
    { message: 'O link da sala deve ser um endereço web válido (https)' },
  )
  @MaxLength(500)
  linkSala: string;
}

export class ListarAgendaDto {
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true }, { message: 'Data inicial inválida' })
  @Matches(DATA, { message: 'Data inicial deve estar no formato AAAA-MM-DD' })
  de?: string;

  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true }, { message: 'Data final inválida' })
  @Matches(DATA, { message: 'Data final deve estar no formato AAAA-MM-DD' })
  ate?: string;
}
