import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, messageOf } from '../services/api-client'
import { useResource } from '../services/use-resource'
import { Alert, Intro } from '../components/ui'

type Request = {
  id: string
  status: string
  solicitadoEm: string
  justificativa: string | null
  usuario: { nome: string; perfil: string }
}
const labels: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em análise',
  CONCLUIDA: 'Concluída',
  RECUSADA: 'Recusada',
}
export function PrivacyRequestsPage() {
  const requests = useResource<Request[]>('/admin/solicitacoes-exclusao')
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [tomorrow] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy || !selected) return
    const data = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    setFeedback('')
    try {
      const result = await api<{ status: string; retencao: boolean }>(
        `/admin/solicitacoes-exclusao/${selected}/decisao`,
        {
          method: 'POST',
          body: {
            decisao: data.get('decisao'),
            justificativa: data.get('justificativa'),
            ...(data.get('reavaliarEm')
              ? { reavaliarEm: new Date(`${data.get('reavaliarEm')}T12:00:00`).toISOString() }
              : {}),
            confirmarAnalise: data.get('confirmarAnalise') === 'on',
          },
        },
      )
      setFeedback(
        result.status === 'RECUSADA'
          ? 'Resposta registrada e enviada à conta.'
          : `Conta encerrada e sessões revogadas.${result.retencao ? ' Registros sujeitos a retenção foram preservados, com identidade protegida.' : ''}`,
      )
      setSelected(null)
      requests.reload()
    } catch (error) {
      setError(messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="community-page">
      <Intro
        title="Solicitações de privacidade"
        description="Analise os pedidos de encerramento e registre uma resposta fundamentada ao titular."
      />
      {error && <Alert tone="error">{error}</Alert>}
      {feedback && <p role="status">{feedback}</p>}
      {requests.loading && <p role="status">Carregando solicitações…</p>}
      {requests.error && (
        <Alert tone="error">
          {requests.error} <button onClick={requests.reload}>Tentar novamente</button>
        </Alert>
      )}
      {!requests.loading && requests.data?.length === 0 && <p>Nenhuma solicitação recebida.</p>}
      <div className="privacy-requests">
        {requests.data?.map((request) => (
          <section key={request.id} className="hb-pro-card">
            <h2>{request.usuario.nome}</h2>
            <p>
              {labels[request.status]} · Solicitada em{' '}
              {new Date(request.solicitadoEm).toLocaleDateString('pt-BR')}
            </p>
            {request.justificativa && <p>{request.justificativa}</p>}
            {['PENDENTE', 'EM_ANDAMENTO'].includes(request.status) &&
              (selected !== request.id ? (
                <button
                  className="button secondary"
                  onClick={() => {
                    setSelected(request.id)
                    setError('')
                  }}
                >
                  Analisar solicitação
                </button>
              ) : (
                <form onSubmit={(e) => void submit(e)}>
                  <label>
                    Resposta
                    <select name="decisao" required disabled={busy}>
                      <option value="CONCLUIR">Concluir encerramento</option>
                      <option value="RECUSAR">Recusar com justificativa</option>
                    </select>
                  </label>
                  <label>
                    Fundamentação
                    <textarea
                      name="justificativa"
                      minLength={20}
                      maxLength={1000}
                      required
                      disabled={busy}
                    />
                  </label>
                  <p>
                    O encerramento revoga as sessões, cancela consultas futuras e remove o conteúdo
                    público do titular. Registros clínicos e de auditoria permanecem protegidos
                    quando houver obrigação de guarda.
                  </p>
                  <label>
                    Revisar retenção em
                    <input type="date" name="reavaliarEm" min={tomorrow} disabled={busy} />
                  </label>
                  <p className="help">
                    Obrigatório quando houver registros sujeitos a retenção. Esta data agenda uma
                    revisão; não autoriza descarte automático.
                  </p>
                  <label className="checkbox">
                    <input type="checkbox" name="confirmarAnalise" required disabled={busy} />
                    Revisei a identidade do solicitante, a fundamentação e as obrigações de guarda
                    aplicáveis.
                  </label>
                  <div className="actions">
                    <button className="button" disabled={busy}>
                      {busy ? 'Registrando…' : 'Registrar decisão'}
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() => setSelected(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ))}
          </section>
        ))}
      </div>
    </main>
  )
}
