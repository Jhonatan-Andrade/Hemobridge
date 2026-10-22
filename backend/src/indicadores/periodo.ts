import { BadRequestException } from '@nestjs/common';
import { hojeIso } from '../common/data.js';
import { somarDias } from '../common/elegibilidade.js';

// UC23 passo 3: últimos 30 dias por padrão.
export const DIAS_PERIODO_PADRAO = 30;
export const DIAS_PERIODO_MAXIMO = 366;

export interface Periodo {
  de: string; // YYYY-MM-DD, inclusivo
  ate: string; // YYYY-MM-DD, inclusivo
  /** Instantes que delimitam o período no fuso de Brasília: [inicio, fim). */
  inicio: Date;
  fim: Date;
  dias: string[];
}

/** Valida o período (UC24 FE01) e completa o padrão de 30 dias (UC23). */
export function resolverPeriodo(de?: string, ate?: string, hoje: string = hojeIso()): Periodo {
  const fimIso = ate ?? hoje;
  const inicioIso = de ?? somarDias(fimIso, -(DIAS_PERIODO_PADRAO - 1));
  if (inicioIso > hoje) throw new BadRequestException('A data inicial não pode ser posterior ao dia atual.');
  if (inicioIso > fimIso) throw new BadRequestException('A data inicial não pode ser posterior à data final.');

  const dias: string[] = [];
  for (let d = inicioIso; d <= fimIso; d = somarDias(d, 1)) {
    dias.push(d);
    if (dias.length > DIAS_PERIODO_MAXIMO) {
      throw new BadRequestException(`O período pode ter no máximo ${DIAS_PERIODO_MAXIMO} dias.`);
    }
  }
  return {
    de: inicioIso,
    ate: fimIso,
    inicio: inicioDoDia(inicioIso),
    fim: inicioDoDia(somarDias(fimIso, 1)),
    dias,
  };
}

/** Meia-noite em Brasília (UTC−3, sem horário de verão desde 2019). */
export function inicioDoDia(data: string): Date {
  return new Date(`${data}T00:00:00-03:00`);
}

/** Dia (YYYY-MM-DD) de um instante, no fuso de Brasília. */
export function diaDe(instante: Date): string {
  return hojeIso(instante);
}
