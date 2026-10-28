import { hojeIso, somarDias } from '../common/data.js';
import { dateParaIso } from '../common/horario.js';
import type { Aptidao, Sexo } from '../generated/prisma/client.js';

/**
 * Intervalo mínimo entre doações de sangue total e limite em 12 meses, conforme o
 * Ministério da Saúde: homens a cada 60 dias, até 4 vezes; mulheres a cada 90 dias, até 3.
 */
export const REGRAS_DOACAO = {
  MASCULINO: { intervaloDias: 60, limiteAnual: 4 },
  FEMININO: { intervaloDias: 90, limiteAnual: 3 },
} as const satisfies Record<Sexo, { intervaloDias: number; limiteAnual: number }>;

/** Sem sexo informado (conta anterior ao campo), vale a regra mais restritiva. */
export const regraDoacao = (sexo: Sexo | null) => REGRAS_DOACAO[sexo ?? 'FEMININO'];

const DOZE_MESES = 365;

const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate) - Date.parse(de)) / 86_400_000);
const formatar = (data: string) => data.split('-').reverse().join('/');

function quem(sexo: Sexo | null) {
  if (sexo === 'MASCULINO') return 'para homens';
  if (sexo === 'FEMININO') return 'para mulheres';
  return 'quando o sexo não foi informado';
}

/**
 * Motivo pelo qual o paciente não pode doar na data `nova` (YYYY-MM-DD), ou null.
 * `datas` são as doações efetivas e os agendamentos ativos do paciente; o intervalo
 * vale nos dois sentidos, porque um agendamento futuro também conta como doação.
 */
export function impedimentoDeDoacao(sexo: Sexo | null, nova: string, datas: string[]): string | null {
  const { intervaloDias, limiteAnual } = regraDoacao(sexo);

  const proxima = [...datas].sort().find((d) => Math.abs(diasEntre(d, nova)) < intervaloDias);
  if (proxima) {
    const saida =
      proxima <= nova
        ? `Escolha uma data a partir de ${formatar(somarDias(proxima, intervaloDias))}.`
        : `Escolha uma data até ${formatar(somarDias(proxima, -intervaloDias))} ou cancele aquele agendamento.`;
    return `O intervalo mínimo entre doações é de ${intervaloDias} dias ${quem(sexo)}, e você tem doação ou agendamento em ${formatar(proxima)}. ${saida}`;
  }

  // Toda janela de 12 meses que contém a nova data começa numa das datas até ela.
  const todas = [...datas, nova].sort();
  const excede = todas.some(
    (inicio) =>
      inicio <= nova &&
      nova < somarDias(inicio, DOZE_MESES) &&
      todas.filter((d) => d >= inicio && d < somarDias(inicio, DOZE_MESES)).length > limiteAnual,
  );
  if (excede) {
    return `O limite é de ${limiteAnual} doações em 12 meses ${quem(sexo)}, contando as doações feitas e os agendamentos ativos. Escolha uma data mais distante.`;
  }
  return null;
}

/** Primeira data em que o paciente pode voltar a doar, a partir da última doação efetiva. */
export function proximaDoacaoPermitida(sexo: Sexo | null, ultimaDoacao: string | null): string | null {
  return ultimaDoacao ? somarDias(ultimaDoacao, regraDoacao(sexo).intervaloDias) : null;
}

/**
 * Inaptidão declarada na triagem de qualquer hemocentro: definitiva, ou temporária até
 * a data mais distante ainda por vir (primeiro dia em que o paciente volta a ser apto).
 */
export function situacaoDeAptidao(doacoes: { aptidao: Aptidao | null; aptoAPartirDe: Date | null }[], hoje = hojeIso()) {
  const aptoAPartirDe =
    doacoes
      .map((d) => (d.aptidao === 'INAPTO_TEMPORARIO' && d.aptoAPartirDe ? dateParaIso(d.aptoAPartirDe) : null))
      .filter((d): d is string => d !== null && d > hoje)
      .sort()
      .at(-1) ?? null;
  return { inaptoDefinitivo: doacoes.some((d) => d.aptidao === 'INAPTO_DEFINITIVO'), aptoAPartirDe };
}

/** Motivo de não poder doar na data `nova` por inaptidão declarada na triagem, ou null. */
export function impedimentoPorAptidao(
  { inaptoDefinitivo, aptoAPartirDe }: ReturnType<typeof situacaoDeAptidao>,
  nova: string,
): string | null {
  if (inaptoDefinitivo) {
    return 'Na triagem de uma doação anterior você foi considerado inapto definitivo para doar sangue. Procure o hemocentro para orientação.';
  }
  if (aptoAPartirDe && nova < aptoAPartirDe) {
    return `Na triagem de uma doação anterior você foi considerado inapto temporariamente. Escolha uma data a partir de ${formatar(aptoAPartirDe)}.`;
  }
  return null;
}
