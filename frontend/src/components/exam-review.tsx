import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { api, fileUrl, messageOf } from '../services/api-client'
import { Alert } from './ui'

export type ReviewableExam = {
  id: string
  situacao: string
  nomeOriginal: string
  enviadoEm: string
  motivoReprovacao?: string | null
  avaliadoEm?: string | null
  podeAvaliar?: boolean
}
type BloodType = { id: number; sigla: string }

export function ExamReview({
  exam,
  bloodTypes,
  typesLoading = false,
  typesError = '',
  onRetryTypes,
  onUpdated,
}: {
  exam: ReviewableExam
  bloodTypes: BloodType[]
  typesLoading?: boolean
  typesError?: string
  onRetryTypes: () => void
  onUpdated: () => void
}) {
  const titleId = useId()
  const [decision, setDecision] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [failed, setFailed] = useState(false)
  const pending = exam.situacao === 'EM_ANALISE' && exam.podeAvaliar === true
  const validating = decision === 'VALIDADO'
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !pending || !confirmed || !decision) return
    if (validating && (!bloodType || typesLoading || typesError)) return
    if (!validating && reason.trim().length < 5) return
    setBusy(true)
    setFeedback('')
    setFailed(false)
    try {
      const result = await api<{ mensagem: string }>(`/medico/exames/${exam.id}/avaliacao`, {
        method: 'PATCH',
        body: {
          situacao: decision,
          ...(validating
            ? { tipoSanguineoId: Number(bloodType) }
            : { motivoReprovacao: reason.trim() }),
        },
      })
      setFeedback(result.mensagem)
      setConfirmed(false)
      onUpdated()
    } catch (error) {
      setFailed(true)
      setFeedback(messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="exam-review" aria-labelledby={titleId}>
      <h4 id={titleId}>
        <a href={fileUrl(`/medico/exames/${exam.id}/arquivo`)} target="_blank" rel="noopener noreferrer">
          {exam.nomeOriginal} ↗
        </a>
      </h4>
      <p className="exam-review-state">{exam.situacao.replaceAll('_', ' ')}</p>
      {exam.motivoReprovacao && <p>Motivo: {exam.motivoReprovacao}</p>}
      {exam.avaliadoEm && (
        <p className="muted">
          Avaliado em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(exam.avaliadoEm))}
        </p>
      )}
      {pending && (
        <details className="exam-review-details">
          <summary>Avaliar resultado</summary>
          <p>Abra o arquivo e confira o resultado antes de registrar sua avaliação. A conclusão do cadastro depende de todos os exames solicitados.</p>
          <form onSubmit={submit}>
            <fieldset disabled={busy} className="exam-review-fields">
              <legend>Avaliação deste resultado</legend>
              <label>
                Decisão
                <select required value={decision} onChange={(event) => {
                  setDecision(event.target.value)
                  setConfirmed(false)
                }}>
                  <option value="">Selecione a decisão</option>
                  <option value="VALIDADO">Validar resultado</option>
                  <option value="REPROVADO">Reprovar e solicitar novo envio</option>
                </select>
              </label>
              {validating && (
                <>
                  <label>
                    Tipo sanguíneo confirmado
                    <select required value={bloodType} disabled={typesLoading || !!typesError}
                      onChange={(event) => { setBloodType(event.target.value); setConfirmed(false) }}>
                      <option value="">{typesLoading ? 'Carregando tipos…' : 'Selecione o tipo validado'}</option>
                      {bloodTypes.map((type) => <option key={type.id} value={type.id}>{type.sigla}</option>)}
                    </select>
                  </label>
                  {typesError && (
                    <Alert tone="error">
                      {typesError} <button type="button" className="text-button" onClick={onRetryTypes}>Tentar novamente</button>
                    </Alert>
                  )}
                </>
              )}
              {decision === 'REPROVADO' && (
                <label>
                  Motivo e orientação para novo envio
                  <textarea required minLength={5} maxLength={1000} rows={3} value={reason}
                    onChange={(event) => { setReason(event.target.value); setConfirmed(false) }} />
                </label>
              )}
              <label className="checkbox-row">
                <input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                Revisei o resultado e confirmo a decisão e os dados informados.
              </label>
              <button className={decision === 'REPROVADO' ? 'button destructive' : 'button'}
                disabled={!decision || !confirmed || (validating && (!bloodType || typesLoading || !!typesError))}>
                {busy ? 'Salvando avaliação…' : 'Confirmar avaliação'}
              </button>
            </fieldset>
          </form>
        </details>
      )}
      {feedback && <Alert tone={failed ? 'error' : 'success'}>{feedback}</Alert>}
    </section>
  )
}
