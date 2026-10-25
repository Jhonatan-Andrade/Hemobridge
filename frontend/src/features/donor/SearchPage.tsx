import { useState, type FormEvent, type ReactNode } from 'react'
import type { NivelInformavel, TipoSanguineo } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, Card, ErrorState, Loading, Message, Panel, SelectField, TextField } from '../../components/ui'
import { NIVEIS, TIPOS_SANGUINEOS, UFS } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { hospitaisService } from '../../services/hospitais'
import { useAuth } from '../auth/authState'
import { PublicLayout } from '../auth/PublicLayout'
import { DonorLayout } from './DonorLayout'
import { HospitalListItem } from './HospitalListItem'
import { useLocalizacao } from './useLocalizacao'

type Filtros = { tipo: '' | TipoSanguineo; nivel: '' | NivelInformavel; estado: string; cidade: string }
const iniciais: Filtros = { tipo: '', nivel: '', estado: '', cidade: '' }
const TAMANHO_PAGINA = 10

const opcoesTipo = TIPOS_SANGUINEOS.map((t) => ({ value: t, label: t }))
const opcoesNivel = (['CRITICO', 'BAIXO', 'ESTAVEL', 'ADEQUADO'] as const).map((n) => ({ value: n, label: NIVEIS[n] }))
const opcoesUf = UFS.map((uf) => ({ value: uf, label: uf }))

function Layout({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  if (usuario?.perfil === 'PACIENTE') return <DonorLayout largura="page">{children}</DonorLayout>
  return <PublicLayout largura="page">{children}</PublicLayout>
}

// Figma: Web desktop / Paciente/Doador / Encontrar locais (707:7062). A busca é pública (RF20–RF22).
export function SearchPage() {
  const [rascunho, setRascunho] = useState<Filtros>(iniciais)
  const [filtros, setFiltros] = useState<Filtros>(iniciais)
  const [pagina, setPagina] = useState(1)
  const [erroCidade, setErroCidade] = useState<string>()
  const local = useLocalizacao()
  const { lat, lng } = local.posicao ?? {}

  const resultado = useAsync(
    () =>
      hospitaisService.listar({
        tipos: filtros.tipo ? [filtros.tipo] : undefined,
        estado: filtros.estado || undefined,
        cidade: filtros.cidade || undefined,
        lat,
        lng,
        pagina,
        tamanhoPagina: TAMANHO_PAGINA,
      }),
    [filtros, pagina, lat, lng],
  )

  // O backend não filtra por nível; o filtro é aplicado sobre a página recebida.
  const itens = (resultado.dados?.itens ?? []).filter((h) => {
    if (!filtros.nivel) return true
    const alvo = filtros.tipo ? h.necessidades.filter((n) => n.tipo === filtros.tipo) : h.necessidades
    return alvo.some((n) => n.nivel === filtros.nivel)
  })
  const totalPaginas = resultado.dados ? Math.max(1, Math.ceil(resultado.dados.total / TAMANHO_PAGINA)) : 1

  function aplicar(e: FormEvent) {
    e.preventDefault()
    const cidade = rascunho.cidade.trim()
    if (cidade && cidade.length < 2) {
      setErroCidade('Informe ao menos 2 letras do município.')
      return
    }
    setErroCidade(undefined)
    setPagina(1)
    setFiltros({ ...rascunho, cidade })
  }

  function limpar() {
    setRascunho(iniciais)
    setFiltros(iniciais)
    setPagina(1)
    setErroCidade(undefined)
    local.limpar()
  }

  return (
    <Layout>
      <PageTitle
        sobretitulo="Locais"
        titulo="Encontrar locais"
        descricao="Procure hemocentros e hospitais por tipo sanguíneo, região e nível de necessidade. Confirme serviço, endereço e horário diretamente com cada unidade."
      />

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <h2 className="text-section font-medium text-ink">O que você procura?</h2>
          <form noValidate onSubmit={aplicar} className="flex flex-col gap-3">
            <SelectField label="Tipo sanguíneo" placeholder="Todos os tipos" options={opcoesTipo} value={rascunho.tipo} onChange={(e) => setRascunho({ ...rascunho, tipo: e.target.value as Filtros['tipo'] })} />
            <SelectField
              label="Nível de necessidade"
              placeholder="Todos os níveis"
              options={opcoesNivel}
              value={rascunho.nivel}
              onChange={(e) => setRascunho({ ...rascunho, nivel: e.target.value as Filtros['nivel'] })}
            />
            <SelectField label="Estado" placeholder="Todos os estados" options={opcoesUf} value={rascunho.estado} onChange={(e) => setRascunho({ ...rascunho, estado: e.target.value })} />
            <TextField
              label="Município"
              hint="Informe apenas cidade e estado, sem endereço pessoal."
              placeholder="Ex.: Curitiba"
              value={rascunho.cidade}
              onChange={(e) => setRascunho({ ...rascunho, cidade: e.target.value })}
              error={erroCidade}
            />
            <Button type="submit" block>
              Buscar
            </Button>
            <Button kind="secondary" block onClick={limpar}>
              Limpar filtros
            </Button>
          </form>
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-body text-muted">Ordene pela distância até você. A localização não é salva.</p>
            {local.posicao ? (
              <Button kind="secondary" block onClick={local.limpar}>
                Parar de usar minha localização
              </Button>
            ) : (
              <Button kind="secondary" block onClick={local.solicitar} loading={local.carregando}>
                Usar minha localização
              </Button>
            )}
            {local.erro && <Message tone="warning">{local.erro}</Message>}
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-section font-medium text-ink">Resultados</h2>
            <p className="text-small text-muted">
              {filtros.tipo ? `Maior necessidade de ${filtros.tipo} primeiro` : 'Ordem alfabética'}
              {local.posicao ? '; no mesmo nível, menor distância.' : '.'}
            </p>
          </div>
          {resultado.carregando ? (
            <Loading texto="Buscando locais…" />
          ) : resultado.erro ? (
            <ErrorState mensagens={resultado.erro} onRetry={resultado.recarregar} />
          ) : itens.length === 0 ? (
            <Card title="Nenhum local encontrado">Ajuste os filtros ou amplie a região da busca.</Card>
          ) : (
            <>
              <ul className="flex flex-col gap-4" aria-label="Locais encontrados">
                {itens.map((h) => (
                  <HospitalListItem key={h.id} hospital={h} tipo={filtros.tipo || null} fundo="background" />
                ))}
              </ul>
              {totalPaginas > 1 && (
                <nav aria-label="Paginação" className="flex items-center justify-between gap-3">
                  <Button kind="secondary" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                    Anterior
                  </Button>
                  <p className="text-small text-muted">
                    Página {pagina} de {totalPaginas}
                  </p>
                  <Button kind="secondary" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                    Próxima
                  </Button>
                </nav>
              )}
            </>
          )}
        </Panel>
      </div>
      <p className="text-small text-muted">Necessidades informadas pelas instituições. Confirme o atendimento antes de se deslocar.</p>
    </Layout>
  )
}
