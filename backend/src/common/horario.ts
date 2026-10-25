import { instanteLocal } from './data.js';

// Colunas DATE e TIME chegam do Prisma como Date em UTC (1970-01-01 para TIME).
// Elas guardam a data e a hora "de parede" do fuso de Brasília.

/** "13:30" -> Date para coluna TIME. */
export function horaParaTime(hora: string): Date {
  return new Date(`1970-01-01T${hora}:00.000Z`);
}

/** Coluna TIME -> "13:30". */
export function timeParaHora(valor: Date): string {
  return valor.toISOString().slice(11, 16);
}

/** Coluna DATE -> "2026-10-25". */
export function dateParaIso(valor: Date): string {
  return valor.toISOString().slice(0, 10);
}

/** Dia da semana (0 = domingo) de uma data AAAA-MM-DD. */
export function diaDaSemana(data: string): number {
  return new Date(`${data}T00:00:00.000Z`).getUTCDay();
}

interface HorarioDoBanco {
  id: string;
  data: Date;
  horaInicio: Date;
  horaFim: Date;
  vagasTotal: number;
  ativo: boolean;
}

/** Horário com data/horas legíveis e os instantes de início e fim (ISO). */
export function apresentarHorario(h: HorarioDoBanco) {
  const data = dateParaIso(h.data);
  const horaInicio = timeParaHora(h.horaInicio);
  const horaFim = timeParaHora(h.horaFim);
  return {
    id: h.id,
    data,
    horaInicio,
    horaFim,
    inicio: instanteLocal(data, horaInicio).toISOString(),
    fim: instanteLocal(data, horaFim).toISOString(),
    vagasTotal: h.vagasTotal,
    ativo: h.ativo,
  };
}

/** Instante em que o horário começa. */
export function inicioDoHorario(h: Pick<HorarioDoBanco, 'data' | 'horaInicio'>): Date {
  return instanteLocal(dateParaIso(h.data), timeParaHora(h.horaInicio));
}
