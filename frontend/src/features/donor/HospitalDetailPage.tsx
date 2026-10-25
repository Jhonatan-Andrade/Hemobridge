import { useParams } from 'react-router-dom'
import { NeedsTable } from '../../components/NeedsTable'
import { PageTitle } from '../../components/layout/AppShell'
import { ButtonLink, ErrorState, Loading, Panel } from '../../components/ui'
import { formatarDataHora, mascaraCep, mascaraTelefone } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { hospitaisService } from '../../services/hospitais'
import { useAuth } from '../auth/authState'
import { PublicLayout } from '../auth/PublicLayout'
import { DonorLayout } from './DonorLayout'

/**
 * Detalhes do banco de sangue. Não há frame dedicado no Figma: a tela combina o cabeçalho das
 * telas de Locais com o painel de necessidades da área do hospital (104:3280).
 */
export function HospitalDetailPage() {
  const { id = '' } = useParams()
  const { usuario } = useAuth()
  const hospital = useAsync(() => hospitaisService.detalhar(id), [id])
  const Layout = usuario?.perfil === 'PACIENTE' ? DonorLayout : PublicLayout
  const h = hospital.dados

  return (
    <Layout largura="page">
      {hospital.carregando ? (
        <Loading texto="Carregando informações do local…" />
      ) : hospital.erro || !h ? (
        <ErrorState mensagens={hospital.erro ?? ['Local não encontrado.']} onRetry={hospital.recarregar} />
      ) : (
        <>
          <PageTitle sobretitulo="Locais" titulo={h.nome} descricao={`${h.cidade}/${h.estado}`} />
          <div className="grid items-start gap-5 lg:grid-cols-3">
            <Panel className="lg:col-span-1">
              <h2 className="text-section font-semibold text-ink">Atendimento</h2>
              <dl className="flex flex-col gap-3 text-body">
                <div>
                  <dt className="text-label font-medium text-ink">Endereço</dt>
                  <dd className="text-muted">
                    {h.endereco}, {h.cidade}/{h.estado} · CEP {mascaraCep(h.cep)}
                  </dd>
                </div>
                <div>
                  <dt className="text-label font-medium text-ink">Contato</dt>
                  <dd>
                    <a href={`tel:+55${h.telefone}`} className="text-brand hover:underline">
                      {mascaraTelefone(h.telefone)}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-label font-medium text-ink">Horário de funcionamento</dt>
                  <dd className="text-muted">{h.horarioFuncionamento ?? 'Não informado. Confirme por telefone.'}</dd>
                </div>
              </dl>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-small font-semibold text-brand hover:underline"
              >
                Abrir no Google Maps ↗<span className="sr-only"> (abre em nova aba)</span>
              </a>
            </Panel>
            <Panel className="lg:col-span-2">
              <div className="flex flex-col gap-1">
                <h2 className="text-section font-semibold text-ink">Necessidades por tipo sanguíneo</h2>
                <p className="text-small text-muted">Última atualização: {formatarDataHora(h.ultimaAtualizacao)}</p>
              </div>
              <NeedsTable necessidades={h.necessidades} legenda={`Necessidades de ${h.nome} por tipo sanguíneo`} />
              <p className="text-small text-muted">Cada nível corresponde à última atualização informada pela instituição.</p>
            </Panel>
          </div>
          <ButtonLink to="/locais" kind="secondary">
            Voltar aos locais
          </ButtonLink>
        </>
      )}
    </Layout>
  )
}
