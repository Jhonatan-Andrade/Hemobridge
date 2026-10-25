import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, Card, ErrorState, Loading, Message } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { doadorService } from '../../services/doador'
import { hospitaisService } from '../../services/hospitais'
import { useAuth } from '../auth/authState'
import { DonorLayout } from './DonorLayout'
import { HospitalListItem } from './HospitalListItem'
import { useLocalizacao } from './useLocalizacao'

// Figma: Web desktop / Paciente/Doador / Locais / Recomendações (906:9914).
export function RecommendedPage() {
  const { usuario } = useAuth()
  const perfil = useAsync(() => doadorService.obterPerfil(usuario!), [usuario])
  const doador = perfil.dados
  const tipo = doador?.tipoSanguineo ?? null
  const local = useLocalizacao()
  const { lat, lng } = local.posicao ?? {}

  // Com a localização, a busca vale para todo o país e a distância desempata; sem ela, usa o estado do doador.
  const lista = useAsync(
    () =>
      tipo
        ? hospitaisService.listar({ tipos: [tipo], lat, lng, estado: lat === undefined ? doador?.estado : undefined, tamanhoPagina: 20 })
        : Promise.resolve(null),
    [tipo, doador?.estado, lat, lng],
  )

  if (perfil.carregando) {
    return (
      <DonorLayout largura="wide">
        <Loading />
      </DonorLayout>
    )
  }
  if (perfil.erro || !doador) {
    return (
      <DonorLayout largura="wide">
        <ErrorState mensagens={perfil.erro ?? ['Não foi possível carregar seus dados.']} onRetry={perfil.recarregar} />
      </DonorLayout>
    )
  }

  return (
    <DonorLayout largura="wide">
      <PageTitle
        titulo="Locais recomendados"
        descricao="Encontre instituições que precisam do seu tipo validado. A distância complementa a prioridade da necessidade."
      />

      {!tipo ? (
        <Card title="Tipo sanguíneo ainda não validado">
          As recomendações aparecem depois que a equipe aprova seu processo e registra seu tipo sanguíneo. Enquanto isso, você pode consultar
          os locais pela busca.
        </Card>
      ) : (
        <>
          <div className="grid items-start gap-4 md:grid-cols-3">
            <Card kind="situation" title="Tipo sanguíneo">
              {tipo} · validado pela equipe. Somente leitura.
            </Card>
            <Card kind="situation" title="Sua região">
              {local.posicao ? 'Usando sua localização atual para calcular a distância.' : `${doador.cidade}/${doador.estado} · informe sua localização para ver a distância.`}
            </Card>
            <Card title="Instituições por prioridade">
              Necessidade de {tipo}. Maior necessidade primeiro; no mesmo nível, menor distância.
            </Card>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {local.posicao ? (
              <Button kind="secondary" onClick={local.limpar}>
                Parar de usar minha localização
              </Button>
            ) : (
              <Button kind="secondary" onClick={local.solicitar} loading={local.carregando}>
                Usar minha localização
              </Button>
            )}
          </div>
          {local.erro && <Message tone="warning">{local.erro}</Message>}

          {lista.carregando ? (
            <Loading texto="Buscando instituições…" />
          ) : lista.erro ? (
            <ErrorState mensagens={lista.erro} onRetry={lista.recarregar} />
          ) : !lista.dados?.itens.length ? (
            <Card title="Nenhuma instituição encontrada">
              Não há necessidades de {tipo} registradas {local.posicao ? 'no momento' : `em ${doador.estado}`}. Tente usar sua localização ou a busca
              completa.
            </Card>
          ) : (
            <ul className="flex flex-col gap-4" aria-label={`Instituições que precisam de ${tipo}`}>
              {lista.dados.itens.map((h) => (
                <HospitalListItem key={h.id} hospital={h} tipo={tipo} />
              ))}
            </ul>
          )}
        </>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <ButtonLink to="/doador" kind="secondary">
          Voltar ao painel
        </ButtonLink>
        <ButtonLink to="/locais" kind="secondary">
          Buscar todos os locais
        </ButtonLink>
      </div>
    </DonorLayout>
  )
}
