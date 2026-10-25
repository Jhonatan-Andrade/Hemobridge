import type { HistoricoNecessidade, NivelNecessidade } from '../../api/types'

/** Urgência de 0 a 4 usada no gráfico de necessidades (Crítico = barra cheia). */
export const URGENCIA: Record<NivelNecessidade, number> = {
  CRITICO: 4,
  BAIXO: 3,
  ESTAVEL: 2,
  ADEQUADO: 1,
  NAO_INFORMADO: 0,
}

export const TOM_NIVEL = {
  CRITICO: 'error',
  BAIXO: 'warning',
  ESTAVEL: 'info',
  ADEQUADO: 'success',
  NAO_INFORMADO: 'muted',
} as const

export const SEMANAS = 6
const DIA = 24 * 60 * 60 * 1000

/** Início (00:00) da janela analisada: hoje menos SEMANAS semanas. */
export function inicioDoPeriodo(hoje = new Date()) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return new Date(d.getTime() - (SEMANAS * 7 - 1) * DIA)
}

export type Semana = { rotulo: string; atualizacoes: number; paraCritico: number }

const curta = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

/** Agrupa o histórico em semanas consecutivas a partir de `inicio`. */
export function agruparPorSemana(historico: HistoricoNecessidade[], inicio: Date): Semana[] {
  const semanas = Array.from({ length: SEMANAS }, (_, i) => {
    const de = new Date(inicio.getTime() + i * 7 * DIA)
    const ate = new Date(de.getTime() + 6 * DIA)
    return { rotulo: `${curta(de)}–${curta(ate)}`, atualizacoes: 0, paraCritico: 0 }
  })
  for (const h of historico) {
    const indice = Math.floor((new Date(h.alteradoEm).getTime() - inicio.getTime()) / (7 * DIA))
    const semana = semanas[indice]
    if (!semana) continue
    semana.atualizacoes++
    if (h.para === 'CRITICO') semana.paraCritico++
  }
  return semanas
}

/** Lista "O− e A−" / "A+, B+ e O−". */
export function juntarTipos(tipos: string[]) {
  const t = tipos.map((x) => x.replace('-', '−'))
  return t.length <= 1 ? (t[0] ?? '') : `${t.slice(0, -1).join(', ')} e ${t[t.length - 1]}`
}
