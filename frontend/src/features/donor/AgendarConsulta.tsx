import { useMemo, useState } from 'react'
import { ApiError, mensagemDeErro } from '../../api/client'
import type { ConsultaPaciente, MedicoComHorarios } from '../../api/types'
import { Button, buttonClasses, ButtonLink, Consent, EmptyState, ErrorState, Loading, Message, Panel } from '../../components/ui'
import { formatarDataHora } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { consultasService } from '../../services/consultas'
import { useAuth } from '../auth/authState'
import { dataLocalIso, formatarHora, formatarHorario } from '../medico/rotulos'

type Props = { hospitalId: string; hospitalNome: string }

/**
 * UC09 – Agendar Consulta a partir da tela do local: horários livres dos médicos deste
 * banco de sangue nos próximos 30 dias. A consulta é on-line (RN18).
 */
export function AgendarConsulta({ hospitalId, hospitalNome }: Props) {
  const { usuario } = useAuth()

  return (
    <Panel>
      <div className="flex flex-col gap-1">
        <h2 className="text-section font-semibold text-ink">Agendar teleconsulta</h2>
        <p className="text-body text-muted">
          A avaliação para doação é feita on-line, por videochamada, com um médico de {hospitalNome}.
        </p>
      </div>
      {!usuario ? (
        <>
          <p className="text-body text-ink">Entre na sua conta de paciente para ver os horários disponíveis e agendar.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/entrar" state={{ de: `/locais/${hospitalId}` }}>
              Entrar para agendar
            </ButtonLink>
            <ButtonLink to="/cadastro" kind="secondary">
              Fazer pré-cadastro
            </ButtonLink>
          </div>
        </>
      ) : usuario.papel === 'DOADOR' ? (
        <Message tone="info">
          <p>Seu cadastro já foi aprovado como doador. Não é preciso agendar consulta: procure o local para doar.</p>
        </Message>
      ) : usuario.perfil !== 'PACIENTE' ? (
        <p className="text-body text-muted">O agendamento é feito pela conta do paciente.</p>
      ) : (
        <AgendamentoPaciente hospitalId={hospitalId} />
      )}
    </Panel>
  )
}

function AgendamentoPaciente({ hospitalId }: { hospitalId: string }) {
  const [versao, setVersao] = useState(0)
  const [aviso, setAviso] = useState('')
  const dados = useAsync(
    () => Promise.all([consultasService.listar(), consultasService.horarios({ hospitalId })]),
    [hospitalId, versao],
  )

  if (dados.carregando) return <Loading texto="Carregando horários…" />
  if (dados.erro || !dados.dados) {
    return <ErrorState mensagens={dados.erro ?? ['Não foi possível carregar os horários.']} onRetry={dados.recarregar} />
  }
  const [consultas, { medicos }] = dados.dados
  const agendada = consultas.find((c) => c.situacao === 'AGENDADA')

  return (
    <>
      {aviso && (
        <Message tone="success">
          <p>{aviso}</p>
        </Message>
      )}
      {agendada ? (
        <ConsultaAgendada consulta={agendada} />
      ) : (
        <EscolhaDeHorario
          medicos={medicos}
          onAgendado={(m) => {
            setAviso(m)
            setVersao((v) => v + 1)
          }}
          onHorarioOcupado={() => setVersao((v) => v + 1)}
        />
      )}
    </>
  )
}

/** RN18: o paciente pode ter só uma consulta futura; o link aparece 15 minutos antes. */
function ConsultaAgendada({ consulta: c }: { consulta: ConsultaPaciente }) {
  return (
    <section className="flex flex-col gap-2 rounded-card border border-line p-4" aria-labelledby="titulo-agendada">
      <p className="text-small font-semibold uppercase text-brand">Consulta agendada</p>
      <h3 id="titulo-agendada" className="text-section font-semibold text-ink">
        {formatarHorario(c.inicio, c.fim)}
      </h3>
      <p className="text-body text-ink">
        {c.medico.nome} · CRM {c.medico.crm}/{c.medico.ufCrm}
      </p>
      <p className="text-body text-muted">
        {c.hospital.nome} · {c.hospital.cidade}/{c.hospital.estado}
      </p>
      {c.linkSala ? (
        <a href={c.linkSala} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary')}>
          Entrar na sala<span className="sr-only"> (abre em nova aba)</span>
        </a>
      ) : (
        <p className="text-body text-ink">O link da sala aparece aqui em {formatarDataHora(c.linkDisponivelEm)}.</p>
      )}
      <p className="text-small text-muted">
        {c.podeCancelar
          ? 'Você pode cancelar ou reagendar até 24 horas antes do horário.'
          : 'Faltam menos de 24 horas: a consulta não pode mais ser cancelada pela plataforma.'}
      </p>
    </section>
  )
}

type Escolha = { id: string; inicio: string; fim: string; medico: MedicoComHorarios }

