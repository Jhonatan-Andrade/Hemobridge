import type { Paginado } from '../../api/types'
import { hospitaisAdminService, usuariosAdminService } from '../../services/admin'
import { hospitaisService } from '../../services/hospitais'

// Não há endpoint de indicadores agregados (ver README → "Contratos pendentes"). Os números são
// calculados no navegador a partir das listagens, limitados a LIMITE_PAGINAS páginas de 50.
const TAMANHO = 50
const LIMITE_PAGINAS = 20

async function percorrer<T>(buscar: (pagina: number) => Promise<Paginado<T>>) {
  const itens: T[] = []
  for (let pagina = 1; pagina <= LIMITE_PAGINAS; pagina++) {
    const resposta = await buscar(pagina)
    itens.push(...resposta.itens)
    if (pagina * TAMANHO >= resposta.total) return { itens, completo: true }
  }
  return { itens, completo: false }
}

export type CriticosUf = { estado: string; hospitais: number; tipos: string[] }

export type IndicadoresAdmin = {
  doadoresAprovados: number
  hospitaisAtivos: number
  criticosPorEstado: CriticosUf[]
  /** false quando alguma listagem passou do limite e o número é parcial. */
  completo: boolean
}

export async function carregarIndicadores(): Promise<IndicadoresAdmin> {
  const [pacientes, ativos, publicos] = await Promise.all([
    percorrer((pagina) => usuariosAdminService.listar({ perfil: 'PACIENTE', pagina, tamanhoPagina: TAMANHO })),
    hospitaisAdminService.listar({ ativo: true, tamanhoPagina: 1 }),
    // A consulta pública só lista hospitais ativos, já com o nível de cada tipo.
    percorrer((pagina) => hospitaisService.listar({ pagina, tamanhoPagina: TAMANHO })),
  ])

  const porUf = new Map<string, { hospitais: number; tipos: Set<string> }>()
  for (const h of publicos.itens) {
    const criticos = h.necessidades.filter((n) => n.nivel === 'CRITICO').map((n) => n.tipo)
    if (!criticos.length) continue
    const uf = porUf.get(h.estado) ?? { hospitais: 0, tipos: new Set<string>() }
    uf.hospitais++
    criticos.forEach((t) => uf.tipos.add(t))
    porUf.set(h.estado, uf)
  }

  return {
    doadoresAprovados: pacientes.itens.filter((u) => u.papel === 'DOADOR').length,
    hospitaisAtivos: ativos.total,
    criticosPorEstado: [...porUf]
      .map(([estado, { hospitais, tipos }]) => ({ estado, hospitais, tipos: [...tipos].sort() }))
      .sort((a, b) => b.hospitais - a.hospitais || a.estado.localeCompare(b.estado)),
    completo: pacientes.completo && publicos.completo,
  }
}
