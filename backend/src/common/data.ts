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

/** Converte YYYY-MM-DD para Date em UTC, como o Prisma espera para colunas DATE. */
export function dataIsoParaDate(data: string): Date {
  return new Date(`${data}T00:00:00.000Z`);
}
