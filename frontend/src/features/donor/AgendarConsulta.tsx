import { useState } from 'react'
import { ApiError, mensagemDeErro } from '../../api/client'
import { Button, ButtonLink, Consent, ErrorState, Loading, Message, Panel } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { consultasService } from '../../services/consultas'
import { useAuth } from '../auth/authState'
import { formatarHorario } from '../medico/rotulos'
import { ConsultaResumo } from './ConsultaResumo'
import { EscolhaDeHorario, type Escolha } from './EscolhaDeHorario'

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
  const recarregar = () => setVersao((v) => v + 1)

  return (
    <>
      {aviso && (
        <Message tone="success">
          <p>{aviso}</p>
        </Message>
      )}
      {agendada ? (
        <ConsultaResumo consulta={agendada}>
          <ButtonLink to="/doador/consultas" kind="secondary">
            Gerenciar consulta
          </ButtonLink>
        </ConsultaResumo>
      ) : (
        <EscolhaDeHorario
          medicos={medicos}
          renderConfirmacao={(escolha) => (
            <ConfirmacaoAgendamento
              escolha={escolha}
              onAgendado={(m) => {
                setAviso(m)
                recarregar()
              }}
              onHorarioOcupado={recarregar}
            />
          )}
        />
      )}
    </>
  )
}

// Passos 7–9: termo de telessaúde e confirmação.
function ConfirmacaoAgendamento({
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
