import { dateParaIso } from '../common/horario.js';
import type { Prisma } from '../generated/prisma/client.js';

/** Aferições do dia, aptidão e dados da coleta (sem o número da bolsa, que é interno). */
export const SELECAO_CLINICA = {
  pesoKg: true,
  alturaCm: true,
  pressaoSistolica: true,
  pressaoDiastolica: true,
  pulso: true,
  temperatura: true,
  hemoglobina: true,
  hematocrito: true,
  volumeMl: true,
  reacoes: true,
  aptidao: true,
  aptoAPartirDe: true,
} satisfies Prisma.DoacaoSelect;

type Clinica = Prisma.DoacaoGetPayload<{ select: typeof SELECAO_CLINICA }>;

const numero = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));

/** Aferições como números (o Prisma devolve DECIMAL como objeto), ou null se nada foi aferido. */
export function apresentarClinica(d: Clinica) {
  const afericoes = {
    pesoKg: numero(d.pesoKg),
    alturaCm: d.alturaCm,
    pressaoSistolica: d.pressaoSistolica,
    pressaoDiastolica: d.pressaoDiastolica,
    pulso: d.pulso,
    temperatura: numero(d.temperatura),
    hemoglobina: numero(d.hemoglobina),
    hematocrito: numero(d.hematocrito),
  };
  return {
    afericoes: Object.values(afericoes).some((v) => v !== null) ? afericoes : null,
    volumeMl: d.volumeMl,
    reacoes: d.reacoes,
    aptidao: d.aptidao,
    aptoAPartirDe: d.aptoAPartirDe ? dateParaIso(d.aptoAPartirDe) : null,
  };
}

export const SELECAO_EXAMES = {
  pesquisaAnticorpos: true,
  hiv: true,
  hepatiteB: true,
  hepatiteC: true,
  sifilis: true,
  chagas: true,
  htlv: true,
  malaria: true,
} satisfies Prisma.ExameDoacaoSelect;

type Exames = Prisma.ExameDoacaoGetPayload<{ select: typeof SELECAO_EXAMES }>;

/** Algum resultado reagente, inconclusivo ou pesquisa de anticorpos positiva. */
export function examesAlterados({ pesquisaAnticorpos, ...sorologias }: Exames) {
  return pesquisaAnticorpos === 'POSITIVA' || Object.values(sorologias).some((r) => r !== null && r !== 'NAO_REAGENTE');
}

export type SituacaoExames = 'PENDENTE' | 'NORMAL' | 'ALTERADO';

/** Situação dos exames de uma doação; null quando não houve coleta. */
export function situacaoExames(doou: boolean, exames: Exames | null): SituacaoExames | null {
  if (!doou) return null;
  if (!exames) return 'PENDENTE';
  return examesAlterados(exames) ? 'ALTERADO' : 'NORMAL';
}