function EscolhaDeHorario({
  medicos,
  onAgendado,
  onHorarioOcupado,
}: {
  medicos: MedicoComHorarios[]
  onAgendado: (mensagem: string) => void
  onHorarioOcupado: () => void
}) {
  const porDia = useMemo(() => {
    const dias = new Map<string, Escolha[]>()
    for (const medico of medicos) {
      for (const h of medico.horarios) {
        const dia = dataLocalIso(new Date(h.inicio))
        dias.set(dia, [...(dias.get(dia) ?? []), { ...h, medico }])
      }
    }
    return [...dias.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, lista]) => [dia, lista.sort((a, b) => a.inicio.localeCompare(b.inicio))] as const)
  }, [medicos])

  const [dia, setDia] = useState<string | null>(null)
  const [escolha, setEscolha] = useState<Escolha | null>(null)
  const diaAtivo = dia ?? porDia[0]?.[0] ?? null

  // FE01
  if (!porDia.length) {
    return (
      <EmptyState title="Nenhum horário disponível">
        Este local não tem horários livres nos próximos 30 dias. Tente outro local ou volte mais tarde.
      </EmptyState>
    )
  }

  const rotuloDia = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label font-semibold text-ink">1. Escolha o dia</legend>
        <div className="flex flex-wrap gap-2">
          {porDia.map(([iso, lista]) => (
            <button
              key={iso}
              type="button"
              aria-pressed={iso === diaAtivo}
              onClick={() => {
                setDia(iso)
                setEscolha(null)
              }}
              className={`rounded-pill border px-4 py-2 text-small font-semibold transition-colors ${
                iso === diaAtivo ? 'border-brand bg-brand text-surface' : 'border-input bg-surface text-ink hover:bg-background'
              }`}
            >
              {rotuloDia(iso)}
              <span className="sr-only">, {lista.length} {lista.length === 1 ? 'horário' : 'horários'}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label font-semibold text-ink">2. Escolha o horário</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {porDia
            .find(([iso]) => iso === diaAtivo)?.[1]
            .map((h) => (
              <button
                key={h.id}
                type="button"
                aria-pressed={escolha?.id === h.id}
                onClick={() => setEscolha(h)}
                className={`flex flex-col items-start rounded-control border p-3 text-left transition-colors ${
                  escolha?.id === h.id ? 'border-2 border-brand bg-surface' : 'border-input bg-surface hover:bg-background'
                }`}
              >
                <span className="text-body font-semibold text-ink">
                  {formatarHora(h.inicio)}–{formatarHora(h.fim)}
                </span>
                <span className="text-small text-muted">{h.medico.nome}</span>
              </button>
            ))}
        </div>
      </fieldset>

      {escolha && <Confirmacao key={escolha.id} escolha={escolha} onAgendado={onAgendado} onHorarioOcupado={onHorarioOcupado} />}
    </div>
  )
}

// Passos 7–9: termo de telessaúde e confirmação.
function Confirmacao({
  escolha,
  onAgendado,
  onHorarioOcupado,
}: {
  escolha: Escolha
  onAgendado: (mensagem: string) => void
  onHorarioOcupado: () => void
}) {
  const termo = useAsync(() => consultasService.termoTelessaude(), [])
  const [aceite, setAceite] = useState(false)
  const [erroAceite, setErroAceite] = useState('')
  const [falha, setFalha] = useState<string[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function confirmar() {
    // FE04
    if (!aceite) {
      setErroAceite('O aceite do termo é obrigatório para o atendimento on-line.')
      return
    }
    if (!termo.dados) return
    setEnviando(true)
    setFalha([])
    try {
      const r = await consultasService.agendar(escolha.id, termo.dados.versao)
      onAgendado(r.mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
      // FE02: o horário foi reservado por outra pessoa enquanto o paciente decidia.
      setOcupado(err instanceof ApiError && err.status === 409)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line p-4" aria-labelledby="titulo-confirmar">
      <h3 id="titulo-confirmar" className="text-label font-semibold text-ink">
        3. Confirme o agendamento
      </h3>
      <p className="text-body text-ink">
        {formatarHorario(escolha.inicio, escolha.fim)} · {escolha.medico.nome} (CRM {escolha.medico.crm}/{escolha.medico.ufCrm})
      </p>
      {termo.carregando ? (
        <Loading texto="Carregando termo…" />
      ) : termo.erro || !termo.dados ? (
        <ErrorState mensagens={termo.erro ?? ['Não foi possível carregar o termo.']} onRetry={termo.recarregar} />
      ) : (
        <>
          <div className="flex flex-col gap-1 rounded-control bg-background p-3">
            <p className="text-small font-semibold text-ink">
              {termo.dados.titulo} (versão {termo.dados.versao})
            </p>
            <p className="text-small text-muted">{termo.dados.texto}</p>
          </div>
          <Consent
            checked={aceite}
            onChange={(e) => {
              setAceite(e.target.checked)
              setErroAceite('')
            }}
            error={erroAceite}
            disabled={enviando}
          >
            Li e aceito o termo de consentimento para atendimento por telessaúde.
          </Consent>
        </>
      )}
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      {ocupado ? (
        <Button kind="secondary" onClick={onHorarioOcupado}>
          Ver horários atualizados
        </Button>
      ) : (
        <Button loading={enviando} disabled={!termo.dados} onClick={confirmar}>
          Confirmar agendamento
        </Button>
      )}
    </section>
  )
}
