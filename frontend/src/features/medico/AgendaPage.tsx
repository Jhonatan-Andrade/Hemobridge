import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AgendamentoNaAgenda } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, EmptyState, ErrorState, Loading, Message, Panel, TextField } from '../../components/ui'
import { dataLocalIso, formatarAptidao, formatarData, formatarDiaLongo, RESULTADOS_DOACAO, SITUACOES_PACIENTE, somarDias, STATUS_AGENDAMENTO } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { medicoService } from '../../services/equipe'
import { MedicoLayout } from './MedicoLayout'
import { RegistroDoacao } from './RegistroDoacao'

// RF10 / RF11 – agenda do dia por horário, com o registro da doação de cada paciente.
// Figma: Web desktop / Médico / Agenda (101:3115), sem teleconsulta.
export function AgendaPage() {
  const hoje = dataLocalIso()
  const [data, setData] = useState(hoje)
  const [versao, setVersao] = useState(0)
  const [aviso, setAviso] = useState('')
  const agenda = useAsync(() => medicoService.agenda(data), [data, versao])

  const mudarData = (nova: string) => {
    if (!nova) return
    setData(nova)
    setAviso('')
  }

  return (
    <MedicoLayout>
      <PageTitle titulo="Agenda do dia" descricao="Pacientes agendados por horário. Depois do atendimento, registre se a pessoa compareceu e doou." />

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField label="Data" type="date" value={data} onChange={(e) => mudarData(e.target.value)} containerClassName="sm:w-60" />
          <div className="flex gap-2 pb-1">
            <Button kind="secondary" onClick={() => mudarData(somarDias(data, -1))}>
              Dia anterior
            </Button>
            <Button kind="secondary" onClick={() => mudarData(hoje)} disabled={data === hoje}>
              Hoje
            </Button>
            <Button kind="secondary" onClick={() => mudarData(somarDias(data, 1))}>
              Próximo dia
            </Button>
          </div>
        </div>
        <p className="text-body font-semibold text-ink first-letter:uppercase">{formatarDiaLongo(data)}</p>
      </Panel>

      {aviso && (
        <Message tone="success">
          <p>{aviso}</p>
        </Message>
      )}

      {agenda.carregando ? (
        <Loading texto="Carregando a agenda…" />
      ) : agenda.erro || !agenda.dados ? (
        <ErrorState mensagens={agenda.erro ?? ['Não foi possível carregar a agenda.']} onRetry={agenda.recarregar} />
      ) : !agenda.dados.horarios.length ? (
        <EmptyState title="Nenhum horário neste dia">O Admin do hemocentro cria os horários de atendimento.</EmptyState>
      ) : (
        agenda.dados.horarios.map((h) => (
          <Panel key={h.id}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h2 className="text-section font-semibold text-ink">
                {h.horaInicio}–{h.horaFim}
                {!h.ativo && <span className="ml-2 text-small font-medium text-muted">(inativo)</span>}
              </h2>
              <p className="text-small text-muted">
                {h.agendamentos.length} de {h.vagasTotal} vagas ocupadas
              </p>
            </div>
            {h.agendamentos.length ? (
              <ul className="flex flex-col gap-3">
                {h.agendamentos.map((a) => (
                  <PacienteAgendado
                    key={a.id}
                    agendamento={a}
                    podeRegistrar={data <= hoje}
                    dataAtendimento={data}
                    onRegistrado={(m) => {
                      setAviso(m)
                      setVersao((v) => v + 1)
                    }}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-body text-muted">Nenhum paciente agendado.</p>
            )}
          </Panel>
        ))
      )}
    </MedicoLayout>
  )
}

function PacienteAgendado({
  agendamento: a,
  podeRegistrar,
  dataAtendimento,
  onRegistrado,
}: {
  agendamento: AgendamentoNaAgenda
  podeRegistrar: boolean
  dataAtendimento: string
  onRegistrado: (m: string) => void
}) {
  const [registrando, setRegistrando] = useState(false)
  const p = a.paciente

  return (
    <li className="flex flex-col gap-2 rounded-card border border-line bg-background p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-body font-semibold text-ink">{p.nome}</h3>
          <p className="text-small text-muted">
            {p.idade !== null && `${p.idade} anos · `}Conta {SITUACOES_PACIENTE[p.situacao].toLowerCase()}
            {p.tipoSanguineo && ` · ${p.tipoSanguineo}`}
          </p>
          <p className="text-small text-muted">
            Última doação:{' '}
            {p.ultimaDoacao ? `${formatarData(p.ultimaDoacao.registradoEm)} · ${p.ultimaDoacao.hemocentro.nome}` : 'nenhuma registrada'}
          </p>
        </div>
        <p className={`text-small font-semibold uppercase ${a.status === 'AGENDADO' ? 'text-brand' : 'text-success'}`}>
          {STATUS_AGENDAMENTO[a.status]}
        </p>
      </div>

      {a.doacao && (
        <p className="text-body text-ink">
          Registro: {RESULTADOS_DOACAO[!a.doacao.compareceu ? 'AUSENTE' : a.doacao.doou ? 'DOOU' : 'NAO_DOOU']}
          {a.doacao.tipoSanguineo && ` · ${a.doacao.tipoSanguineo}`}
          {a.doacao.motivoNaoDoacao && ` · ${a.doacao.motivoNaoDoacao}`}
          {a.doacao.aptidao && ` · ${formatarAptidao(a.doacao.aptidao, a.doacao.aptoAPartirDe)}`}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link to={`/medico/pacientes/${p.id}`} className="self-start rounded text-small font-semibold text-brand hover:underline">
          Ver histórico de doações<span className="sr-only"> de {p.nome}</span>
        </Link>
        {a.doacao?.compareceu && (
          <Link to={`/medico/doacoes/${a.doacao.id}`} className="self-start rounded text-small font-semibold text-brand hover:underline">
            Triagem e exames<span className="sr-only"> de {p.nome}</span>
          </Link>
        )}
      </div>

      {a.status === 'AGENDADO' &&
        (!podeRegistrar ? (
          <p className="text-small text-muted">O registro fica disponível a partir do dia do agendamento.</p>
        ) : registrando ? (
          <RegistroDoacao agendamentoId={a.id} dataAtendimento={dataAtendimento} onRegistrado={onRegistrado} onCancelar={() => setRegistrando(false)} />
        ) : (
          <Button onClick={() => setRegistrando(true)}>Registrar atendimento</Button>
        ))}
    </li>
  )
}
