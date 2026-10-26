import type { Sexo } from '../generated/prisma/enums.js';
import { calcularIdade, hojeIso } from './data.js';

// RN17 – critérios do Ministério da Saúde usados pelo Hemobridge.
export const IDADE_MINIMA_DOACAO = 16;
export const IDADE_MAXIMA_DOACAO = 69;
export const IDADE_LIMITE_PRIMEIRA_DOACAO = 60;
export const PESO_MINIMO_DOACAO_KG = 50;
export const INTERVALO_MINIMO_DIAS: Record<Sexo, number> = { MASCULINO: 60, FEMININO: 90 };
export const LIMITE_ANUAL_DOACOES: Record<Sexo, number> = { MASCULINO: 4, FEMININO: 3 };

export type MotivoInelegibilidade = 'IDADE' | 'PESO' | 'INTERVALO' | 'LIMITE_ANUAL' | 'PRIMEIRA_DOACAO_APOS_60';

export interface DadosElegibilidade {
  dataNascimento: string; // YYYY-MM-DD
  sexo: Sexo;
  pesoKg: number;
  /** Datas de coleta (YYYY-MM-DD) registradas no Hemobridge. */
  doacoes: string[];
  /** Confirmação da triagem de que já doou antes dos 60 anos (UC21 FA02). */
  doouAntesDos60Confirmado?: boolean;
}

export interface ResultadoElegibilidade {
  elegivel: boolean;
  motivo?: MotivoInelegibilidade;
  mensagem?: string;
  /** Data a partir da qual poderá doar, quando o impedimento é temporário. */
  proximaData?: string;
  /** Menor de 18: exige autorização do responsável (UC21 FA01). */
  exigeAutorizacaoResponsavel: boolean;
}

/**
 * Estimativa orientativa da RN17. Considera só doações registradas na
 * plataforma e não substitui a triagem do hemocentro.
 */
export function estimarElegibilidade(d: DadosElegibilidade, hoje: string = hojeIso()): ResultadoElegibilidade {
  const idade = calcularIdade(d.dataNascimento, hoje);
  const exigeAutorizacaoResponsavel = idade < 18;
  const inelegivel = (motivo: MotivoInelegibilidade, mensagem: string, proximaData?: string) => ({
    elegivel: false,
    motivo,
    mensagem,
    proximaData,
    exigeAutorizacaoResponsavel,
  });

  if (idade < IDADE_MINIMA_DOACAO || idade > IDADE_MAXIMA_DOACAO) {
    return inelegivel('IDADE', `A doação é permitida entre ${IDADE_MINIMA_DOACAO} e ${IDADE_MAXIMA_DOACAO} anos.`);
  }
  if (d.pesoKg < PESO_MINIMO_DOACAO_KG) {
    return inelegivel('PESO', `O peso mínimo para doação é ${PESO_MINIMO_DOACAO_KG} kg.`);
  }
  if (idade > IDADE_LIMITE_PRIMEIRA_DOACAO && !d.doouAntesDos60Confirmado) {
    const limite = somarAnos(d.dataNascimento, IDADE_LIMITE_PRIMEIRA_DOACAO);
    if (!d.doacoes.some((data) => data < limite)) {
      return inelegivel(
        'PRIMEIRA_DOACAO_APOS_60',
        `Acima de ${IDADE_LIMITE_PRIMEIRA_DOACAO} anos, só pode doar quem já doou antes dessa idade.`,
      );
    }
  }

  const ordenadas = [...d.doacoes].filter((data) => data <= hoje).sort();
  const ultima = ordenadas.at(-1);
  if (ultima) {
    const liberadaEm = somarDias(ultima, INTERVALO_MINIMO_DIAS[d.sexo]);
    if (liberadaEm > hoje) {
      return inelegivel(
        'INTERVALO',
        `É preciso aguardar ${INTERVALO_MINIMO_DIAS[d.sexo]} dias entre doações.`,
        liberadaEm,
      );
    }
  }

  const umAnoAtras = somarDias(hoje, -365);
  const ultimos12Meses = ordenadas.filter((data) => data > umAnoAtras);
  const limite = LIMITE_ANUAL_DOACOES[d.sexo];
  if (ultimos12Meses.length >= limite) {
    // Libera quando a doação mais antiga da janela completar 12 meses.
    const liberadaEm = somarDias(ultimos12Meses[ultimos12Meses.length - limite], 365);
    return inelegivel('LIMITE_ANUAL', `O limite é de ${limite} doações em 12 meses.`, liberadaEm);
  }

  return { elegivel: true, exigeAutorizacaoResponsavel };
}

/** Próxima data possível de doação (hoje, se já puder doar). */
export function proximaDataDoacao(d: DadosElegibilidade, hoje: string = hojeIso()): string | null {
  const r = estimarElegibilidade(d, hoje);
  if (r.elegivel) return hoje;
  return r.proximaData ?? null;
}

export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function somarAnos(data: string, anos: number): string {
  const [a, m, d] = data.split('-');
  return `${Number(a) + anos}-${m}-${d}`;
}

/** Date de coluna DATE (UTC) para YYYY-MM-DD. */
export function dataParaIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}
