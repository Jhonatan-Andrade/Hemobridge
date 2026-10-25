import type { HistoricoNecessidade, NecessidadesHospital, NivelNecessidade, Paginado } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { ButtonLink, Card, ErrorState, Loading, Panel } from '../../components/ui'
import { formatarData, formatarDataHora, NIVEIS } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { necessidadesService } from '../../services/necessidades'
import { BarRow } from './BarRow'
import { BloodBankLayout } from './BloodBankLayout'
import { agruparPorSemana, inicioDoPeriodo, juntarTipos, SEMANAS, TOM_NIVEL, URGENCIA } from './indicadores'

const LIMITE_HISTORICO = 100

// Figma: Web desktop / Representante de Hospital / Indicadores / Preenchido (910:9870) e Sem registros.
export function DashboardPage() {
  const inicio = inicioDoPeriodo()
  const necessidades = useAsync(() => necessidadesService.listar(), [])
  const historico = useAsync(
    () => necessidadesService.historico({ de: inicio.toISOString().slice(0, 10), tamanhoPagina: LIMITE_HISTORICO }),
    [inicio.toDateString()],
  )

  const carregando = necessidades.carregando || historico.carregando
  const erro = necessidades.erro ?? historico.erro

  return (
    <BloodBankLayout>
      {carregando ? (
        <Loading texto="Carregando indicadores…" />
      ) : erro || !necessidades.dados || !historico.dados ? (
        <ErrorState
          mensagens={erro ?? ['Não foi possível carregar os indicadores.']}
          onRetry={() => {
            necessidades.recarregar()
            historico.recarregar()
          }}
        />
      ) : (
        <Indicadores dados={necessidades.dados} historico={historico.dados} inicio={inicio} />
      )}
    </BloodBankLayout>
  )
}

type IndicadoresProps = { dados: NecessidadesHospital; historico: Paginado<HistoricoNecessidade>; inicio: Date }

function Indicadores({ dados, historico, inicio }: IndicadoresProps) {
  const { hospital, necessidades: lista, ultimaAtualizacao } = dados
  const porNivel = (nivel: NivelNecessidade) => lista.filter((n) => n.nivel === nivel)
  const criticos = porNivel('CRITICO').map((n) => n.tipo)
  const ordenadas = [...lista].sort((a, b) => URGENCIA[b.nivel] - URGENCIA[a.nivel])
  const semanas = agruparPorSemana(historico.itens, inicio)
  const maxSemana = Math.max(1, ...semanas.map((s) => s.atualizacoes))
  const semRegistros = historico.total === 0

  return (
    <>
      <PageTitle
        titulo="Painel do hospital"
        descricao={
          <>
            {hospital.nome}
            <br />
            Período: {formatarData(inicio.toISOString())}–{formatarData(new Date().toISOString())} · atualizado em{' '}
            {formatarDataHora(ultimaAtualizacao)}
          </>
        }
      />

      <Panel>
        <h2 className="text-section font-semibold text-ink">
          {criticos.length === 1 ? '1 tipo em nível crítico' : `${criticos.length} tipos em nível crítico`}
        </h2>
        <p className="text-body text-muted">
          {porNivel('BAIXO').length} baixo · {porNivel('ESTAVEL').length} estável · {porNivel('ADEQUADO').length} adequado ·{' '}
          {porNivel('NAO_INFORMADO').length} não informado
        </p>
      </Panel>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel>
          <div className="flex flex-col gap-1">
            <h2 className="text-section font-semibold text-ink">Necessidades por tipo sanguíneo</h2>
            <p className="text-body text-muted">Nível atual, do mais urgente ao menos urgente</p>
            <p className="text-body text-muted">Escala: barra cheia = crítico</p>
          </div>
          <ul className="flex flex-col gap-4">
            {ordenadas.map((n) => (
              <BarRow key={n.tipo} rotulo={`${n.tipo.replace('-', '−')} · ${NIVEIS[n.nivel]}`} valor={URGENCIA[n.nivel]} maximo={4} tom={TOM_NIVEL[n.nivel]} />
            ))}
          </ul>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel>
            <div className="flex flex-col gap-1">
              <h2 className="text-section font-semibold text-ink">Evolução por semana</h2>
              <p className="text-body text-muted">Atualizações de nível nas últimas {SEMANAS} semanas</p>
            </div>
            {semRegistros ? (
              <Card title="Sem registros no período">Nenhum nível foi alterado nas últimas {SEMANAS} semanas.</Card>
            ) : (
              <ul className="flex flex-col gap-4">
                {semanas.map((s) => (
                  <BarRow
                    key={s.rotulo}
                    rotulo={`${s.rotulo} · ${s.atualizacoes} ${s.atualizacoes === 1 ? 'atualização' : 'atualizações'}${s.paraCritico ? ` · ${s.paraCritico} para crítico` : ''}`}
                    valor={s.atualizacoes}
                    maximo={maxSemana}
                  />
                ))}
              </ul>
            )}
            {historico.total > LIMITE_HISTORICO && (
              <p className="text-small text-muted">Considerando as {LIMITE_HISTORICO} alterações mais recentes.</p>
            )}
          </Panel>

          <Panel>
            <h2 className="text-section font-semibold text-ink">
              {criticos.length ? `Tipos críticos: ${juntarTipos(criticos)}` : 'Nenhum tipo em nível crítico'}
            </h2>
            <p className="text-body text-muted">
              {criticos.length
                ? 'Esses tipos aparecem primeiro para os doadores compatíveis. Confira a última atualização na aba Necessidades.'
                : 'Mantenha os níveis atualizados para que os doadores vejam onde sua doação é mais necessária.'}
            </p>
            <ButtonLink to="/hospital/necessidades" kind="secondary">
              Atualizar necessidades
            </ButtonLink>
          </Panel>
        </div>
      </div>

      <p className="text-body text-muted">Indicadores agregados. Nenhum dado clínico individual é exibido.</p>
    </>
  )
}
