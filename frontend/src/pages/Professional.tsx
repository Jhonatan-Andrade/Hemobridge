import { useState } from 'react'
import { Alert, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'
import type { ProfessionalRole } from '../data/fixtures'
import './Professional.css'

type ProfessionalSection = 'agenda' | 'attendance' | 'exams' | 'needs'
type NeedLevel = 'critical' | 'low' | 'stable' | 'adequate' | 'unknown'

interface NeedExample {
  bloodType: string
  level: NeedLevel
}

interface TimeExample {
  date: string
  time: string
}

const NEED_LABELS: Record<NeedLevel, string> = {
  critical: 'Crítico', low: 'Baixo', stable: 'Estável',
  adequate: 'Adequado', unknown: 'Não informado',
}

// Valores editoriais do quadro H02 do Figma. Não são dados de hospital nem de paciente.
const NEED_EXAMPLES: readonly NeedExample[] = [
  { bloodType: 'A+', level: 'critical' },
  { bloodType: 'A−', level: 'low' },
  { bloodType: 'B+', level: 'stable' },
  { bloodType: 'B−', level: 'adequate' },
  { bloodType: 'AB+', level: 'unknown' },
  { bloodType: 'AB−', level: 'low' },
  { bloodType: 'O+', level: 'stable' },
  { bloodType: 'O−', level: 'unknown' },
]

const TIME_EXAMPLES: readonly TimeExample[] = [
  { date: '12/11/2026', time: '10h' },
  { date: '12/11/2026', time: '10h30' },
  { date: '13/11/2026', time: '14h' },
]

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const FIRST_WEEKDAY = (new Date(Date.UTC(2026, 9, 1)).getUTCDay() + 6) % 7
const MONTH_CELLS: readonly (number | null)[] = Array.from({ length: 35 }, (_, index) => {
  const day = index - FIRST_WEEKDAY + 1
  return day >= 1 && day <= 31 ? day : null
})
const MONTH_WEEKS = Array.from({ length: 5 }, (_, index) => MONTH_CELLS.slice(index * 7, index * 7 + 7))

const PANELS: Record<ProfessionalSection, { title: string; description: string; marker: string }> = {
  agenda: {
    title: 'Minha agenda',
    description: 'Veja o calendário e como os horários de teleconsulta serão organizados.',
    marker: 'M01 · Área do médico',
  },
  attendance: {
    title: 'Atendimento',
    description: 'Informações e ações previstas para a consulta profissional.',
    marker: 'M02 · Área do médico',
  },
  exams: {
    title: 'Exames e validação',
    description: 'Solicitação, revisão e decisão sobre exames.',
    marker: 'M03 · Área do médico',
  },
  needs: {
    title: 'Necessidades do banco de sangue',
    description: 'Visão do representante de hospital, separada da área médica.',
    marker: 'H02 · Visão do hospital',
  },
}

function getSection(route: string, role: ProfessionalRole): ProfessionalSection | null {
  if (route === 'professional/attendance') return 'attendance'
  if (route === 'professional/exams') return 'exams'
  if (route === 'professional/needs') return 'needs'
  if (route === 'professional') return role === 'representative' ? 'needs' : 'agenda'
  return null
}

function AgendaPreview() {
  const [showTimes, setShowTimes] = useState(false)
  return <div className="hb-pro-agenda-grid">
    <section className="hb-pro-card hb-pro-calendar" aria-labelledby="hb-pro-month-title">
      <div className="hb-pro-card-heading"><h2 id="hb-pro-month-title">Outubro de 2026</h2><span className="hb-pro-caption">Minha agenda</span></div>
      <p className="hb-pro-mobile-summary">Este calendário não mostra disponibilidade nem reservas reais.</p>
      <div className="hb-pro-calendar-scroll"><table>
        <caption className="sr-only">Calendário de outubro de 2026, de segunda a domingo. Nenhuma disponibilidade foi consultada.</caption>
        <thead><tr>{WEEKDAYS.map((name) => <th scope="col" key={name}>{name}</th>)}</tr></thead>
        <tbody>{MONTH_WEEKS.map((week, weekIndex) => <tr key={weekIndex}>{week.map((day, column) => <td key={`${weekIndex}-${column}`}>
          {day ? <div className="hb-pro-day"><strong>{String(day).padStart(2, '0')}</strong></div> : <div className="hb-pro-day is-outside" aria-hidden="true">—</div>}
        </td>)}</tr>)}</tbody>
      </table></div>
      <p className="hb-pro-caption">A disponibilidade será mostrada após a integração com a agenda.</p>
    </section>
    <section className="hb-pro-card hb-pro-schedule" aria-labelledby="hb-pro-schedule-title">
      <h2 id="hb-pro-schedule-title">Gerar horários</h2>
      <p>Definir intervalos e publicar disponibilidade dependerá da integração com a agenda da equipe.</p>
      <div className="hb-pro-fields" aria-label="Campos de disponibilidade ainda indisponíveis">
        <label>Data<input type="text" readOnly value="A definir pela integração" /></label>
        <div className="hb-pro-field-pair"><label>Hora inicial<input type="text" readOnly value="A definir" /></label><label>Hora final<input type="text" readOnly value="A definir" /></label></div>
      </div>
      <div className="hb-pro-link-state"><strong>Link da teleconsulta</strong><p>Indisponível. Um link só poderá aparecer após criação real e autorização do horário.</p></div>
      <button className="button" type="button" aria-expanded={showTimes} aria-controls="hb-pro-example-times" onClick={() => setShowTimes((current) => !current)}>{showTimes ? 'Ocultar estrutura dos horários' : 'Ver estrutura dos horários'}</button>
      {showTimes && <div id="hb-pro-example-times" className="hb-pro-examples" role="region" aria-label="Estrutura dos horários">
        <strong>Sem disponibilidade consultada</strong>
        <ul>{TIME_EXAMPLES.map((item) => <li key={`${item.date}-${item.time}`}>{item.date} · {item.time}</li>)}</ul>
        <p>Nenhum horário ou link foi gerado. Não é possível marcar consulta nesta prévia.</p>
      </div>}
    </section>
  </div>
}

function AttendancePreview() {
  return <div className="hb-pro-panel-grid">
    <section className="hb-pro-card"><h2>Paciente</h2><p>Identificação protegida. Nenhuma pessoa ou consulta real é exibida.</p><span className="hb-pro-placeholder">Dados indisponíveis · acesso autorizado necessário</span></section>
    <section className="hb-pro-card"><h2>Pré-triagem</h2><p>Respostas e contexto só poderão ser consultados por profissional autorizado.</p><span className="hb-pro-placeholder">Pré-triagem indisponível</span></section>
    <section className="hb-pro-card"><h2>Desfecho</h2><p>Os campos, critérios clínicos e decisões precisam de definição da equipe.</p><span className="hb-pro-placeholder">Aguardando critérios</span></section>
    <section className="hb-pro-card"><h2>Solicitação de exames</h2><p>Tipos de exame, justificativa, autoria e registro dependem do contrato clínico aprovado.</p><span className="hb-pro-placeholder">Nenhum exame solicitado</span></section>
    <div className="hb-pro-panel-footer"><button className="button" type="button" disabled>Registrar atendimento · indisponível</button><p>Nenhum atendimento é salvo nesta prévia.</p></div>
  </div>
}

function ExamPreview() {
  return <div className="hb-pro-panel-grid">
    <section className="hb-pro-card"><h2>Solicitações</h2><p>Nenhuma solicitação foi consultada.</p><span className="hb-pro-placeholder">Sem registros disponíveis</span></section>
    <section className="hb-pro-card"><h2>Exame</h2><p>Arquivo, origem e resultado exigem acesso restrito ao profissional responsável.</p><span className="hb-pro-placeholder">Dados indisponíveis</span></section>
    <section className="hb-pro-card"><h2>Tipo sanguíneo</h2><p>Não atribua um tipo sem exame validado e confirmação autorizada.</p><span className="hb-pro-placeholder">Tipo não confirmado</span></section>
    <section className="hb-pro-card"><h2>Validação</h2><p>Critérios, motivo e autoria da decisão ainda precisam ser confirmados.</p><span className="hb-pro-placeholder">Aguardando critérios</span></section>
    <div className="hb-pro-panel-footer"><button className="button" type="button" disabled>Aprovar exame · indisponível</button><button className="button secondary" type="button" disabled>Reprovar exame · indisponível</button><p>Nenhuma decisão clínica ou alteração de tipo sanguíneo é registrada.</p></div>
  </div>
}

function NeedsPreview() {
  return <>
    <Alert tone="warning">Nenhum nível foi consultado em um hospital. As classificações abaixo não representam estoque nem prioridade real; o acesso de representantes depende de autorização própria.</Alert>
    <section className="hb-pro-card hb-pro-needs" aria-labelledby="hb-pro-needs-title">
      <div className="hb-pro-card-heading"><h2 id="hb-pro-needs-title">Nível por tipo sanguíneo</h2><span className="hb-pro-caption">Oito tipos sanguíneos</span></div>
      <ul>{NEED_EXAMPLES.map(({ bloodType, level }) => <li key={bloodType}><strong>{bloodType}</strong><span className={`hb-pro-need-level is-${level}`}>{NEED_LABELS[level]}</span></li>)}</ul>
      <p className="hb-pro-caption">Nenhuma necessidade foi consultada ou atualizada. Histórico e edição dependem de perfil e contrato aprovados.</p>
    </section>
  </>
}

export function ProfessionalPage({ route, navigate, role = 'doctor' }: { route: string; navigate: Navigate; role?: ProfessionalRole }) {
  const section = getSection(route, role)
  const allowed = role === 'doctor' ? section !== null && section !== 'needs' : role === 'representative' ? section === 'needs' : false
  const panel = allowed && section ? PANELS[section] : null
  const returnRoute = role === 'representative' ? 'professional/needs' : role === 'doctor' ? 'professional' : 'home'
  return <div className="hb-pro">
    <main className="hb-pro-main">
      {role === 'administrator' ? <><p className="eyebrow">Administração</p><h1 tabIndex={-1}>Área administrativa em preparação</h1><p className="hb-pro-intro">As funções e permissões administrativas ainda precisam ser definidas.</p><Alert tone="warning">Nenhum usuário, instituição, aprovação ou relatório é consultado ou alterado aqui.</Alert><RouteLink className="button secondary hb-pro-return" to="home" navigate={navigate}>Voltar ao início</RouteLink></>
        : panel && section ? <><p className="eyebrow">{panel.marker}</p><h1 tabIndex={-1}>{panel.title}</h1><p className="hb-pro-intro">{panel.description}</p>{section === 'agenda' && <AgendaPreview />}{section === 'attendance' && <AttendancePreview />}{section === 'exams' && <ExamPreview />}{section === 'needs' && <NeedsPreview />}</>
          : <><p className="eyebrow">Acesso por perfil</p><h1 tabIndex={-1}>Área indisponível para este perfil</h1><Alert tone="warning">Este perfil não tem acesso a esta área na interface. A autorização definitiva será verificada pelo servidor.</Alert><RouteLink className="button secondary hb-pro-return" to={returnRoute} navigate={navigate}>Voltar à minha área</RouteLink></>}
    </main>
  </div>
}
