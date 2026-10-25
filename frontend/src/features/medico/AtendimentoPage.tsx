import { useState } from 'react'
import { useParams } from 'react-router-dom'
import type { ConsultaMedico } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { buttonClasses, ButtonLink, ErrorState, Loading, Message, Panel } from '../../components/ui'
import { formatarDataHora, SITUACOES_PACIENTE } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { atendimentoService } from '../../services/medico'
import { MedicoLayout } from './MedicoLayout'
import { RegistroAtendimento } from './RegistroAtendimento'
import { corSituacao, formatarHorario, SEXOS, SITUACOES_CONSULTA, SITUACOES_EXAME } from './rotulos'

// Figma: Web desktop / Médico / Atendimento (154:3704). UC14 passos 1–6.
export function AtendimentoPage() {
  const { id = '' } = useParams()
  const [versao, setVersao] = useState(0)
  const [aviso, setAviso] = useState('')
  const consulta = useAsync(() => atendimentoService.detalhar(id), [id, versao])

  return (
    <MedicoLayout>
      <ButtonLink to="/medico" kind="secondary" block>
        ← Voltar à agenda
      </ButtonLink>
      {consulta.carregando ? (
        <Loading texto="Carregando atendimento…" />
      ) : consulta.erro || !consulta.dados ? (
        <ErrorState mensagens={consulta.erro ?? ['Não foi possível carregar o atendimento.']} onRetry={consulta.recarregar} />
      ) : (
        <Detalhe
          consulta={consulta.dados}
          aviso={aviso}
          onRegistrado={(m) => {
            setAviso(m)
            setVersao((v) => v + 1)
          }}
        />
      )}
    </MedicoLayout>
  )
}

function Detalhe({ consulta: c, aviso, onRegistrado }: { consulta: ConsultaMedico; aviso: string; onRegistrado: (m: string) => void }) {
  const [iniciada] = useState(() => new Date(c.inicio).getTime() <= Date.now())
  const agendada = c.situacao === 'AGENDADA'
  const p = c.paciente

  return (
    <>
      <PageTitle
        titulo={`Atendimento · ${p.nome}`}
        descricao={`Teleconsulta de ${formatarHorario(c.inicio, c.fim)}. Dados clínicos restritos ao atendimento.`}
      />
      {aviso && (
        <Message tone="success">
          <p>{aviso}</p>
        </Message>
      )}

      <div className="grid items-start gap-4 md:grid-cols-3">
        <Panel>
          <h2 className="text-section font-semibold text-ink">Paciente</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-small">
            <dt className="text-muted">Nome</dt>
            <dd className="text-ink">{p.nome}</dd>
            <dt className="text-muted">Idade</dt>
            <dd className="text-ink">{p.idade} anos</dd>
            <dt className="text-muted">Sexo</dt>
            <dd className="text-ink">{SEXOS[p.sexo]}</dd>
            <dt className="text-muted">Peso</dt>
            <dd className="text-ink">{p.pesoKg.toLocaleString('pt-BR')} kg</dd>
            <dt className="text-muted">Cidade</dt>
            <dd className="text-ink">
              {p.cidade}/{p.estado}
            </dd>
            <dt className="text-muted">Situação</dt>
            <dd className="text-ink">{SITUACOES_PACIENTE[p.situacao]}</dd>
          </dl>
        </Panel>

        <Panel>
          <h2 className="text-section font-semibold text-ink">Teleconsulta</h2>
          <p className="text-body text-muted">{formatarHorario(c.inicio, c.fim)}</p>
          {agendada ? (
            <>
              <a href={c.linkSala} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary', true)}>
                Entrar na sala<span className="sr-only"> (abre em nova aba)</span>
              </a>
              <p className="text-small text-muted">O paciente vê o link a partir de 15 minutos antes. A plataforma não grava a videochamada.</p>
            </>
          ) : (
            <p className="text-small text-muted">A sala não é mais exibida porque o atendimento foi encerrado.</p>
          )}
        </Panel>

        <Panel>
          <h2 className="text-section font-semibold text-ink">Situação</h2>
          <p className={`text-small font-semibold uppercase ${corSituacao(c.situacao)}`}>{SITUACOES_CONSULTA[c.situacao]}</p>
          {c.encerradaEm && <p className="text-small text-muted">Registrada em {formatarDataHora(c.encerradaEm)}.</p>}
          {c.motivoCancelamento && (
            <p className="text-body text-ink">
              Motivo{c.canceladaPor === 'PACIENTE' ? ' (paciente)' : ''}: {c.motivoCancelamento}
            </p>
          )}
          {c.motivoReprovacao && <p className="text-body text-ink">Paciente inapto: {c.motivoReprovacao}</p>}
          {c.observacoes && <p className="whitespace-pre-line text-body text-ink">Observações: {c.observacoes}</p>}
        </Panel>
      </div>

      {agendada && (
        <Panel>
          <RegistroAtendimento consulta={c} iniciada={iniciada} onRegistrado={onRegistrado} />
        </Panel>
      )}

      {c.solicitacaoExame && (
        <Panel>
          <h2 className="text-section font-semibold text-ink">Solicitação de exames</h2>
          <p className={`text-small font-semibold uppercase ${corSituacao(c.solicitacaoExame.situacao)}`}>
            {SITUACOES_EXAME[c.solicitacaoExame.situacao]}
          </p>
          <ul className="list-disc pl-5 text-body text-ink">
            {c.solicitacaoExame.exames.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {c.solicitacaoExame.orientacoes && <p className="text-body text-muted">Orientações: {c.solicitacaoExame.orientacoes}</p>}
          <ButtonLink to={`/medico/exames/${c.solicitacaoExame.id}`} kind="secondary">
            Acompanhar exames
          </ButtonLink>
        </Panel>
      )}
    </>
  )
}
