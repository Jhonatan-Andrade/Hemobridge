import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import type { AdminHemocentro } from '../../api/types'
import { Button, ErrorState, Loading, Message } from '../../components/ui'
import { formatarData, formatarDataHora, mascaraCnpj, STATUS_USUARIO } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { temErros, type Erros } from '../../lib/validacao'
import { gestaoHemocentrosService } from '../../services/admin'
import { AdminCampos } from './AdminCampos'
import { adminVazio, dadosAdmin, validarAdmin, type CamposAdmin } from './adminHemocentro'
import { HemocentroForm } from './HemocentroForm'

type Props = {
  id: string
  /** Avisa a página para recarregar a listagem e exibir a mensagem. */
  onAlterado: (mensagem: string) => void
}

// Detalhes do hemocentro selecionado: edição, desativação/reativação e administradores (RF15).
export function HemocentroPainel({ id, onAlterado }: Props) {
  const [versao, setVersao] = useState(0)
  const detalhe = useAsync(() => gestaoHemocentrosService.detalhar(id), [id, versao])
  const [confirmando, setConfirmando] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [falha, setFalha] = useState<string[]>([])
  const [adicionando, setAdicionando] = useState(false)

  const atualizar = (mensagem: string) => {
    setVersao((v) => v + 1)
    onAlterado(mensagem)
  }

  async function alterarSituacao(ativo: boolean) {
    setProcessando(true)
    setFalha([])
    try {
      await gestaoHemocentrosService.atualizar(id, { ativo })
      setConfirmando(false)
      atualizar(
        ativo ? 'Hemocentro reativado.' : 'Hemocentro desativado. Ele saiu da página Doar, a equipe perdeu o acesso e os agendamentos futuros foram cancelados.',
      )
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setProcessando(false)
    }
  }

  if (detalhe.carregando) return <Loading texto="Carregando hemocentro…" />
  if (detalhe.erro || !detalhe.dados) {
    return <ErrorState mensagens={detalhe.erro ?? ['Não foi possível carregar o hemocentro.']} onRetry={detalhe.recarregar} />
  }
  const h = detalhe.dados

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-small text-muted">
        <p>
          CNPJ {mascaraCnpj(h.cnpj)} · cadastrado em {formatarData(h.criadoEm)}
        </p>
        <p>
          <span className={`font-semibold ${h.ativo ? 'text-success' : 'text-error'}`}>{h.ativo ? 'Ativo' : 'Inativo'}</span> ·{' '}
          {h.totalMedicos === 1 ? '1 médico' : `${h.totalMedicos} médicos`}
        </p>
      </div>

      <HemocentroForm key={h.atualizadoEm} hemocentro={h} onSalvo={(mensagem) => atualizar(mensagem)} />

      {falha.length > 0 && (
        <Message tone="error">
          {falha.map((m) => (
            <p key={m}>! {m}</p>
          ))}
        </Message>
      )}
      {h.ativo ? (
        confirmando ? (
          <Message tone="warning">
            <p>Ao desativar, o hemocentro some da página Doar, a equipe perde o acesso e os agendamentos futuros são cancelados.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button kind="destructive" loading={processando} onClick={() => alterarSituacao(false)}>
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
        )
      ) : (
        <Button kind="secondary" loading={processando} onClick={() => alterarSituacao(true)}>
          Reativar
        </Button>
      )}

      <section aria-labelledby="admins-titulo" className="flex flex-col gap-3 border-t border-line pt-4">
        <h3 id="admins-titulo" className="text-label font-semibold text-ink">
          Administradores do hemocentro
        </h3>
        {h.admins.length ? (
          <ul className="flex flex-col gap-2">
            {h.admins.map((a) => (
              <AdminItem key={a.id} hemocentroId={h.id} admin={a} onAlterado={atualizar} />
            ))}
          </ul>
        ) : (
          <p className="text-small text-muted">Nenhum administrador vinculado.</p>
        )}
        {adicionando ? (
          <NovoAdminForm
            hemocentroId={h.id}
            onCancelar={() => setAdicionando(false)}
            onSalvo={(mensagem) => {
              setAdicionando(false)
              atualizar(mensagem)
            }}
          />
        ) : (
          <Button kind="secondary" disabled={!h.ativo} onClick={() => setAdicionando(true)}>
            Adicionar administrador
          </Button>
        )}
        {!h.ativo && <p className="text-caption text-muted">Reative o hemocentro para cadastrar administradores.</p>}
      </section>
    </div>
  )
}

function AdminItem({ hemocentroId, admin: a, onAlterado }: { hemocentroId: string; admin: AdminHemocentro; onAlterado: (m: string) => void }) {
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string[]>([])

  async function reenviar() {
    setEnviando(true)
    setFalha([])
    try {
      const r = await gestaoHemocentrosService.reenviarSenhaAdmin(hemocentroId, a.id)
      onAlterado(
        r.senhaProvisoriaEnviada
          ? `Nova senha provisória enviada para ${a.email}. Ela vale até ${formatarDataHora(r.senhaProvisoriaExpiraEm)}.`
          : 'A senha provisória foi gerada, mas o e-mail não pôde ser enviado. Tente novamente.',
      )
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <li className="flex flex-col gap-1 border-b border-line pb-2 last:border-0">
      <span className="text-body font-semibold text-ink">{a.nome}</span>
      <span className="text-small text-muted">
        {a.email} · {STATUS_USUARIO[a.status]}
        {a.primeiroAcessoPendente && ' · primeiro acesso pendente'}
      </span>
      {falha.map((m) => (
        <span key={m} className="text-small text-error">
          ! {m}
        </span>
      ))}
      {a.primeiroAcessoPendente && a.status === 'ATIVO' && (
        <button type="button" disabled={enviando} onClick={reenviar} className="self-start rounded text-small font-medium text-brand hover:underline">
          Reenviar senha provisória<span className="sr-only"> para {a.nome}</span>
        </button>
      )}
    </li>
  )
}

function NovoAdminForm({ hemocentroId, onSalvo, onCancelar }: { hemocentroId: string; onSalvo: (m: string) => void; onCancelar: () => void }) {
  const [c, setC] = useState<CamposAdmin>(adminVazio)
  const [erros, setErros] = useState<Erros<CamposAdmin>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos = validarAdmin(c)
    setErros(novos)
    if (temErros(novos)) return
    setEnviando(true)
    setFalha([])
    try {
      const r = await gestaoHemocentrosService.adicionarAdmin(hemocentroId, dadosAdmin(c))
      onSalvo(
        r.senhaProvisoriaEnviada
          ? `Administrador cadastrado. A senha provisória foi enviada para ${r.admin.email}.`
          : 'Administrador cadastrado, mas não foi possível enviar a senha provisória. Use "Reenviar senha provisória".',
      )
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
      <AdminCampos valor={c} erros={erros} desabilitado={enviando} onChange={setC} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={enviando}>
          Cadastrar administrador
        </Button>
        <Button kind="secondary" disabled={enviando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
