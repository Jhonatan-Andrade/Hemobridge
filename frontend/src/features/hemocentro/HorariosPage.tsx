import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { HorarioGestao } from '../../api/types'
import { DataTable } from '../../components/DataTable'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, EmptyState, ErrorState, Loading, Message, Panel, SelectField, TextField } from '../../components/ui'
import { dataLocalIso, DIAS_SEMANA, formatarDiaCurto, somarDias } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { horariosService } from '../../services/equipe'
import { HemocentroLayout } from './HemocentroLayout'

type Aviso = { tom: 'success' | 'error'; mensagens: string[] }

// RF08 – horários de atendimento e quantas pessoas o hemocentro atende em cada um.
export function HorariosPage() {
  const [de, setDe] = useState(dataLocalIso())
  const [versao, setVersao] = useState(0)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const ate = somarDias(de, 30)
  const lista = useAsync(() => horariosService.listar({ de, ate }), [de, versao])

  const concluido = (mensagem: string) => {
    setAviso({ tom: 'success', mensagens: [mensagem] })
    setVersao((v) => v + 1)
  }

  return (
    <HemocentroLayout>
      <PageTitle titulo="Horários e vagas" descricao="Defina os horários de atendimento e quantos pacientes podem agendar em cada um." />
      {aviso && (
        <Message tone={aviso.tom}>
          {aviso.mensagens.map((m) => (
            <p key={m}>{aviso.tom === 'error' ? `! ${m}` : m}</p>
          ))}
        </Message>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-section font-semibold text-ink">Próximos 30 dias</h2>
            <TextField label="A partir de" type="date" value={de} onChange={(e) => e.target.value && setDe(e.target.value)} containerClassName="sm:w-56" />
          </div>
          {lista.carregando ? (
            <Loading texto="Carregando horários…" />
          ) : lista.erro || !lista.dados ? (
            <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar os horários.']} onRetry={lista.recarregar} />
          ) : !lista.dados.horarios.length ? (
            <EmptyState title="Nenhum horário no período">Crie um horário avulso ou em lote no painel ao lado.</EmptyState>
          ) : (
            <DataTable<HorarioGestao>
              legenda="Horários do hemocentro"
              itens={lista.dados.horarios}
              chave={(h) => h.id}
              colunas={[
                { titulo: 'Horário', largura: 'w-2/5', celula: (h) => `${formatarDiaCurto(h.data)} · ${h.horaInicio}–${h.horaFim}` },
                {
                  titulo: 'Vagas',
                  celula: (h) => (
                    <span className={h.vagasRestantes ? '' : 'font-semibold text-error'}>
                      {h.vagasRestantes ? `${h.vagasRestantes} de ${h.vagasTotal} livres` : `Esgotado (${h.vagasTotal})`}
                    </span>
                  ),
                },
                { titulo: 'Situação', celula: (h) => <span className={h.ativo ? 'text-success' : 'text-muted'}>{h.ativo ? 'Ativo' : 'Inativo'}</span> },
                { titulo: 'Ação', celula: (h) => <AjusteHorario horario={h} onAlterado={concluido} onFalha={(m) => setAviso({ tom: 'error', mensagens: m })} /> },
              ]}
            />
          )}
          <p className="text-small text-muted">Desativar impede novos agendamentos; quem já agendou continua agendado.</p>
        </Panel>

        <div className="flex flex-col gap-6">
          <NovoHorario onCriado={concluido} />
          <LoteSemanal onCriado={concluido} />
        </div>
      </div>
    </HemocentroLayout>
  )
}

function AjusteHorario({ horario: h, onAlterado, onFalha }: { horario: HorarioGestao; onAlterado: (m: string) => void; onFalha: (m: string[]) => void }) {
  const [editando, setEditando] = useState(false)
  const [vagas, setVagas] = useState(String(h.vagasTotal))
  const [enviando, setEnviando] = useState(false)

  async function salvar(dados: { vagasTotal?: number; ativo?: boolean }) {
    setEnviando(true)
    try {
      onAlterado((await horariosService.atualizar(h.id, dados)).mensagem)
    } catch (err) {
      onFalha(mensagemDeErro(err))
      setEnviando(false)
    }
  }

  if (editando) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`vagas-${h.id}`}>
          Vagas do horário
        </label>
        <input
          id={`vagas-${h.id}`}
          type="number"
          min={Math.max(1, h.agendados)}
          max={500}
          value={vagas}
          onChange={(e) => setVagas(e.target.value)}
          className="h-10 w-20 rounded-control border border-input bg-surface px-2 text-body"
        />
        <button type="button" disabled={enviando} onClick={() => salvar({ vagasTotal: Number(vagas) })} className="rounded font-medium text-brand hover:underline">
          Salvar
        </button>
        <button type="button" disabled={enviando} onClick={() => setEditando(false)} className="rounded text-muted hover:underline">
          Cancelar
        </button>
      </span>
    )
  }
  return (
    <span className="flex flex-wrap gap-3">
      <button type="button" onClick={() => setEditando(true)} className="rounded font-medium text-brand hover:underline">
        Vagas
      </button>
      <button type="button" disabled={enviando} onClick={() => salvar({ ativo: !h.ativo })} className="rounded font-medium text-brand hover:underline">
        {h.ativo ? 'Desativar' : 'Reativar'}
      </button>
    </span>
  )
}

