import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { MembroEquipe } from '../../api/types'
import { Button, ErrorState, Loading, Message, TextField } from '../../components/ui'
import { formatarData, formatarDataHora, mascaraTelefone, somenteDigitos, STATUS_USUARIO } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { emailValido, telefoneValido, temErros, type Erros } from '../../lib/validacao'
import { equipeService } from '../../services/equipe'

type Props = { id: string; onAlterado: (mensagem: string) => void }

// Detalhes do médico (RF14): edição de contato, desativação/reativação e reenvio da senha provisória.
export function MembroPainel({ id, onAlterado }: Props) {
  const [versao, setVersao] = useState(0)
  const detalhe = useAsync(() => equipeService.detalhar(id), [id, versao])
  const [confirmando, setConfirmando] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [falha, setFalha] = useState<string[]>([])

  const atualizar = (mensagem: string) => {
    setVersao((v) => v + 1)
    onAlterado(mensagem)
  }

  async function executar(acao: () => Promise<string>) {
    setProcessando(true)
    setFalha([])
    try {
      const mensagem = await acao()
      setConfirmando(false)
      atualizar(mensagem)
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setProcessando(false)
    }
  }

  if (detalhe.carregando) return <Loading texto="Carregando médico…" />
  if (detalhe.erro || !detalhe.dados) {
    return <ErrorState mensagens={detalhe.erro ?? ['Não foi possível carregar o médico.']} onRetry={detalhe.recarregar} />
  }
  const m = detalhe.dados

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-small">
        <dt className="text-muted">Nome</dt>
        <dd className="text-ink">{m.nome}</dd>
        <dt className="text-muted">CPF</dt>
        <dd className="text-ink">{m.cpf ?? '—'}</dd>
        <dt className="text-muted">Situação</dt>
        <dd className={m.status === 'ATIVO' ? 'text-success' : 'text-error'}>
          {STATUS_USUARIO[m.status]}
          {m.primeiroAcessoPendente && <span className="text-muted"> · primeiro acesso pendente</span>}
        </dd>
        <dt className="text-muted">Cadastrado em</dt>
        <dd className="text-ink">{formatarData(m.criadoEm)}</dd>
      </dl>

      {m.status === 'ENCERRADO' ? (
        <Message tone="info">
          <p>Conta encerrada. Os dados não podem ser alterados.</p>
        </Message>
      ) : (
        <EdicaoMembro key={`${m.email}|${m.telefone}`} membro={m} onSalvo={atualizar} />
      )}

      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((f) => (
            <p key={f}>! {f}</p>
          ))}
        </Message>
      )}

      {m.primeiroAcessoPendente && m.status === 'ATIVO' && (
        <Button
          kind="secondary"
          loading={processando}
          onClick={() =>
            executar(async () => {
              const r = await equipeService.reenviarSenhaProvisoria(m.id)
              return r.senhaProvisoriaEnviada
                ? `Nova senha provisória enviada para ${m.email}. Ela vale até ${formatarDataHora(r.senhaProvisoriaExpiraEm)}.`
                : 'A senha provisória foi gerada, mas o e-mail não pôde ser enviado. Tente novamente.'
            })
          }
        >
          Reenviar senha provisória
        </Button>
      )}

      {m.status === 'INATIVO' && (
        <Button kind="secondary" loading={processando} onClick={() => executar(() => equipeService.atualizar(m.id, { ativo: true }).then(() => 'Médico reativado.'))}>
          Reativar
        </Button>
      )}
      {m.status === 'ATIVO' &&
        (confirmando ? (
          <Message tone="warning">
            <p>Ao desativar, o médico perde o acesso e as sessões abertas são encerradas.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                kind="destructive"
                loading={processando}
                onClick={() => executar(() => equipeService.atualizar(m.id, { ativo: false }).then(() => 'Médico desativado.'))}
              >
                Confirmar desativação
              </Button>
              <Button kind="secondary" disabled={processando} onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
            </div>
          </Message>
        ) : (
          <Button kind="secondary" onClick={() => setConfirmando(true)}>
            Desativar
          </Button>
        ))}
    </div>
  )
}

type CamposEdicao = { email: string; telefone: string }

function EdicaoMembro({ membro: m, onSalvo }: { membro: MembroEquipe; onSalvo: (mensagem: string) => void }) {
  const [c, setC] = useState<CamposEdicao>({ email: m.email, telefone: m.telefone ? mascaraTelefone(m.telefone) : '' })
  const [erros, setErros] = useState<Erros<CamposEdicao>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos: Erros<CamposEdicao> = {
      email: !emailValido(c.email) ? 'Informe um e-mail válido.' : undefined,
      telefone: !telefoneValido(c.telefone) ? 'Informe o telefone com DDD.' : undefined,
    }
    setErros(novos)
    if (temErros(novos)) return
    setEnviando(true)
    setFalha([])
    try {
      await equipeService.atualizar(m.id, { email: c.email.trim(), telefone: somenteDigitos(c.telefone) })
      onSalvo('Dados do médico atualizados.')
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form noValidate onSubmit={aoEnviar} className="flex flex-col gap-2.5">
      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((f) => (
            <p key={f}>! {f}</p>
          ))}
        </Message>
      )}
      <TextField label="E-mail" type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} error={erros.email} disabled={enviando} />
      <TextField
        label="Telefone"
        inputMode="tel"
        value={c.telefone}
        onChange={(e) => setC({ ...c, telefone: mascaraTelefone(e.target.value) })}
        error={erros.telefone}
        disabled={enviando}
      />
      <p className="px-1 text-caption text-muted">Nome e CPF não podem ser alterados.</p>
      <Button type="submit" loading={enviando}>
        Salvar
      </Button>
    </form>
  )
}
