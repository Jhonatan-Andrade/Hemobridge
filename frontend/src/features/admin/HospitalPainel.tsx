import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '../../api/client'
import { Button, ErrorState, Loading, Message } from '../../components/ui'
import { formatarData, mascaraCnpj, STATUS_USUARIO } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { temErros, type Erros } from '../../lib/validacao'
import { hospitaisAdminService } from '../../services/admin'
import { HospitalForm } from './HospitalForm'
import { dadosRepresentante, representanteVazio, validarRepresentante, type CamposRepresentante } from './representante'
import { RepresentanteCampos } from './RepresentanteCampos'

type Props = {
  id: string
  /** Avisa a página para recarregar a listagem e exibir a mensagem. */
  onAlterado: (mensagem: string) => void
}

// Detalhes do hospital selecionado: edição (FA01), desativação/reativação (FA02) e representantes (FA03).
export function HospitalPainel({ id, onAlterado }: Props) {
  const [versao, setVersao] = useState(0)
  const detalhe = useAsync(() => hospitaisAdminService.detalhar(id), [id, versao])
  const [confirmando, setConfirmando] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [falha, setFalha] = useState<string[]>([])
  const [adicionando, setAdicionando] = useState(false)

  const atualizar = (mensagem: string) => {
    setVersao((v) => v + 1)
    onAlterado(mensagem)
  }

  async function alterarSituacao(ativar: boolean) {
    setProcessando(true)
    setFalha([])
    try {
      await (ativar ? hospitaisAdminService.ativar(id) : hospitaisAdminService.desativar(id))
      setConfirmando(false)
      atualizar(ativar ? 'Hospital reativado.' : 'Hospital desativado. Ele saiu da consulta pública e a equipe perdeu o acesso.')
    } catch (err) {
      setFalha(mensagemDeErro(err))
    } finally {
      setProcessando(false)
    }
  }

  if (detalhe.carregando) return <Loading texto="Carregando hospital…" />
  if (detalhe.erro || !detalhe.dados) {
    return <ErrorState mensagens={detalhe.erro ?? ['Não foi possível carregar o hospital.']} onRetry={detalhe.recarregar} />
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
          {h.totalMedicos === 1 ? '1 médico vinculado' : `${h.totalMedicos} médicos vinculados`}
        </p>
      </div>

      <HospitalForm key={h.atualizadoEm} hospital={h} onSalvo={(mensagem) => atualizar(mensagem)} />

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
            <p>Ao desativar, o hospital some da consulta pública e representantes e médicos perdem o acesso.</p>
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

      <section aria-labelledby="representantes-titulo" className="flex flex-col gap-3 border-t border-line pt-4">
        <h3 id="representantes-titulo" className="text-label font-semibold text-ink">
          Representantes
        </h3>
        {h.representantes.length ? (
          <ul className="flex flex-col gap-2">
            {h.representantes.map((r) => (
              <li key={r.id} className="flex flex-col border-b border-line pb-2 last:border-0">
                <span className="text-body font-semibold text-ink">
                  {r.nome}
                  {r.cargo && <span className="font-normal text-muted"> · {r.cargo}</span>}
                </span>
                <span className="text-small text-muted">
                  {r.email} · {STATUS_USUARIO[r.status]}
                  {r.primeiroAcessoPendente && ' · primeiro acesso pendente'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-muted">Nenhum representante vinculado.</p>
        )}
        {adicionando ? (
          <NovoRepresentanteForm
            hospitalId={h.id}
            onCancelar={() => setAdicionando(false)}
            onSalvo={(mensagem) => {
              setAdicionando(false)
              atualizar(mensagem)
            }}
          />
        ) : (
          <Button kind="secondary" disabled={!h.ativo} onClick={() => setAdicionando(true)}>
            Adicionar representante
          </Button>
        )}
        {!h.ativo && <p className="text-caption text-muted">Reative o hospital para cadastrar representantes.</p>}
      </section>
    </div>
  )
}

function NovoRepresentanteForm({ hospitalId, onSalvo, onCancelar }: { hospitalId: string; onSalvo: (m: string) => void; onCancelar: () => void }) {
  const [c, setC] = useState<CamposRepresentante>(representanteVazio)
  const [erros, setErros] = useState<Erros<CamposRepresentante>>({})
  const [falha, setFalha] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos = validarRepresentante(c)
    setErros(novos)
    if (temErros(novos)) return
    setEnviando(true)
    setFalha([])
    try {
      const r = await hospitaisAdminService.adicionarRepresentante(hospitalId, dadosRepresentante(c))
      onSalvo(
        r.senhaProvisoriaEnviada
          ? `Representante cadastrado. A senha provisória foi enviada para ${r.representante.email}.`
          : 'Representante cadastrado, mas não foi possível enviar a senha provisória. Reenvie pela tela de Usuários.',
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
      <RepresentanteCampos valor={c} erros={erros} desabilitado={enviando} onChange={setC} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={enviando}>
          Cadastrar representante
        </Button>
        <Button kind="secondary" disabled={enviando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
