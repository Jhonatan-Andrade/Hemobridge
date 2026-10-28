const FUSO_PADRAO = 'America/Sao_Paulo';

/** Data de hoje (YYYY-MM-DD) no fuso da plataforma, independente do fuso do servidor. */
export function hojeIso(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_PADRAO }).format(agora);
}

/** Idade em anos completos para uma data de nascimento no formato YYYY-MM-DD. */
export function calcularIdade(dataNascimento: string, hoje: string = hojeIso()): number {
  const [anoN, mesN, diaN] = dataNascimento.split('-').map(Number);
  const [anoH, mesH, diaH] = hoje.split('-').map(Number);
  const jaFezAniversario = mesH > mesN || (mesH === mesN && diaH >= diaN);
  return anoH - anoN - (jaFezAniversario ? 0 : 1);
}

// America/Sao_Paulo não tem horário de verão desde 2019: o deslocamento é fixo.
const DESLOCAMENTO_PADRAO = '-03:00';

/** Instante correspondente a uma data (YYYY-MM-DD) e hora (HH:mm) no fuso da plataforma. */
export function instanteLocal(data: string, hora = '00:00'): Date {
  return new Date(`${data}T${hora}:00.000${DESLOCAMENTO_PADRAO}`);
}

/** Soma dias a uma data YYYY-MM-DD. */
export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Converte YYYY-MM-DD para Date em UTC, como o Prisma espera para colunas DATE. */
export function dataIsoParaDate(data: string): Date {
  return new Date(`${data}T00:00:00.000Z`);
}
