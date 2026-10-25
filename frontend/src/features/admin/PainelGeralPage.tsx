import { PageTitle } from '../../components/layout/AppShell'
import { ErrorState, Loading, Message, Panel } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { juntarTipos } from '../bloodbank/indicadores'
import { AdminLayout } from './AdminLayout'
import { carregarIndicadores } from './indicadoresAdmin'

// Figma: Web desktop / Administrador / Painel geral (154:3520).
export function PainelGeralPage() {
  const indicadores = useAsync(carregarIndicadores, [])

  return (
    <AdminLayout>
      <PageTitle titulo="Painel geral" descricao="Consulte os indicadores agregados das instituições e as necessidades por estado." />
      <p className="-mt-3 text-caption text-muted">Necessidades atuais são apresentadas separadamente dos totais de cadastro.</p>

      {indicadores.carregando ? (
        <Loading texto="Carregando indicadores…" />
      ) : indicadores.erro || !indicadores.dados ? (
        <ErrorState mensagens={indicadores.erro ?? ['Não foi possível carregar os indicadores.']} onRetry={indicadores.recarregar} />
      ) : (
        <>
          {!indicadores.dados.completo && (
            <Message tone="warning">
              <p>Há muitos registros: os números abaixo consideram só os primeiros 1.000 de cada listagem.</p>
            </Message>
          )}
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <Panel>
              <h2 className="text-section font-semibold text-ink">Doadores aprovados</h2>
              <p className="text-title font-semibold text-brand">{indicadores.dados.doadoresAprovados}</p>
              <p className="text-body text-muted">Quantidade total de doadores com situação aprovada.</p>
            </Panel>
            <Panel>
              <h2 className="text-section font-semibold text-ink">Hospitais ativos</h2>
              <p className="text-title font-semibold text-brand">{indicadores.dados.hospitaisAtivos}</p>
              <p className="text-body text-muted">Quantidade de instituições com cadastro ativo.</p>
            </Panel>
            <Panel>
              <h2 className="text-section font-semibold text-ink">Críticos por estado</h2>
              <p className="text-body text-muted">Tipos em nível CRÍTICO, agrupados pela UF da instituição.</p>
              {indicadores.dados.criticosPorEstado.length ? (
                <ul className="flex flex-col gap-2">
                  {indicadores.dados.criticosPorEstado.map((uf) => (
                    <li key={uf.estado} className="flex flex-col border-b border-line pb-2 last:border-0 last:pb-0">
                      <span className="text-body font-semibold text-ink">
                        {uf.estado} · {uf.hospitais === 1 ? '1 hospital' : `${uf.hospitais} hospitais`}
                      </span>
                      <span className="text-small text-muted">{juntarTipos(uf.tipos)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body font-semibold text-ink">Nenhum tipo em nível crítico.</p>
              )}
            </Panel>
          </div>
        </>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <h2 className="text-section font-semibold text-ink">Evolução agregada</h2>
          <p className="text-body text-muted">
            Sem doações registradas. A evolução por período aparecerá quando o registro de doações estiver disponível.
          </p>
        </Panel>
        <Panel>
          <h2 className="text-section font-semibold text-ink">Definição dos indicadores</h2>
          <p className="text-body text-muted">
            Dados agregados de cadastros e necessidades. Não são exibidos registros clínicos individuais.
          </p>
        </Panel>
      </div>
    </AdminLayout>
  )
}
