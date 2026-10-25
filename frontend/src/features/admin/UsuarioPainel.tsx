import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { UsuarioAdminDetalhe } from '../../api/types'
import { Button, ErrorState, Loading, Message, TextField } from '../../components/ui'
import { formatarData, formatarDataHora, mascaraTelefone, PAPEIS, SITUACOES_PACIENTE, somenteDigitos, STATUS_USUARIO } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { emailValido, telefoneValido, temErros, type Erros } from '../../lib/validacao'
import { usuariosAdminService } from '../../services/admin'
import { useAuth } from '../auth/authState'

type Props = { id: string; onAlterado: (mensagem: string) => void }

// Detalhes do usuário (UC26 passos 3–5): edição, ativação/desativação e reenvio da senha provisória (FA02).
export function UsuarioPainel({ id, onAlterado }: Props) {
  const { usuario: atual } = useAuth()
  const [versao, setVersao] = useState(0)
  const detalhe = useAsync(() => usuariosAdminService.detalhar(id), [id, versao])
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

  if (detalhe.carregando) return <Loading texto="Carregando usuário…" />
  if (detalhe.erro || !detalhe.dados) {
    return <ErrorState mensagens={detalhe.erro ?? ['Não foi possível carregar o usuário.']} onRetry={detalhe.recarregar} />
  }
  const u = detalhe.dados
  const vinculo = u.medico?.hospital.nome ?? u.representante?.hospital.nome
  const proprio = atual?.id === u.id

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-small">
        <dt className="text-muted">Perfil</dt>
        <dd className="text-ink">{PAPEIS[u.papel]}</dd>
        <dt className="text-muted">CPF</dt>
        <dd className="text-ink">{u.cpf}</dd>
        <dt className="text-muted">Situação</dt>
        <dd className={u.status === 'ATIVO' ? 'text-success' : 'text-error'}>
          {STATUS_USUARIO[u.status]}
          {u.primeiroAcessoPendente && <span className="text-muted"> · primeiro acesso pendente</span>}
        </dd>
        {u.paciente && (
          <>
            <dt className="text-muted">Processo</dt>
            <dd className="text-ink">{SITUACOES_PACIENTE[u.paciente.situacao]}</dd>
          </>
        )}
        {u.medico && (
          <>
            <dt className="text-muted">CRM</dt>
            <dd className="text-ink">
              {u.medico.crm}/{u.medico.ufCrm}
            </dd>
          </>
        )}
        {vinculo && (
          <>
            <dt className="text-muted">Hospital</dt>
            <dd className="text-ink">{vinculo}</dd>
          </>
        )}
        <dt className="text-muted">Cadastro</dt>
        <dd className="text-ink">{formatarData(u.criadoEm)}</dd>
        {u.bloqueadoAte && new Date(u.bloqueadoAte) > new Date() && (
          <>
            <dt className="text-muted">Bloqueio</dt>
            <dd className="text-warning">até {formatarDataHora(u.bloqueadoAte)}</dd>
          </>
        )}
      </dl>

      {u.status === 'ENCERRADO' ? (
        <Message tone="info">
          <p>Conta encerrada. Os dados não podem ser alterados.</p>
        </Message>
      ) : (
        <EdicaoUsuario key={u.atualizadoEm} usuario={u} onSalvo={atualizar} />
      )}

      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}

      {u.primeiroAcessoPendente && u.status === 'ATIVO' && (
        <Button
          kind="secondary"
          loading={processando}
          onClick={() =>
            executar(async () => {
              const r = await usuariosAdminService.reenviarSenhaProvisoria(u.id)
              return r.senhaProvisoriaEnviada
                ? `Nova senha provisória enviada para ${u.email}. Ela vale até ${formatarDataHora(r.senhaProvisoriaExpiraEm)}.`
                : 'A senha provisória foi gerada, mas o e-mail não pôde ser enviado. Tente novamente.'
            })
          }
        >
          Reenviar senha provisória
        </Button>
      )}

      {u.status === 'INATIVO' && (
        <Button kind="secondary" loading={processando} onClick={() => executar(() => usuariosAdminService.ativar(u.id).then(() => 'Conta ativada.'))}>
          Ativar
        </Button>
      )}
      {u.status === 'ATIVO' &&
        !proprio &&
        (confirmando ? (
          <Message tone="warning">
            <p>Ao desativar, a pessoa perde o acesso e as sessões abertas são encerradas.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                kind="destructive"
                loading={processando}
                onClick={() => executar(() => usuariosAdminService.desativar(u.id).then(() => 'Conta desativada.'))}
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
      {proprio && <p className="text-caption text-muted">Você não pode desativar a própria conta.</p>}
    </div>
  )
}

type CamposEdicao = { nome: string; email: string; telefone: string }

function EdicaoUsuario({ usuario: u, onSalvo }: { usuario: UsuarioAdminDetalhe; onSalvo: (mensagem: string) => void }) {
  const [c, setC] = useState<CamposEdicao>({ nome: u.nome, email: u.email, telefone: u.telefone ? mascaraTelefone(u.telefone) : '' })
  const [erros, setErros] = useState<Erros<CamposEdicao>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos: Erros<CamposEdicao> = {
      nome: c.nome.trim().length < 3 ? 'Informe o nome completo (mínimo de 3 caracteres).' : undefined,
      email: !emailValido(c.email) ? 'Informe um e-mail válido.' : undefined,
      telefone: c.telefone && !telefoneValido(c.telefone) ? 'Informe o telefone com DDD.' : undefined,
    }
    setErros(novos)
    if (temErros(novos)) return
    setEnviando(true)
    setFalha([])
    try {
      await usuariosAdminService.atualizar(u.id, {
        nome: c.nome.trim(),
        email: c.email.trim(),
        telefone: somenteDigitos(c.telefone) || undefined,
      })
      onSalvo('Dados do usuário atualizados.')
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
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      <TextField label="Nome" value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} error={erros.nome} disabled={enviando} />
      <TextField label="E-mail" type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} error={erros.email} disabled={enviando} />
      <TextField
        label="Telefone"
        inputMode="tel"
        value={c.telefone}
        onChange={(e) => setC({ ...c, telefone: mascaraTelefone(e.target.value) })}
        error={erros.telefone}
        disabled={enviando}
      />
      <p className="px-1 text-caption text-muted">O CPF não pode ser alterado.</p>
      <Button type="submit" loading={enviando}>
        Salvar
      </Button>
    </form>
  )
}
