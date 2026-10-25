import { useState } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { ConsultaPaciente } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, Card, EmptyState, ErrorState, Loading, Message } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { consultasService } from '../../services/consultas'
import { corSituacao, formatarHorario, SITUACOES_CONSULTA } from '../medico/rotulos'
import { ConsultaResumo } from './ConsultaResumo'
import { DonorLayout } from './DonorLayout'
import { EscolhaDeHorario, type Escolha } from './EscolhaDeHorario'

// Figma: Web desktop / Paciente/Doador / Consultas (8:2449). UC10 – Cancelar ou Reagendar Consulta.
export function ConsultasPage() {
  const [versao, setVersao] = useState(0)
  const [aviso, setAviso] = useState('')
  const consultas = useAsync(() => consultasService.listar(), [versao])
  const atualizar = (mensagem: string) => {
    setAviso(mensagem)
    setVersao((v) => v + 1)
  }

  const agendada = consultas.dados?.find((c) => c.situacao === 'AGENDADA')
  const anteriores = consultas.dados?.filter((c) => c.situacao !== 'AGENDADA') ?? []

  return (
    <DonorLayout largura="wide">
      <PageTitle
        titulo="Consultas · Minhas consultas"
        descricao="Suas consultas aparecem aqui após a confirmação. Link da sala, cancelamento e reagendamento seguem as regras do serviço."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card kind="situation" title="Próxima consulta">
          {agendada ? `${formatarHorario(agendada.inicio, agendada.fim)} · ${agendada.medico.nome}` : 'Nenhuma consulta marcada.'}
        </Card>
        <Card title="Link da sala">O link fica visível para o paciente 15 minutos antes da consulta.</Card>
        <Card title="Cancelar ou reagendar">Até 24 horas antes do horário marcado.</Card>
      </div>

      {aviso && (
        <Message tone="success">
          <p>{aviso}</p>
        </Message>
      )}

      {consultas.carregando ? (
        <Loading texto="Carregando consultas…" />
      ) : consultas.erro || !consultas.dados ? (
        <ErrorState mensagens={consultas.erro ?? ['Não foi possível carregar suas consultas.']} onRetry={consultas.recarregar} />
      ) : (
        <>
          {agendada ? (
            <ProximaConsulta key={agendada.id} consulta={agendada} onAlterada={atualizar} />
          ) : (
            <EmptyState title="Nenhuma consulta agendada">
              Escolha um local para ver os horários dos médicos e agendar a teleconsulta.
            </EmptyState>
          )}
          {!agendada && (
            <ButtonLink to="/locais" block>
              Encontrar locais e agendar
            </ButtonLink>
          )}

          {anteriores.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="titulo-anteriores">
              <h2 id="titulo-anteriores" className="text-section font-semibold text-ink">
                Consultas anteriores
              </h2>
              <ul className="flex flex-col gap-3">
                {anteriores.map((c) => (
                  <ConsultaAnterior key={c.id} consulta={c} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <ButtonLink to="/doador" kind="secondary">
        Voltar ao painel
      </ButtonLink>
    </DonorLayout>
  )
}

type Modo = 'ver' | 'cancelar' | 'reagendar'

function ProximaConsulta({ consulta, onAlterada }: { consulta: ConsultaPaciente; onAlterada: (mensagem: string) => void }) {
  const [modo, setModo] = useState<Modo>('ver')
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  async function executar(acao: () => Promise<{ mensagem: string }>) {
    setEnviando(true)
    setFalha([])
    try {
      onAlterada((await acao()).mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
      setEnviando(false)
    }
  }

  return (
    <ConsultaResumo consulta={consulta}>
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      {consulta.podeCancelar && modo === 'ver' && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => setModo('reagendar')}>Reagendar</Button>
          <Button kind="secondary" onClick={() => setModo('cancelar')}>
            Cancelar consulta
          </Button>
        </div>
      )}
      {modo === 'cancelar' && (
        <Message tone="warning">
          <p>O horário será liberado e você poderá agendar outra consulta depois.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button kind="destructive" loading={enviando} onClick={() => executar(() => consultasService.cancelar(consulta.id))}>
              Confirmar cancelamento
            </Button>
            <Button kind="secondary" disabled={enviando} onClick={() => setModo('ver')}>
              Manter consulta
            </Button>
          </div>
        </Message>
      )}
      {modo === 'reagendar' && (
        <Reagendamento
          consulta={consulta}
          enviando={enviando}
          onEscolher={(escolha) => executar(() => consultasService.reagendar(consulta.id, escolha.id))}
          onVoltar={() => setModo('ver')}
        />
      )}
    </ConsultaResumo>
  )
}

// UC10 FA01: horários do mesmo médico ou de outros, em qualquer local.
function Reagendamento({
  consulta,
  enviando,
  onEscolher,
  onVoltar,
}: {
  consulta: ConsultaPaciente
  enviando: boolean
  onEscolher: (escolha: Escolha) => void
  onVoltar: () => void
}) {
  const horarios = useAsync(() => consultasService.horarios(), [])

  return (
    <section className="flex flex-col gap-3 border-t border-line pt-4" aria-labelledby="titulo-reagendar">
      <h3 id="titulo-reagendar" className="text-section font-semibold text-ink">
        Novo horário
      </h3>
      <p className="text-body text-muted">O aceite do termo de telessaúde continua valendo para o novo horário.</p>
      {horarios.carregando ? (
        <Loading texto="Carregando horários…" />
      ) : horarios.erro || !horarios.dados ? (
        <ErrorState mensagens={horarios.erro ?? ['Não foi possível carregar os horários.']} onRetry={horarios.recarregar} />
      ) : (
        <EscolhaDeHorario
          medicos={horarios.dados.medicos}
          mostrarLocal
          renderConfirmacao={(escolha) => (
            <div className="flex flex-col gap-3 rounded-card border border-line p-4">
              <p className="text-body text-ink">
                Trocar {formatarHorario(consulta.inicio, consulta.fim)} por{' '}
                <strong>{formatarHorario(escolha.inicio, escolha.fim)}</strong> com {escolha.medico.nome}?
              </p>
              <Button loading={enviando} onClick={() => onEscolher(escolha)}>
                Confirmar novo horário
              </Button>
            </div>
          )}
        />
      )}
      <Button kind="secondary" disabled={enviando} onClick={onVoltar}>
        Voltar
      </Button>
    </section>
  )
}

function ConsultaAnterior({ consulta: c }: { consulta: ConsultaPaciente }) {
  const motivo =
    c.situacao === 'CANCELADA' && c.motivoCancelamento && c.canceladaPor !== 'PACIENTE'
      ? `Cancelada ${c.canceladaPor === 'MEDICO' ? 'pelo médico' : 'pela instituição'}: ${c.motivoCancelamento}`
      : c.motivoReprovacao
        ? `Motivo informado pelo médico: ${c.motivoReprovacao}`
        : null
  return (
    <li className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
      <p className={`text-small font-semibold uppercase ${corSituacao(c.situacao)}`}>{SITUACOES_CONSULTA[c.situacao]}</p>
      <p className="text-body font-semibold text-ink">{formatarHorario(c.inicio, c.fim)}</p>
      <p className="text-body text-muted">
        {c.medico.nome} · {c.hospital.nome}
      </p>
      {motivo && <p className="text-body text-ink">{motivo}</p>}
      {c.solicitacaoExame && (
        <ButtonLink to="/doador/exames" kind="secondary" className="mt-1">
          Ver exames solicitados
        </ButtonLink>
      )}
    </li>
  )
}
