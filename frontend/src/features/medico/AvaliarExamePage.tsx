import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { mensagemDeErro } from '../../api/client'
import type { EnvioExame, SolicitacaoExameMedico, TipoSanguineo } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, Consent, ErrorState, Loading, Message, Panel, SelectField, TextAreaField } from '../../components/ui'
import { formatarDataHora, SITUACOES_PACIENTE, TIPOS_SANGUINEOS } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { temErros, type Erros } from '../../lib/validacao'
import { examesMedicoService } from '../../services/medico'
import { abrirArquivo } from './arquivo'
import { MedicoLayout } from './MedicoLayout'
import { corSituacao, SEXOS, SITUACOES_EXAME } from './rotulos'

// Figma: Web desktop / Médico / Exames / Validar · revisar (824:10121) e Escolher decisão (824:10086). UC16.
export function AvaliarExamePage() {
  const { id = '' } = useParams()
  const [versao, setVersao] = useState(0)
  const [aviso, setAviso] = useState('')
  const solicitacao = useAsync(() => examesMedicoService.detalhar(id), [id, versao])

  return (
    <MedicoLayout>
      <ButtonLink to="/medico/exames" kind="secondary" block>
        ← Voltar aos exames
      </ButtonLink>
      {solicitacao.carregando ? (
        <Loading texto="Carregando exame…" />
      ) : solicitacao.erro || !solicitacao.dados ? (
        <ErrorState mensagens={solicitacao.erro ?? ['Não foi possível carregar o exame.']} onRetry={solicitacao.recarregar} />
      ) : (
        <Detalhe
          solicitacao={solicitacao.dados}
          aviso={aviso}
          onAvaliado={(m) => {
            setAviso(m)
            setVersao((v) => v + 1)
          }}
        />
      )}
    </MedicoLayout>
  )
}

