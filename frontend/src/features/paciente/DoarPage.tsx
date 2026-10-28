import { useState, type FormEvent } from 'react'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, Card, ErrorState, Loading, Message, Pagination, Panel, TextField } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { hemocentrosService } from '../../services/hemocentros'
import { pacienteService } from '../../services/paciente'
import { useAuth } from '../auth/authState'
import { HemocentroCard } from './HemocentroCard'
import { LayoutDoar } from './PacienteLayout'

const TAMANHO_PAGINA = 10

// RF05 / RF18 – Doar: hemocentros ativos com busca por nome/cidade e as necessidades atuais.
// Figma: Paciente/Doador / Encontrar locais (707:7062), sem mapa nem geolocalização.
export function DoarPage() {
  const { usuario } = useAuth()
  const paciente = usuario?.perfil === 'PACIENTE'
  // O tipo só existe depois da ativação; com ele, quem precisa exatamente desse tipo vem primeiro.
  const painel = useAsync(() => (paciente ? pacienteService.painel() : Promise.resolve(null)), [paciente])
  const tipo = painel.dados?.tipoSanguineo ?? undefined

  const [rascunho, setRascunho] = useState('')
  const [busca, setBusca] = useState('')
  const [erroBusca, setErroBusca] = useState<string>()
  const [pagina, setPagina] = useState(1)

  const lista = useAsync(
    () => hemocentrosService.listar({ busca: busca || undefined, tipo, pagina, tamanhoPagina: TAMANHO_PAGINA }),
    [busca, tipo, pagina],
  )

  function buscar(e: FormEvent) {
    e.preventDefault()
    const termo = rascunho.trim()
    if (termo && termo.length < 2) return setErroBusca('Digite ao menos 2 letras.')
    setErroBusca(undefined)
    setPagina(1)
    setBusca(termo)
  }

  return (
    <LayoutDoar>
      <PageTitle
        sobretitulo="Doar"
        titulo="Escolha um hemocentro"
        descricao="Veja de quais tipos sanguíneos cada hemocentro precisa agora e os horários com vaga para agendar sua doação."
      />

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <Panel>
          <h2 className="text-section font-medium text-ink">Buscar</h2>
          <form noValidate onSubmit={buscar} className="flex flex-col gap-3" role="search">
            <TextField
              label="Nome ou cidade"
              type="search"
              placeholder="Ex.: Curitiba"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              error={erroBusca}
            />
            <Button type="submit" block>
              Buscar
            </Button>
            {busca && (
              <Button
                kind="secondary"
                block
                onClick={() => {
                  setRascunho('')
                  setBusca('')
                  setPagina(1)
                }}
              >
                Limpar busca
              </Button>
            )}
          </form>
          {tipo ? (
            <Message tone="info">
              <p>Seu tipo é {tipo}. Hemocentros que precisam dele aparecem primeiro e em destaque.</p>
            </Message>
          ) : (
            paciente && (
              <p className="text-small text-muted">Depois da ativação da sua conta, os hemocentros que precisam do seu tipo aparecem em destaque.</p>
            )
          )}
        </Panel>

        <Panel className="lg:col-span-2">
          <h2 className="text-section font-medium text-ink">Hemocentros</h2>
          {lista.carregando ? (
            <Loading texto="Buscando hemocentros…" />
          ) : lista.erro || !lista.dados ? (
            <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar os hemocentros.']} onRetry={lista.recarregar} />
          ) : !lista.dados.itens.length ? (
            <Card title="Nenhum hemocentro encontrado">{busca ? 'Tente outro nome ou cidade.' : 'Ainda não há hemocentros parceiros.'}</Card>
          ) : (
            <>
              <ul className="flex flex-col gap-4" aria-label="Hemocentros encontrados">
                {lista.dados.itens.map((h) => (
                  <HemocentroCard key={h.id} hemocentro={h} tipo={tipo} fundo="background" />
                ))}
              </ul>
              <Pagination pagina={pagina} total={lista.dados.total} tamanhoPagina={TAMANHO_PAGINA} onChange={setPagina} />
            </>
          )}
        </Panel>
      </div>
    </LayoutDoar>
  )
}