type CamposHorario = { horaInicio: string; horaFim: string; vagasTotal: string }

function validarHorario(c: CamposHorario) {
  const vagas = Number(c.vagasTotal)
  if (!c.horaInicio || !c.horaFim) return 'Informe o início e o fim.'
  if (c.horaFim <= c.horaInicio) return 'O fim deve ser depois do início.'
  if (!Number.isInteger(vagas) || vagas < 1 || vagas > 500) return 'As vagas devem ser um número de 1 a 500.'
  return undefined
}

function NovoHorario({ onCriado }: { onCriado: (m: string) => void }) {
  const [c, setC] = useState({ data: '', horaInicio: '', horaFim: '', vagasTotal: '' })
  const [erro, setErro] = useState<string>()
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const msg = !c.data ? 'Informe a data.' : validarHorario(c)
    setErro(msg)
    if (msg) return
    setEnviando(true)
    setFalha([])
    try {
      onCriado((await horariosService.criar({ ...c, vagasTotal: Number(c.vagasTotal) })).mensagem)
      setC({ data: '', horaInicio: '', horaFim: '', vagasTotal: '' })
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Panel>
      <h2 className="text-section font-semibold text-ink">Novo horário</h2>
      <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-2">
        {falha.length > 0 && (
          <Message tone="error">
            {falha.map((m) => (
              <p key={m}>! {m}</p>
            ))}
          </Message>
        )}
        <TextField label="Data" type="date" min={dataLocalIso()} value={c.data} onChange={(e) => setC({ ...c, data: e.target.value })} disabled={enviando} />
        <div className="grid grid-cols-2 gap-x-2">
          <TextField label="Início" type="time" value={c.horaInicio} onChange={(e) => setC({ ...c, horaInicio: e.target.value })} disabled={enviando} />
          <TextField label="Fim" type="time" value={c.horaFim} onChange={(e) => setC({ ...c, horaFim: e.target.value })} disabled={enviando} />
        </div>
        <TextField
          label="Vagas"
          type="number"
          min={1}
          max={500}
          hint="Quantos pacientes podem agendar neste horário."
          value={c.vagasTotal}
          onChange={(e) => setC({ ...c, vagasTotal: e.target.value })}
          error={erro}
          disabled={enviando}
        />
        <Button type="submit" loading={enviando}>
          Criar horário
        </Button>
      </form>
    </Panel>
  )
}

const opcoesDia = DIAS_SEMANA.map((d, i) => ({ value: String(i), label: d }))

function LoteSemanal({ onCriado }: { onCriado: (m: string) => void }) {
  const [c, setC] = useState({ diaSemana: '0', horaInicio: '', horaFim: '', vagasTotal: '', semanas: '4' })
  const [erro, setErro] = useState<string>()
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const semanas = Number(c.semanas)
    const msg = validarHorario(c) ?? (!Number.isInteger(semanas) || semanas < 1 || semanas > 26 ? 'Informe de 1 a 26 semanas.' : undefined)
    setErro(msg)
    if (msg) return
    setEnviando(true)
    setFalha([])
    try {
      const r = await horariosService.criarLote({
        diaSemana: Number(c.diaSemana),
        horaInicio: c.horaInicio,
        horaFim: c.horaFim,
        vagasTotal: Number(c.vagasTotal),
        semanas,
      })
      onCriado(r.ignorados ? `${r.mensagem} ${r.ignorados} data(s) já tinham esse horário ou já passaram.` : r.mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Panel>
      <h2 className="text-section font-semibold text-ink">Lote semanal</h2>
      <p className="text-small text-muted">Ex.: todo domingo às 13h, 6 vagas, pelas próximas 8 semanas.</p>
      <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-2">
        {falha.length > 0 && (
          <Message tone="error">
            {falha.map((m) => (
              <p key={m}>! {m}</p>
            ))}
          </Message>
        )}
        <SelectField label="Dia da semana" options={opcoesDia} value={c.diaSemana} onChange={(e) => setC({ ...c, diaSemana: e.target.value })} disabled={enviando} />
        <div className="grid grid-cols-2 gap-x-2">
          <TextField label="Início" type="time" value={c.horaInicio} onChange={(e) => setC({ ...c, horaInicio: e.target.value })} disabled={enviando} />
          <TextField label="Fim" type="time" value={c.horaFim} onChange={(e) => setC({ ...c, horaFim: e.target.value })} disabled={enviando} />
        </div>
        <div className="grid grid-cols-2 gap-x-2">
          <TextField label="Vagas" type="number" min={1} max={500} value={c.vagasTotal} onChange={(e) => setC({ ...c, vagasTotal: e.target.value })} disabled={enviando} />
          <TextField label="Semanas" type="number" min={1} max={26} value={c.semanas} onChange={(e) => setC({ ...c, semanas: e.target.value })} disabled={enviando} />
        </div>
        {erro && <p className="px-1 text-caption text-error">{erro}</p>}
        <Button type="submit" loading={enviando}>
          Criar horários
        </Button>
      </form>
    </Panel>
  )
}
