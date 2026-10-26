import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, EmptyState, ErrorState, Loading, Message, Panel } from '../../components/ui'
import { formatarAfericoes, formatarAptidao, formatarDataHora, RESULTADOS_DOACAO, SITUACOES_PACIENTE } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { historicoService } from '../../services/equipe'
import { LayoutEquipe as Layout } from './LayoutEquipe'

// RF12 – histórico do paciente em todos os hemocentros, com a origem de cada registro.
// Só abre para pacientes com agendamento neste hemocentro; cada leitura é auditada.
export function HistoricoPacientePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const historico = useAsync(() => historicoService.doPaciente(id), [id])
  const h = historico.dados

  return (
    <Layout>
      {historico.carregando ? (
        <Loading texto="Carregando o histórico…" />
      ) : historico.erro || !h ? (
        <ErrorState mensagens={historico.erro ?? ['Não foi possível carregar o histórico.']} onRetry={historico.recarregar} />
      ) : (
        <>
          <PageTitle
            sobretitulo="Histórico de doações"
            titulo={h.paciente.nome}
            descricao={[
              h.paciente.idade !== null ? `${h.paciente.idade} anos` : null,
              `Conta ${SITUACOES_PACIENTE[h.paciente.situacao].toLowerCase()}`,
              h.paciente.tipoSanguineo ? `Tipo ${h.paciente.tipoSanguineo}` : 'Tipo ainda não registrado',
            ]
              .filter(Boolean)
              .join(' · ')}
          />
          {(h.paciente.inaptoDefinitivo || h.paciente.aptoAPartirDe) && (
            <Message tone="error">
              <p>
                {h.paciente.inaptoDefinitivo
                  ? 'Paciente considerado inapto definitivo na triagem de uma doação. Não pode doar.'
                  : `Paciente inapto temporariamente: apto a partir de ${h.paciente.aptoAPartirDe!.split('-').reverse().join('/')}.`}
              </p>
            </Message>
          )}
          <Message tone="info">
            <p>
              Registros de outros hemocentros são somente leitura e não trazem a triagem nem os exames, que ficam no hemocentro que atendeu. Este acesso fica registrado
              na auditoria (LGPD).
            </p>
          </Message>
          {!h.doacoes.length ? (
            <EmptyState title="Nenhuma doação registrada">O paciente ainda não foi atendido em nenhum hemocentro.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {h.doacoes.map((d) => (
                <li key={d.id}>
                  <Panel>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <h2 className="text-section font-semibold text-ink">{formatarDataHora(d.registradoEm)}</h2>
                      <p className={`text-small font-semibold uppercase ${d.doMeuHemocentro ? 'text-info' : 'text-brand'}`}>
                        {d.doMeuHemocentro ? 'Este hemocentro' : 'Outro hemocentro'}
                      </p>
                    </div>
                    <p className="text-body text-muted">
                      {d.hemocentro.nome} · {d.hemocentro.cidade}/{d.hemocentro.estado} · registrado por {d.medico}
                    </p>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-small">
                      <dt className="text-muted">Resultado</dt>
                      <dd className="text-ink">{RESULTADOS_DOACAO[d.resultado]}</dd>
                      <dt className="text-muted">Tipo sanguíneo</dt>
                      <dd className="text-ink">{d.tipoSanguineo ?? '—'}</dd>
                      {d.aptidao && (
                        <>
                          <dt className="text-muted">Aptidão</dt>
                          <dd className="text-ink">{formatarAptidao(d.aptidao, d.aptoAPartirDe)}</dd>
                        </>
                      )}
                      {d.afericoes && (
                        <>
                          <dt className="text-muted">Aferições</dt>
                          <dd className="text-ink">{formatarAfericoes(d.afericoes)}</dd>
                        </>
                      )}
                      {d.volumeMl !== null && (
                        <>
                          <dt className="text-muted">Coleta</dt>
                          <dd className="text-ink">
                            {d.volumeMl} mL{d.numeroBolsa && ` · bolsa ${d.numeroBolsa}`}
                          </dd>
                        </>
                      )}
                      {d.reacoes && (
                        <>
                          <dt className="text-muted">Reações</dt>
                          <dd className="text-ink">{d.reacoes}</dd>
                        </>
                      )}
                      {d.motivoNaoDoacao && (
                        <>
                          <dt className="text-muted">Motivo</dt>
                          <dd className="text-ink">{d.motivoNaoDoacao}</dd>
                        </>
                      )}
                      {d.observacoes && (
                        <>
                          <dt className="text-muted">Observações</dt>
                          <dd className="text-ink">{d.observacoes}</dd>
                        </>
                      )}
                    </dl>
                  </Panel>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <Button kind="secondary" onClick={() => navigate(-1)}>
        Voltar
      </Button>
    </Layout>
  )
}
