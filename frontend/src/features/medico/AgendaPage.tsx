import { useMemo, useState } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { ConsultaMedicoResumo, HorarioAgenda } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, EmptyState, ErrorState, Loading, Message, Pagination, Panel } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { agendaService, atendimentoService } from '../../services/medico'
import { Calendario } from './Calendario'
import { MedicoLayout } from './MedicoLayout'
import { PublicarHorario } from './PublicarHorario'
import { corSituacao, dataLocalIso, formatarHora, formatarHorario, SITUACOES_CONSULTA } from './rotulos'

type Aba = 'proximos' | 'historico'

// Figma: Web desktop / Médico / Agenda / Próximos (101:3115) e Histórico (832:9757). UC13.
export function AgendaPage() {
  const [data, setData] = useState(() => dataLocalIso(new Date()))
  const [aba, setAba] = useState<Aba>('proximos')
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; textos: string[] } | null>(null)
  const agenda = useAsync(() => agendaService.listar(), [])

  const comHorarios = useMemo(
    () => new Set((agenda.dados?.horarios ?? []).map((h) => dataLocalIso(new Date(h.inicio)))),
    [agenda.dados],
  )

  const avisar = (tom: 'success' | 'error', textos: string[]) => {
    setAviso({ tom, textos })
    agenda.recarregar()
  }

  return (
    <MedicoLayout>
      <PageTitle titulo="Minha agenda" descricao="Publique horários de teleconsulta e acompanhe as consultas marcadas pelos pacientes." />

      {aviso && (
        <Message tone={aviso.tom}>
          {aviso.textos.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </Message>
      )}

      <Panel className="grid gap-8 md:grid-cols-2">
        <Calendario selecionada={data} onSelecionar={setData} comHorarios={comHorarios} />
        <PublicarHorario data={data} onPublicado={(m) => avisar('success', [m])} />
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Consultas">
        <Button block kind={aba === 'proximos' ? 'primary' : 'secondary'} aria-pressed={aba === 'proximos'} onClick={() => setAba('proximos')}>
          Próximos
        </Button>
        <Button block kind={aba === 'historico' ? 'primary' : 'secondary'} aria-pressed={aba === 'historico'} onClick={() => setAba('historico')}>
          Histórico
        </Button>
      </div>

      {aba === 'proximos' ? (
        agenda.carregando ? (
          <Loading texto="Carregando agenda…" />
        ) : agenda.erro || !agenda.dados ? (
          <ErrorState mensagens={agenda.erro ?? ['Não foi possível carregar a agenda.']} onRetry={agenda.recarregar} />
        ) : (
          <Proximos horarios={agenda.dados.horarios} onAlterado={avisar} />
        )
      ) : (
        <Historico />
      )}
    </MedicoLayout>
  )
}

function Proximos({ horarios, onAlterado }: { horarios: HorarioAgenda[]; onAlterado: (tom: 'success' | 'error', textos: string[]) => void }) {
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [agora] = useState(() => Date.now())
  const porDia = useMemo(() => {
    const grupos = new Map<string, HorarioAgenda[]>()
    for (const h of horarios.filter((x) => new Date(x.fim).getTime() >= agora)) {
      const dia = dataLocalIso(new Date(h.inicio))
      grupos.set(dia, [...(grupos.get(dia) ?? []), h])
    }
    return [...grupos.entries()]
  }, [horarios, agora])

  async function remover(h: HorarioAgenda) {
    setRemovendo(h.id)
    try {
      const r = await agendaService.remover(h.id)
      onAlterado('success', [r.mensagem])
    } catch (err) {
      onAlterado('error', mensagemDeErro(err))
    } finally {
      setRemovendo(null)
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-proximos">
      <h2 id="titulo-proximos" className="text-section font-semibold text-ink">
        Próximos 30 dias
      </h2>
      {!porDia.length ? (
        <EmptyState title="Nenhum horário publicado">Escolha uma data no calendário e publique um período de atendimento.</EmptyState>
      ) : (
        porDia.map(([dia, lista]) => (
          <div key={dia} className="flex flex-col gap-2">
            <h3 className="text-label font-semibold text-ink first-letter:uppercase">
              {new Date(`${dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
            </h3>
            <ul className="flex flex-col gap-2">
              {lista.map((h) => (
                <li key={h.id} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-body font-semibold text-ink">
                      {formatarHora(h.inicio)}–{formatarHora(h.fim)}
                    </p>
                    {h.consulta ? (
                      <p className="text-body text-ink">
                        {h.consulta.paciente.nome} · <span className={corSituacao(h.consulta.situacao)}>{SITUACOES_CONSULTA[h.consulta.situacao]}</span>
                      </p>
                    ) : (
                      <p className="text-body text-muted">Livre</p>
                    )}
                  </div>
                  {h.consulta ? (
                    <ButtonLink to={`/medico/atendimentos/${h.consulta.id}`}>Abrir atendimento</ButtonLink>
                  ) : (
                    <Button kind="secondary" loading={removendo === h.id} disabled={!!removendo} onClick={() => remover(h)}>
                      Remover<span className="sr-only"> horário das {formatarHora(h.inicio)}</span>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}

const TAMANHO = 10

function Historico() {
  const [pagina, setPagina] = useState(1)
  const lista = useAsync(() => atendimentoService.listar({ pagina, tamanhoPagina: TAMANHO }), [pagina])

  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-historico">
      <h2 id="titulo-historico" className="text-section font-semibold text-ink">
        Atendimentos concluídos e anteriores
      </h2>
      {lista.carregando ? (
        <Loading texto="Carregando histórico…" />
      ) : lista.erro || !lista.dados ? (
        <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar o histórico.']} onRetry={lista.recarregar} />
      ) : !lista.dados.itens.length ? (
        <EmptyState title="Nenhum atendimento ainda">As consultas marcadas pelos pacientes aparecem aqui.</EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {lista.dados.itens.map((c) => (
              <ConsultaCard key={c.id} consulta={c} />
            ))}
          </ul>
          <p className="text-small text-muted">
            Página {pagina} · {lista.dados.total} {lista.dados.total === 1 ? 'atendimento' : 'atendimentos'}
          </p>
          <Pagination pagina={pagina} total={lista.dados.total} tamanhoPagina={TAMANHO} onChange={setPagina} />
        </>
      )}
    </section>
  )
}

/** Card de consulta do Figma (832:9757): situação, paciente, data e ação. */
export function ConsultaCard({ consulta: c }: { consulta: ConsultaMedicoResumo }) {
  return (
    <li className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
      <p className={`text-small font-semibold uppercase ${corSituacao(c.situacao)}`}>{SITUACOES_CONSULTA[c.situacao]}</p>
      <h3 className="text-section font-semibold text-ink">{c.paciente.nome}</h3>
      <p className="text-body text-ink">{formatarHorario(c.inicio, c.fim)}</p>
      <ButtonLink to={`/medico/atendimentos/${c.id}`} kind={c.situacao === 'AGENDADA' ? 'primary' : 'secondary'} block className="mt-1">
        {c.situacao === 'AGENDADA' ? 'Abrir atendimento' : 'Consultar atendimento'}
        <span className="sr-only"> de {c.paciente.nome}</span>
      </ButtonLink>
    </li>
  )
}
