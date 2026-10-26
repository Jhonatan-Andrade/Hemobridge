import { useState } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { DoacaoPaciente, Painel, ProximoAgendamento } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, Card, EmptyState, ErrorState, Loading, Message, Panel, PatientBadge, ReadOnlyField } from '../../components/ui'
import { formatarData, formatarDiaLongo, mascaraTelefone, RESULTADOS_DOACAO } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { agendamentosService, pacienteService } from '../../services/paciente'
import { ExclusaoDados } from './ExclusaoDados'
import { PacienteLayout } from './PacienteLayout'

// RF04 – Painel do paciente: dados, status da conta, tipo sanguíneo, próximos agendamentos e
// histórico de doações com o hemocentro de origem. Figma: Paciente/Doador / Meu painel (8:1858).
export function PainelPage() {
  const [versao, setVersao] = useState(0)
  const [aviso, setAviso] = useState('')
  const painel = useAsync(() => pacienteService.painel(), [versao])
  const p = painel.dados

  return (
    <PacienteLayout largura="page">
      {painel.carregando ? (
        <Loading texto="Carregando seu painel…" />
      ) : painel.erro || !p ? (
        <ErrorState mensagens={painel.erro ?? ['Não foi possível carregar seu painel.']} onRetry={painel.recarregar} />
      ) : (
        <>
          <PageTitle titulo={`Olá, ${p.nome.split(' ')[0]}`} descricao="Seus dados, seus agendamentos e o histórico das suas doações." />
          <PatientBadge situacao={p.situacao} />
          {aviso && (
            <Message tone="success">
              <p>{aviso}</p>
            </Message>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card kind="situation" title="Status da conta">
              {p.situacao === 'ATIVA'
                ? `Conta ativa desde ${formatarData(p.ativadoEm)}. Você é doador: seu tipo sanguíneo foi registrado pelo hemocentro.`
                : 'Conta pendente. Ela é ativada pelo hemocentro depois que a sua primeira doação for registrada.'}
            </Card>
            <Card title="Próximo passo">
              {p.proximosAgendamentos.length
                ? 'Compareça ao hemocentro no horário agendado com um documento com foto.'
                : 'Escolha um hemocentro em Doar e agende um horário com vaga.'}
            </Card>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              <ProximosAgendamentos
                agendamentos={p.proximosAgendamentos}
                onAlterado={(mensagem) => {
                  setAviso(mensagem)
                  setVersao((v) => v + 1)
                }}
              />
              <HistoricoDoacoes doacoes={p.doacoes} />
            </div>
            <div className="flex flex-col gap-5">
              <DadosPessoais painel={p} />
              <ExclusaoDados />
            </div>
          </div>
        </>
      )}
    </PacienteLayout>
  )
}

function DadosPessoais({ painel: p }: { painel: Painel }) {
  const linhas: [string, string][] = [
    ['Nome', p.nome],
    ['E-mail', p.email],
    ['CPF', p.cpf ?? '—'],
    ['Telefone', p.telefone ? mascaraTelefone(p.telefone) : '—'],
    ['Nascimento', p.dataNascimento ? p.dataNascimento.split('-').reverse().join('/') : '—'],
    ['Conta criada em', formatarData(p.cadastradoEm)],
  ]
  return (
    <Panel>
      <h2 className="text-section font-semibold text-ink">Seus dados</h2>
      <ReadOnlyField
        label="Tipo sanguíneo"
        value={p.tipoSanguineo ?? 'Ainda não disponível'}
        hint="Registrado pelo hemocentro na ativação da conta. Somente leitura."
      />
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-small">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="contents">
            <dt className="text-muted">{rotulo}</dt>
            <dd className="break-words text-ink">{valor}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}

function ProximosAgendamentos({ agendamentos, onAlterado }: { agendamentos: ProximoAgendamento[]; onAlterado: (m: string) => void }) {
  return (
    <section aria-labelledby="proximos" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="proximos" className="text-section font-semibold text-ink">
          Próximos agendamentos
        </h2>
        <ButtonLink to="/doar" kind="secondary">
          Agendar doação
        </ButtonLink>
      </div>
      {agendamentos.length ? (
        <ul className="flex flex-col gap-3">
          {agendamentos.map((a) => (
            <AgendamentoItem key={a.id} agendamento={a} onAlterado={onAlterado} />
          ))}
        </ul>
      ) : (
        <EmptyState title="Nenhum agendamento">Escolha um hemocentro em Doar para ver os horários com vaga.</EmptyState>
      )}
    </section>
  )
}

function AgendamentoItem({ agendamento: a, onAlterado }: { agendamento: ProximoAgendamento; onAlterado: (m: string) => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string[]>([])

  async function cancelar() {
    setEnviando(true)
    setFalha([])
    try {
      onAlterado((await agendamentosService.cancelar(a.id)).mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
      setEnviando(false)
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
      <p className="text-small font-semibold uppercase text-brand">Agendado</p>
      <h3 className="text-section font-semibold text-ink first-letter:uppercase">
        {formatarDiaLongo(a.horario.data)} · {a.horario.horaInicio}–{a.horario.horaFim}
      </h3>
      <p className="text-body text-muted">
        {a.hemocentro.nome} · {a.hemocentro.endereco}, {a.hemocentro.cidade}/{a.hemocentro.estado}
      </p>
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      {a.podeCancelar &&
        (confirmando ? (
          <Message tone="warning">
            <p>A vaga será liberada para outra pessoa.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button kind="destructive" loading={enviando} onClick={cancelar}>
                Confirmar cancelamento
              </Button>
              <Button kind="secondary" disabled={enviando} onClick={() => setConfirmando(false)}>
                Manter agendamento
              </Button>
            </div>
          </Message>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink to={`/doar/${a.hemocentro.id}?reagendar=${a.id}`} kind="secondary">
              Reagendar
            </ButtonLink>
            <Button kind="secondary" onClick={() => setConfirmando(true)}>
              Cancelar agendamento
            </Button>
          </div>
        ))}
    </li>
  )
}

const corResultado: Record<DoacaoPaciente['resultado'], string> = {
  DOOU: 'text-success',
  NAO_DOOU: 'text-warning',
  AUSENTE: 'text-muted',
}

function HistoricoDoacoes({ doacoes }: { doacoes: DoacaoPaciente[] }) {
  return (
    <section aria-labelledby="historico" className="flex flex-col gap-3">
      <h2 id="historico" className="text-section font-semibold text-ink">
        Histórico de doações
      </h2>
      {doacoes.length ? (
        <ul className="flex flex-col gap-3">
          {doacoes.map((d) => (
            <li key={d.id} className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
              <p className={`text-small font-semibold uppercase ${corResultado[d.resultado]}`}>{RESULTADOS_DOACAO[d.resultado]}</p>
              <p className="text-body font-semibold text-ink">{formatarData(d.registradoEm)}</p>
              <p className="text-body text-muted">
                {d.hemocentro.nome} · {d.hemocentro.cidade}/{d.hemocentro.estado}
              </p>
              {d.motivoNaoDoacao && <p className="text-body text-ink">Motivo: {d.motivoNaoDoacao}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nenhuma doação registrada">As doações aparecem aqui depois que o hemocentro registra o atendimento.</EmptyState>
      )}
    </section>
  )
}
