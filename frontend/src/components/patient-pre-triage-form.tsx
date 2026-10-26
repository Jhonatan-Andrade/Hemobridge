import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, messageOf } from '../services/api-client'
import { useResource } from '../services/use-resource'
import { Alert } from './ui'

export type PreTriageResult = {
  id: string
  resultado: string
  proximaDataPossivel: string | null
  orientacoes: string[]
}

export function PatientPreTriageForm({ onComplete }: { onComplete: (result: PreTriageResult) => void }) {
  const questionnaire = useResource<{ versao: string }>('/paciente/pre-triagem')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previousDonation, setPreviousDonation] = useState('')
  const [result, setResult] = useState<PreTriageResult>()
  const resultHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (result) resultHeading.current?.focus() }, [result])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !questionnaire.data) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      setResult(await api<PreTriageResult>('/paciente/pre-triagem', {
        method: 'POST',
        body: {
          versao: questionnaire.data.versao,
          pesoKg: Number(form.get('pesoKg')),
          doouAntes: previousDonation === 'sim',
          ...(previousDonation === 'sim' ? { dataUltimaDoacao: form.get('dataUltimaDoacao'), doouAntesDos60: form.get('doouAntesDos60') === 'sim' } : {}),
          condicaoSaudeRequerAvaliacao: form.get('condicaoSaudeRequerAvaliacao') === 'sim',
        },
      }))
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setBusy(false)
    }
  }
  if (result) return <section className="surface form-panel" aria-live="polite">
    <h2 ref={resultHeading} tabIndex={-1}>Orientações antes da consulta</h2>
    {result.orientacoes.map((text) => <p key={text}>{text}</p>)}
    {result.proximaDataPossivel && <p>Próxima data orientativa de doação: {result.proximaDataPossivel.slice(0, 10).split('-').reverse().join('/')}</p>}
    <Alert>Esta orientação não substitui a avaliação médica nem a triagem presencial. Você pode prosseguir com a consulta mesmo durante o intervalo entre doações.</Alert>
    <button className="button" onClick={() => onComplete(result)}>Continuar para os horários</button>
  </section>
  return <section className="surface form-panel">
    <h2>Pré-triagem</h2>
    <p>Confirme estas informações antes de escolher o horário. As respostas ficam na área privada do seu atendimento.</p>
    {questionnaire.loading ? <p>Carregando perguntas…</p> : questionnaire.error ? <Alert tone="error">{questionnaire.error} <button className="text-button" onClick={questionnaire.reload}>Tentar novamente</button></Alert> :
      <form onSubmit={(event) => void submit(event)}>
        <fieldset className="pre-triage-fields" disabled={busy}>
          <label>Peso atual (kg)<input name="pesoKg" type="number" min="1" max="400" step="0.1" required /></label>
          <label>Você já doou sangue?<select required value={previousDonation} onChange={(event) => setPreviousDonation(event.target.value)}><option value="">Selecione</option><option value="sim">Sim</option><option value="nao">Não</option></select></label>
          {previousDonation === 'sim' && <>
            <label>Data da última doação<input required type="date" name="dataUltimaDoacao" max={new Date().toLocaleDateString('en-CA')} /></label>
            <label>Você doou antes dos 60 anos?<select name="doouAntesDos60" required defaultValue=""><option value="">Selecione</option><option value="sim">Sim</option><option value="nao">Não</option></select></label>
          </>}
          <label>Há alguma condição de saúde, sintoma ou uso de medicamento que precisa ser avaliado pelo médico?<select name="condicaoSaudeRequerAvaliacao" required defaultValue=""><option value="">Selecione</option><option value="sim">Sim ou tenho dúvida</option><option value="nao">Não</option></select></label>
          <p className="help">Detalhes clínicos podem ser conversados na consulta. Não publique informações de saúde na comunidade.</p>
          <button className="button" disabled={busy}>{busy ? 'Registrando…' : 'Registrar pré-triagem'}</button>
        </fieldset>
      </form>}
    {error && <Alert tone="error">{error}</Alert>}
  </section>
}
