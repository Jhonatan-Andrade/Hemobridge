import type { SituacaoPaciente } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { ButtonLink, Card, ErrorState, Loading, PatientBadge, ReadOnlyField } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { doadorService } from '../../services/doador'
import { hospitaisService } from '../../services/hospitais'
import { useAuth } from '../auth/authState'
import { DonorLayout } from './DonorLayout'
import { HospitalListItem } from './HospitalListItem'

// Textos de cada estado do painel (Figma: Paciente/Doador / Meu painel / <situação>).
const etapas: Record<SituacaoPaciente, { situacao: string; proximo: string }> = {
  PRE_CADASTRADO: {
    situacao: 'Seu pré-cadastro foi recebido.',
    proximo: 'Agende a consulta com a equipe médica para iniciar a avaliação.',
  },
  CONSULTA_AGENDADA: {
    situacao: 'Sua consulta está agendada.',
    proximo: 'Compareça na data marcada. A equipe pode solicitar exames.',
  },
  AGUARDANDO_EXAME: {
    situacao: 'A equipe solicitou exames.',
    proximo: 'Realize os exames e anexe o resultado para análise.',
  },
  EM_ANALISE: {
    situacao: 'Seus exames estão em análise.',
    proximo: 'Aguarde a avaliação da equipe. Você será avisado sobre o resultado.',
  },
  APROVADO: {
    situacao: 'Seu processo foi aprovado pela equipe.',
    proximo: 'Consulte onde seu tipo sanguíneo é mais necessário. O tipo sanguíneo é somente leitura.',
  },
  REPROVADO: {
    situacao: 'Seu processo não foi aprovado nesta avaliação.',
    proximo: 'Converse com a equipe para entender os motivos e as orientações.',
  },
}

// Figma: Web desktop / Paciente/Doador / Meu painel (8:1858 aprovado, 8:1947 carregando, 8:1962 falha).
export function DonorDashboardPage() {
  const { usuario } = useAuth()
  const perfil = useAsync(() => doadorService.obterPerfil(usuario!), [usuario])
  const doador = perfil.dados
  const tipo = doador?.tipoSanguineo ?? null

  // Painel do doador: instituições que precisam do tipo dele, por urgência e proximidade.
  const prioridades = useAsync(
    () => (tipo ? hospitaisService.listar({ tipos: [tipo], estado: doador?.estado, tamanhoPagina: 3 }) : Promise.resolve(null)),
    [tipo, doador?.estado],
  )

  return (
    <DonorLayout>
      {perfil.carregando ? (
        <Loading texto="Carregando seu painel…" />
      ) : perfil.erro || !doador ? (
        <ErrorState mensagens={perfil.erro ?? ['Não foi possível carregar seu painel.']} onRetry={perfil.recarregar} />
      ) : (
        <>
          <PageTitle titulo={`Olá, ${doador.nome.split(' ')[0]}`} />
          <PatientBadge situacao={doador.situacao} />
          <Card kind="situation" title="Sua situação">
            {etapas[doador.situacao].situacao}
          </Card>
          <Card title="Próximo passo">{etapas[doador.situacao].proximo}</Card>

          {tipo ? (
            <>
              <ButtonLink to="/doador/recomendados" block>
                Ver locais recomendados
              </ButtonLink>
              <section aria-labelledby="prioridades" className="flex flex-col gap-4">
                <h2 id="prioridades" className="text-section font-semibold text-ink">
                  Onde seu {tipo} é mais necessário
                </h2>
                {prioridades.carregando ? (
                  <Loading texto="Buscando instituições…" />
                ) : prioridades.erro ? (
                  <ErrorState mensagens={prioridades.erro} onRetry={prioridades.recarregar} />
                ) : !prioridades.dados?.itens.length ? (
                  <Card title="Nenhuma instituição encontrada">
                    Não há necessidades de {tipo} registradas em {doador.estado} no momento. Isso difere de uma falha ao carregar.
                  </Card>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {prioridades.dados.itens.map((h) => (
                      <HospitalListItem key={h.id} hospital={h} tipo={tipo} />
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <ButtonLink to="/locais" block>
              Encontrar locais
            </ButtonLink>
          )}

          <ReadOnlyField label="Tipo sanguíneo" value={tipo ?? 'Ainda não disponível'} hint="Definido pela equipe após exame" />
        </>
      )}
    </DonorLayout>
  )
}
