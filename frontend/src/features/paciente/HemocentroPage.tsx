import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ApiError, mensagemDeErro } from '../../api/client'
import type { HorarioDisponivel } from '../../api/types'
import { NeedsTable } from '../../components/NeedsTable'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, ErrorState, Loading, Message, Panel } from '../../components/ui'
import { formatarDataHora, formatarDiaLongo, mascaraCep, mascaraTelefone } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { hemocentrosService } from '../../services/hemocentros'
import { agendamentosService, pacienteService } from '../../services/paciente'
import { useAuth } from '../auth/authState'
import { EscolhaDeHorario } from './EscolhaDeHorario'
import { LayoutDoar } from './PacienteLayout'

// RF05 / RF06 / RF07 – hemocentro escolhido: necessidades, horários com vagas e confirmação.
// Com ?reagendar=<id>, a confirmação troca o horário de um agendamento existente.
export function HemocentroPage() {
  const { id = '' } = useParams()
  const reagendar = useSearchParams()[0].get('reagendar')
  const { usuario } = useAuth()
  const paciente = usuario?.perfil === 'PACIENTE'
  const hemocentro = useAsync(() => hemocentrosService.detalhar(id), [id])
  const painel = useAsync(() => (paciente ? pacienteService.painel() : Promise.resolve(null)), [paciente])
  const h = hemocentro.dados

  return (
    <LayoutDoar>
      {hemocentro.carregando ? (
        <Loading texto="Carregando o hemocentro…" />
      ) : hemocentro.erro || !h ? (
        <ErrorState mensagens={hemocentro.erro ?? ['Hemocentro não encontrado.']} onRetry={hemocentro.recarregar} />
      ) : (
        <>
          <PageTitle sobretitulo="Doar" titulo={h.nome} descricao={`${h.cidade}/${h.estado}`} />
          <div className="grid items-start gap-5 lg:grid-cols-3">
            <Panel>
              <h2 className="text-section font-semibold text-ink">Atendimento</h2>
              <dl className="flex flex-col gap-3 text-body">
                <div>
                  <dt className="text-label font-medium text-ink">Endereço</dt>
                  <dd className="text-muted">
                    {h.endereco}, {h.cidade}/{h.estado} · CEP {mascaraCep(h.cep)}
                  </dd>
                </div>
                {h.telefone && (
                  <div>
                    <dt className="text-label font-medium text-ink">Contato</dt>
                    <dd>
                      <a href={`tel:+55${h.telefone}`} className="text-brand hover:underline">
                        {mascaraTelefone(h.telefone)}
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-label font-medium text-ink">Funcionamento</dt>
                  <dd className="text-muted">{h.horarioFuncionamento ?? 'Não informado.'}</dd>
                </div>
              </dl>
            </Panel>
            <Panel className="lg:col-span-2">
              <div className="flex flex-col gap-1">
                <h2 className="text-section font-semibold text-ink">Necessidades por tipo sanguíneo</h2>
                <p className="text-small text-muted">Última atualização: {formatarDataHora(h.ultimaAtualizacao)}</p>
              </div>
              <NeedsTable necessidades={h.necessidades} legenda={`Necessidades de ${h.nome}`} destaque={painel.dados?.tipoSanguineo} />
            </Panel>
          </div>

          <Panel>
            <div className="flex flex-col gap-1">
              <h2 className="text-section font-semibold text-ink">{reagendar ? 'Escolha o novo horário' : 'Agendar doação'}</h2>
              <p className="text-body text-muted">Horários dos próximos 30 dias, com as vagas que ainda restam em cada um.</p>
            </div>
            {!usuario ? (
              <>
                <p className="text-body text-ink">Entre na sua conta para agendar. Os horários aparecem logo abaixo.</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink to="/entrar" state={{ de: `/doar/${h.id}` }}>
                    Entrar para agendar
                  </ButtonLink>
                  <ButtonLink to="/cadastro" kind="secondary">
                    Criar conta
                  </ButtonLink>
                </div>
                <Horarios hemocentroId={h.id} />
              </>
            ) : !paciente ? (
              <p className="text-body text-muted">O agendamento é feito pela conta do paciente.</p>
            ) : (
              <Horarios hemocentroId={h.id} reagendar={reagendar} podeAgendar />
            )}
          </Panel>

          <ButtonLink to="/doar" kind="secondary">
            Voltar aos hemocentros
          </ButtonLink>
        </>
      )}
    </LayoutDoar>
  )
}

function Horarios({ hemocentroId, reagendar, podeAgendar }: { hemocentroId: string; reagendar?: string | null; podeAgendar?: boolean }) {
  const [versao, setVersao] = useState(0)
  const [aviso, setAviso] = useState('')
  const horarios = useAsync(() => hemocentrosService.horarios(hemocentroId), [hemocentroId, versao])

  if (horarios.carregando) return <Loading texto="Carregando horários…" />
  if (horarios.erro || !horarios.dados) {
    return <ErrorState mensagens={horarios.erro ?? ['Não foi possível carregar os horários.']} onRetry={horarios.recarregar} />
  }

  return (
    <>
      {aviso && (
        <Message tone="success">
          <p>{aviso}</p>
          <ButtonLink to="/painel" kind="secondary">
            Ver no meu painel
          </ButtonLink>
        </Message>
      )}
      <EscolhaDeHorario
        horarios={horarios.dados.horarios}
        renderConfirmacao={(horario) =>
          podeAgendar && !aviso ? (
            <Confirmacao
              horario={horario}
              reagendar={reagendar}
              onConcluido={(m) => {
                setAviso(m)
                setVersao((v) => v + 1)
              }}
              onEsgotado={() => setVersao((v) => v + 1)}
            />
          ) : null
        }
      />
    </>
  )
}

function Confirmacao({
  horario,
  reagendar,
  onConcluido,
  onEsgotado,
}: {
  horario: HorarioDisponivel
  reagendar?: string | null
  onConcluido: (mensagem: string) => void
  onEsgotado: () => void
}) {
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string[]>([])
  const [conflito, setConflito] = useState(false)

  async function confirmar() {
    setEnviando(true)
    setFalha([])
    try {
      const r = reagendar ? await agendamentosService.reagendar(reagendar, horario.id) : await agendamentosService.agendar(horario.id)
      onConcluido(r.mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
      // Outra pessoa pode ter ocupado a última vaga enquanto o paciente decidia.
      setConflito(err instanceof ApiError && err.status === 409)
      setEnviando(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-line p-4" aria-labelledby="titulo-confirmar">
      <h3 id="titulo-confirmar" className="text-label font-semibold text-ink">
        3. Confirme {reagendar ? 'o novo horário' : 'o agendamento'}
      </h3>
      <p className="text-body text-ink first-letter:uppercase">
        {formatarDiaLongo(horario.data)} · {horario.horaInicio}–{horario.horaFim}
      </p>
      <p className="text-small text-muted">Leve um documento oficial com foto. Você pode cancelar pelo painel até o início do horário.</p>
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      {conflito ? (
        <Button kind="secondary" onClick={onEsgotado}>
          Ver horários atualizados
        </Button>
      ) : (
        <Button loading={enviando} onClick={confirmar}>
          {reagendar ? 'Confirmar novo horário' : 'Confirmar agendamento'}
        </Button>
      )}
    </section>
  )
}
