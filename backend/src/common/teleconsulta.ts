// RN18 – Agendamento e teleconsulta.

/** O link da sala aparece ao paciente a partir de 15 minutos antes do horário. */
export const MINUTOS_LINK_ANTES = 15;

/** Cancelar ou reagendar só é permitido até 24 horas antes do horário. */
export const HORAS_ANTECEDENCIA_CANCELAMENTO = 24;

/** UC09 passo 5: horários dos próximos 30 dias. */
export const DIAS_JANELA_AGENDAMENTO = 30;

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

/** Instante a partir do qual o paciente vê o link da sala. */
export function linkDisponivelEm(inicio: Date): Date {
  return new Date(inicio.getTime() - MINUTOS_LINK_ANTES * MINUTO);
}

/** O link é exibido do início da janela até o fim do horário. */
export function linkVisivel(inicio: Date, fim: Date, agora: Date = new Date()): boolean {
  return agora >= linkDisponivelEm(inicio) && agora <= fim;
}

/** RN18: ainda dá para cancelar ou reagendar pela plataforma. */
export function podeCancelar(inicio: Date, agora: Date = new Date()): boolean {
  return inicio.getTime() - agora.getTime() >= HORAS_ANTECEDENCIA_CANCELAMENTO * HORA;
}
