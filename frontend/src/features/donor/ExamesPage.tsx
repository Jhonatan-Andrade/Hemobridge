import { useId, useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { EnvioExame, SolicitacaoExamePaciente } from '../../api/types'
import { PageTitle } from '../../components/layout/AppShell'
import { Button, ButtonLink, Card, EmptyState, ErrorState, Loading, Message } from '../../components/ui'
import { formatarData, formatarDataHora } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { examesPacienteService } from '../../services/consultas'
import { abrirArquivo } from '../medico/arquivo'
import { corSituacao, SITUACOES_EXAME } from '../medico/rotulos'
import { DonorLayout } from './DonorLayout'

// RN19: PDF, JPG ou PNG com até 5 MB (o servidor confere o conteúdo do arquivo).
const LIMITE_BYTES = 5 * 1024 * 1024
const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png']

// Figma: Web desktop / Paciente/Doador / Exames (8:2461). UC11 – Anexar Resultado de Exame.
export function ExamesPage() {
  const [versao, setVersao] = useState(0)
  const [aviso, setAviso] = useState('')
  const solicitacoes = useAsync(() => examesPacienteService.listar(), [versao])
  const pendente = solicitacoes.dados?.find((s) => s.podeEnviar)

  return (
    <DonorLayout largura="wide">
      <PageTitle
        titulo="Exames · Meus exames"
        descricao="Solicitações e resultados ficam disponíveis apenas para você e para o médico responsável."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card kind="situation" title="Solicitação">
          {pendente
            ? pendente.situacao === 'REPROVADO'
              ? 'O médico pediu um novo envio. Veja o motivo abaixo.'
              : 'Aguardando resultado. Siga as orientações do médico e envie o arquivo.'
            : 'Nenhum exame aguardando envio.'}
        </Card>
        <Card title="Arquivo permitido">PDF, JPG ou PNG até 5 MB. Acesso restrito a você e ao médico responsável.</Card>
        <Card title="Reenvio após reprovação">O motivo informado pelo médico aparece aqui; um novo envio preserva o histórico.</Card>
      </div>

      {aviso && (
        <Message tone="success">
          <p>{aviso}</p>
        </Message>
      )}

      {solicitacoes.carregando ? (
        <Loading texto="Carregando exames…" />
      ) : solicitacoes.erro || !solicitacoes.dados ? (
        <ErrorState mensagens={solicitacoes.erro ?? ['Não foi possível carregar seus exames.']} onRetry={solicitacoes.recarregar} />
      ) : !solicitacoes.dados.length ? (
        <EmptyState title="Nenhum exame solicitado">Os exames pedidos pelo médico na teleconsulta aparecem aqui.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {solicitacoes.dados.map((s) => (
            <Solicitacao
              key={s.id}
              solicitacao={s}
              onEnviado={(m) => {
                setAviso(m)
                setVersao((v) => v + 1)
              }}
            />
          ))}
        </ul>
      )}

      <ButtonLink to="/doador" kind="secondary">
        Voltar ao painel
      </ButtonLink>
    </DonorLayout>
  )
}

function Solicitacao({ solicitacao: s, onEnviado }: { solicitacao: SolicitacaoExamePaciente; onEnviado: (m: string) => void }) {
  const reprovado = s.envios.find((e) => e.situacao === 'REPROVADO')
  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <p className={`text-small font-semibold uppercase ${corSituacao(s.situacao)}`}>{SITUACOES_EXAME[s.situacao]}</p>
      <h2 className="text-section font-semibold text-ink">Exames solicitados por {s.medico.nome}</h2>
      <p className="text-small text-muted">Na consulta de {formatarData(s.consulta.inicio)}</p>
      <ul className="list-disc pl-5 text-body text-ink">
        {s.exames.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
      {s.orientacoes && <p className="text-body text-ink">Orientações do médico: {s.orientacoes}</p>}
      {s.situacao === 'REPROVADO' && reprovado?.motivoReprovacao && (
        <Message tone="warning">
          <p>Motivo da reprovação: {reprovado.motivoReprovacao}</p>
        </Message>
      )}
      {s.situacao === 'EM_ANALISE' && <p className="text-body text-ink">O médico está analisando o resultado enviado.</p>}
      {s.podeEnviar && <EnvioResultado solicitacaoId={s.id} reenvio={s.situacao === 'REPROVADO'} onEnviado={onEnviado} />}

      {s.envios.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-line pt-3" aria-label="Arquivos enviados">
          <h3 className="text-label font-semibold text-ink">Arquivos enviados</h3>
          <ul className="flex flex-col gap-2">
            {s.envios.map((e) => (
              <Envio key={e.id} solicitacaoId={s.id} envio={e} />
            ))}
          </ul>
        </section>
      )}
    </li>
  )
}

function EnvioResultado({ solicitacaoId, reenvio, onEnviado }: { solicitacaoId: string; reenvio: boolean; onEnviado: (m: string) => void }) {
  const id = useId()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState('')
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    // FE01
    if (!arquivo) return setErro('Escolha o arquivo do resultado.')
    if (!TIPOS_ACEITOS.includes(arquivo.type) || arquivo.size > LIMITE_BYTES) {
      return setErro('Envie um arquivo PDF, JPG ou PNG com até 5 MB.')
    }
    setEnviando(true)
    setFalha([])
    try {
      const r = await examesPacienteService.enviarResultado(solicitacaoId, arquivo)
      onEnviado(r.mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
      setEnviando(false)
    }
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-2 rounded-control bg-background p-3">
      <label htmlFor={id} className="text-label font-medium text-ink">
        {reenvio ? 'Novo arquivo do resultado' : 'Arquivo do resultado'}
      </label>
      <input
        id={id}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={(e) => {
          setArquivo(e.target.files?.[0] ?? null)
          setErro('')
        }}
        disabled={enviando}
        aria-invalid={erro ? true : undefined}
        aria-describedby={`${id}-msg`}
        className="text-body text-ink file:mr-3 file:rounded-pill file:border file:border-input file:bg-surface file:px-4 file:py-2 file:text-label file:font-semibold file:text-ink hover:file:bg-background"
      />
      <p id={`${id}-msg`} className={`text-caption ${erro ? 'text-error' : 'text-muted'}`}>
        {erro || 'PDF, JPG ou PNG com até 5 MB.'}
      </p>
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      <Button type="submit" loading={enviando}>
        {reenvio ? 'Enviar novo resultado' : 'Enviar resultado'}
      </Button>
    </form>
  )
}

function Envio({ solicitacaoId, envio: e }: { solicitacaoId: string; envio: EnvioExame }) {
  const [abrindo, setAbrindo] = useState(false)
  const [falha, setFalha] = useState<string[]>([])

  async function abrir() {
    setAbrindo(true)
    setFalha([])
    try {
      await abrirArquivo(() => examesPacienteService.arquivo(solicitacaoId, e.id))
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setAbrindo(false)
    }
  }

  return (
    <li className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col">
        <span className="break-all text-body text-ink">{e.nomeArquivo}</span>
        <span className="text-small text-muted">
          Enviado em {formatarDataHora(e.enviadoEm)} · <span className={corSituacao(e.situacao)}>{SITUACOES_EXAME[e.situacao]}</span>
        </span>
        {falha.map((m) => (
          <span key={m} className="text-small text-error">
            ! {m}
          </span>
        ))}
      </div>
      <Button kind="secondary" loading={abrindo} onClick={abrir}>
        Abrir<span className="sr-only"> {e.nomeArquivo} (abre em nova aba)</span>
      </Button>
    </li>
  )
}