function Detalhe({ solicitacao: s, aviso, onAvaliado }: { solicitacao: SolicitacaoExameMedico; aviso: string; onAvaliado: (m: string) => void }) {
  const p = s.paciente
  const ultimo = s.envios[0]

  return (
    <>
      <PageTitle
        titulo={s.situacao === 'EM_ANALISE' ? 'Avaliar resultado' : 'Exame do paciente'}
        descricao={ultimo ? `${p.nome} · ${ultimo.nomeArquivo}` : p.nome}
      />
      {aviso && (
        <Message tone="success">
          <p>{aviso}</p>
        </Message>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {s.situacao === 'EM_ANALISE' && ultimo ? (
            <Panel>
              <DecisaoClinica solicitacao={s} envio={ultimo} onAvaliado={onAvaliado} />
            </Panel>
          ) : (
            <Message tone={s.situacao === 'VALIDADO' ? 'success' : 'info'}>
              <p>
                {s.situacao === 'VALIDADO'
                  ? `Resultado validado. Tipo sanguíneo ${p.tipoSanguineo ?? ''} registrado; o paciente é doador.`
                  : s.situacao === 'REPROVADO'
                    ? 'Resultado reprovado. O paciente pode enviar um novo arquivo.'
                    : 'Aguardando o paciente enviar o resultado.'}
              </p>
            </Message>
          )}

          <Panel>
            <h2 className="text-section font-semibold text-ink">Envios do paciente</h2>
            {!s.envios.length ? (
              <p className="text-body text-muted">Nenhum arquivo enviado ainda.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {s.envios.map((e) => (
                  <Envio key={e.id} solicitacaoId={s.id} envio={e} />
                ))}
              </ul>
            )}
            <p className="text-small text-muted">A decisão e o profissional responsável permanecem no histórico privado.</p>
          </Panel>
        </div>

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
            <dt className="text-muted">Situação</dt>
            <dd className="text-ink">{SITUACOES_PACIENTE[p.situacao]}</dd>
            <dt className="text-muted">Tipo</dt>
            <dd className="text-ink">{p.tipoSanguineo ?? 'Não registrado'}</dd>
          </dl>
          <h3 className="text-label font-semibold text-ink">Exames solicitados</h3>
          <ul className="list-disc pl-5 text-body text-ink">
            {s.exames.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {s.orientacoes && <p className="text-body text-muted">Orientações: {s.orientacoes}</p>}
          <Link to={`/medico/atendimentos/${s.consulta.id}`} className="rounded text-small font-medium text-brand hover:underline">
            Ver atendimento de {formatarDataHora(s.consulta.inicio)}
          </Link>
        </Panel>
      </div>
    </>
  )
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}

function Envio({ solicitacaoId, envio: e }: { solicitacaoId: string; envio: EnvioExame }) {
  const [abrindo, setAbrindo] = useState(false)
  const [falha, setFalha] = useState<string[]>([])

  async function abrir() {
    setAbrindo(true)
    setFalha([])
    try {
      await abrirArquivo(() => examesMedicoService.arquivo(solicitacaoId, e.id))
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setAbrindo(false)
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-card border border-line p-4">
      <p className={`text-small font-semibold uppercase ${corSituacao(e.situacao)}`}>{SITUACOES_EXAME[e.situacao]}</p>
      <p className="break-all text-body text-ink">{e.nomeArquivo}</p>
      <p className="text-small text-muted">
        Enviado em {formatarDataHora(e.enviadoEm)} · {formatarTamanho(e.tamanhoBytes)}
        {e.avaliadoEm && ` · avaliado em ${formatarDataHora(e.avaliadoEm)}`}
      </p>
      {e.motivoReprovacao && <p className="text-body text-ink">Motivo: {e.motivoReprovacao}</p>}
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      <Button kind="secondary" loading={abrindo} onClick={abrir}>
        Abrir resultado<span className="sr-only"> {e.nomeArquivo} (abre em nova aba)</span>
      </Button>
    </li>
  )
}

type Campos = { decisao: '' | 'validar' | 'reprovar'; tipo: '' | TipoSanguineo; motivo: string; revisado: boolean }
const opcoesDecisao = [
  { value: 'validar', label: 'Validar resultado' },
  { value: 'reprovar', label: 'Reprovar resultado' },
]
const opcoesTipo = TIPOS_SANGUINEOS.map((t) => ({ value: t, label: t }))

function validar(c: Campos): Erros<Campos> {
  return {
    decisao: !c.decisao ? 'Escolha a decisão.' : undefined,
    tipo: c.decisao === 'validar' && !c.tipo ? 'O tipo sanguíneo é obrigatório para aprovar (FE01).' : undefined,
    motivo: c.decisao === 'reprovar' && c.motivo.trim().length < 5 ? 'Informe o motivo (mínimo de 5 caracteres).' : undefined,
    revisado: !c.revisado ? 'Confirme que revisou o resultado.' : undefined,
  }
}

// Figma: "Decisão clínica" (824:10121) — decisão, tipo sanguíneo confirmado e declaração de revisão.
function DecisaoClinica({ solicitacao, envio, onAvaliado }: { solicitacao: SolicitacaoExameMedico; envio: EnvioExame; onAvaliado: (m: string) => void }) {
  const [c, setC] = useState<Campos>({ decisao: '', tipo: '', motivo: '', revisado: false })
  const [erros, setErros] = useState<Erros<Campos>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos = validar(c)
    setErros(novos)
    if (temErros(novos)) return
    setEnviando(true)
    setFalha([])
    try {
      const r =
        c.decisao === 'validar'
          ? await examesMedicoService.aprovar(solicitacao.id, c.tipo as TipoSanguineo)
          : await examesMedicoService.reprovar(solicitacao.id, c.motivo.trim())
      onAvaliado(r.mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-2.5">
      <h2 className="text-section font-semibold text-ink">Decisão clínica</h2>
      <p className="text-body text-muted">Avaliando {envio.nomeArquivo}. Abra o resultado antes de decidir.</p>
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      <SelectField
        label="Decisão"
        hint="Você pode rever a decisão antes de confirmar."
        placeholder="Selecione"
        options={opcoesDecisao}
        value={c.decisao}
        onChange={(e) => setC({ ...c, decisao: e.target.value as Campos['decisao'] })}
        error={erros.decisao}
        disabled={enviando}
      />
      {c.decisao === 'validar' && (
        <SelectField
          label="Tipo sanguíneo confirmado"
          hint="Confirme o tipo presente no resultado. O paciente não pode alterá-lo (RN01)."
          placeholder="Selecione"
          options={opcoesTipo}
          value={c.tipo}
          onChange={(e) => setC({ ...c, tipo: e.target.value as Campos['tipo'] })}
          error={erros.tipo}
          disabled={enviando}
        />
      )}
      {c.decisao === 'reprovar' && (
        <TextAreaField
          label="Motivo da reprovação"
          hint="O paciente verá o motivo e poderá enviar um novo arquivo."
          rows={3}
          value={c.motivo}
          onChange={(e) => setC({ ...c, motivo: e.target.value })}
          error={erros.motivo}
          maxLength={1000}
          disabled={enviando}
        />
      )}
      <Consent checked={c.revisado} onChange={(e) => setC({ ...c, revisado: e.target.checked })} error={erros.revisado} disabled={enviando}>
        Revisei o resultado e confirmo a decisão e os dados informados.
      </Consent>
      <Button type="submit" block kind={c.decisao === 'reprovar' ? 'destructive' : 'primary'} loading={enviando}>
        Confirmar avaliação
      </Button>
    </form>
  )
}
