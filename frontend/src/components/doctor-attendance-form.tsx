import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, messageOf } from '../services/api-client'
import { useResource } from '../services/use-resource'

type Attendance = {
  status: string
  observacoes: string | null
  motivoReprovacao: string | null
  cicloAtual: boolean
  podeAtender: boolean
  podeCancelar: boolean
  paciente: { situacao: string; dataNascimento: string; sexo: string; pesoKg: string; usuario: { nome: string } }
  preTriagem: null | {
    versaoQuestionario: string | null
    resultado: string
    respostas: { pergunta: string; resposta: string }[]
  }
}
const ageOf = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  const today = new Date()
  return today.getFullYear() - year - (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day) ? 1 : 0)
}

export function DoctorAttendanceForm({ id, onUpdated }: { id: string; onUpdated: () => void }) {
  const [opened, setOpened] = useState(false)
  return <details onToggle={(event) => { if (event.currentTarget.open) setOpened(true) }}>
    <summary>Abrir atendimento</summary>
    {opened && <DoctorAttendanceFields id={id} onUpdated={onUpdated} />}
  </details>
}

function DoctorAttendanceFields({ id, onUpdated }: { id: string; onUpdated: () => void }) {
  const detail = useResource<Attendance>(`/medico/consultas/${id}`)
  const [observations, setObservations] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [decision, setDecision] = useState('SOLICITAR_EXAMES')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [exams, setExams] = useState('')
  const [instructions, setInstructions] = useState('')
  async function execute(path: string, method: string, body: unknown, message: string) {
    if (busy) return
    setBusy(true)
    setFeedback('')
    try {
      await api(path, { method, body })
      setFeedback(message)
      detail.reload()
      onUpdated()
    } catch (error) {
      setFeedback(messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  function record(event: FormEvent) {
    event.preventDefault()
    void execute(`/medico/consultas/${id}`, 'PATCH', {
      status: 'REALIZADA', observacoes: observations ?? detail.data?.observacoes ?? '', decisao: decision,
      ...(decision === 'REPROVAR' ? { motivoReprovacao: reason } : {}),
    }, 'Atendimento registrado.')
  }
  const data = detail.data
  if (detail.loading) return <p role="status">Carregando atendimento…</p>
  if (detail.error) return <p role="alert">{detail.error} <button className="text-button" onClick={detail.reload}>Tentar novamente</button></p>
  if (!data) return null
  return <div className="attendance-form">
    <p>{data.paciente.usuario.nome} · {ageOf(data.paciente.dataNascimento)} anos · {data.paciente.sexo === 'FEMININO' ? 'Feminino' : 'Masculino'} · {data.paciente.pesoKg} kg</p>
    {data.preTriagem ? <details><summary>Respostas da pré-triagem</summary>
      <dl>{data.preTriagem.respostas.map((answer) => <div key={answer.pergunta}>
        <dt>{answer.pergunta}</dt><dd>{answer.resposta === 'true' ? 'Sim' : answer.resposta === 'false' ? 'Não' : answer.resposta}</dd>
      </div>)}</dl>
      <p>Orientação registrada; a decisão clínica é do médico.</p>
    </details> : <p>Não há pré-triagem vinculada a este atendimento.</p>}
    {!data.cicloAtual && <p>Atendimento histórico. As alterações pertencem à consulta atual.</p>}
    {data.motivoReprovacao && <p>Motivo da inaptidão: {data.motivoReprovacao}</p>}
    {data.podeCancelar && <form onSubmit={(event) => {
      event.preventDefault()
      void execute(`/medico/consultas/${id}/cancelar`, 'POST', { motivo: reason }, 'Consulta cancelada. O paciente será notificado.')
    }}>
      <p>A consulta ainda não começou. É possível cancelar e orientar novo agendamento.</p>
      <label>Motivo do cancelamento<input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={5} maxLength={500} disabled={busy} /></label>
      <button className="button secondary" disabled={busy}>Cancelar consulta e avisar paciente</button>
    </form>}
    {data.podeAtender && <>
      <form onSubmit={record}>
        <label>Observações do atendimento<textarea value={observations ?? data.observacoes ?? ''} onChange={(e) => setObservations(e.target.value)} maxLength={10000} disabled={busy} /></label>
        <label>Encaminhamento<select value={decision} onChange={(e) => setDecision(e.target.value)} disabled={busy}>
          <option value="SOLICITAR_EXAMES">Prosseguir com avaliação e exames</option><option value="REPROVAR">Paciente inapto para doação</option>
        </select></label>
        {decision === 'REPROVAR' && <label>Motivo da inaptidão<textarea value={reason} onChange={(e) => setReason(e.target.value)} required minLength={5} maxLength={2000} disabled={busy} /></label>}
        <button className="button" disabled={busy}>{busy ? 'Salvando…' : data.status === 'REALIZADA' ? 'Salvar observações e decisão' : 'Registrar como realizado'}</button>
      </form>
      {data.status === 'AGENDADA' && <button className="button secondary" disabled={busy} onClick={() => {
        if (window.confirm('Confirmar que o paciente não compareceu? Ele será orientado a agendar novamente.'))
          void execute(`/medico/consultas/${id}`, 'PATCH', { status: 'NAO_COMPARECEU' }, 'Ausência registrada. O paciente será notificado.')
      }}>Registrar ausência</button>}
      {data.status === 'REALIZADA' && <form onSubmit={(event) => {
        event.preventDefault()
        void execute(`/medico/consultas/${id}/solicitar-exames`, 'POST', {
          exames: exams.split('\n').map((v) => v.trim()).filter(Boolean), orientacoes: instructions,
        }, 'Solicitação enviada ao paciente.')
      }}>
        <h4>Solicitar exames</h4>
        <label>Exames (um por linha)<textarea required value={exams} onChange={(e) => setExams(e.target.value)} maxLength={1000} disabled={busy} /></label>
        <label>Orientações<textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={2000} disabled={busy} /></label>
        <button className="button" disabled={busy}>Enviar solicitação</button>
      </form>}
    </>}
    {feedback && <p role="status">{feedback}</p>}
  </div>
}
