import { IsISO8601, IsOptional, Matches } from 'class-validator';

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// UC23 passo 4: período opcional (padrão: últimos 30 dias).
export class PeriodoOpcionalDto {
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Data inicial inválida' })
  @Matches(DATA, { message: 'Data inicial deve estar no formato AAAA-MM-DD' })
  de?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Data final inválida' })
  @Matches(DATA, { message: 'Data final deve estar no formato AAAA-MM-DD' })
  ate?: string;
}

// UC24 passo 3: data inicial e final obrigatórias.
export class PeriodoRelatorioDto {
  @IsISO8601({ strict: true }, { message: 'Data inicial inválida' })
  @Matches(DATA, { message: 'Data inicial deve estar no formato AAAA-MM-DD' })
  de: string;

  @IsISO8601({ strict: true }, { message: 'Data final inválida' })
  @Matches(DATA, { message: 'Data final deve estar no formato AAAA-MM-DD' })
  ate: string;
}
