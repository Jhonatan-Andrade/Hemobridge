import { useState } from 'react'
import { Alert, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'
import type { ProfessionalRole } from '../data/fixtures'
import { BrazilRegionsMap } from './BrazilRegionsMap'
import type { RegionId } from './BrazilRegionsMap'
import './Professional.css'

type ProfessionalSection = 'agenda' | 'attendance' | 'exams' | 'needs' | 'adminMap'
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

const WORKPLACES = [
  { id: 'ponte', name: 'Hospital Ponte Norte' },
  { id: 'horizonte', name: 'Hospital Horizonte' },
  { id: 'vale', name: 'Hospital Vale do Cuidado' },
] as const

const REGIONS: readonly { id: RegionId; name: string; short: string }[] = [
  { id: 'north', name: 'Norte', short: 'N' },
  { id: 'northeast', name: 'Nordeste', short: 'NE' },
  { id: 'centerwest', name: 'Centro-Oeste', short: 'CO' },
  { id: 'southeast', name: 'Sudeste', short: 'SE' },
  { id: 'south', name: 'Sul', short: 'S' },
]

const BLOOD_FILTERS = ['Todos', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'] as const

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
  adminMap: {
    title: 'Mapa de necessidades',
    description: 'Explore como a leitura regional por tipo sanguíneo será organizada quando houver dados institucionais validados.',
    marker: 'Área administrativa',
  },
}

function getSection(route: string, role: ProfessionalRole): ProfessionalSection | null {
  if (route === 'professional/admin' || route === 'professional/admin/map') return 'adminMap'
  if (route === 'professional/attendance') return 'attendance'
  if (route === 'professional/exams') return 'exams'
  if (route === 'professional/needs') return 'needs'
  if (route === 'professional') return role === 'representative' ? 'needs' : role === 'administrator' ? 'adminMap' : 'agenda'
  return null
}

function AgendaPreview({ workplace }: { workplace: string }) {
  const [showTimes, setShowTimes] = useState(false)
  return <div className="hb-pro-agenda-grid">
    <section className="hb-pro-card hb-pro-calendar" aria-labelledby="hb-pro-month-title">
      <div className="hb-pro-card-heading"><h2 id="hb-pro-month-title">Outubro de 2026</h2><span className="hb-pro-caption">Prévia da agenda · {workplace}</span></div>
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

function AdminMapPreview() {
  const [region, setRegion] = useState<RegionId | 'all'>('all')
  const [bloodType, setBloodType] = useState<(typeof BLOOD_FILTERS)[number]>('Todos')
  const regionName = region === 'all' ? 'todas as regiões' : REGIONS.find((item) => item.id === region)?.name ?? 'região selecionada'

  return <>
    <Alert tone="warning">Ainda não há dados regionais de estoque ou necessidade verificados nesta interface. O contorno cartográfico vem do IBGE; nenhuma cor indica urgência real.</Alert>
    <div className="hb-pro-map-filters">
      <div className="hb-pro-filter-copy"><strong>Leitura por território</strong><p>Selecione uma região e um tipo sanguíneo para ver o estado da informação.</p></div>
      <label htmlFor="hb-pro-blood-filter">Tipo sanguíneo
        <select id="hb-pro-blood-filter" value={bloodType} onChange={(event) => setBloodType(event.target.value as (typeof BLOOD_FILTERS)[number])}>
          {BLOOD_FILTERS.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
    </div>
    <div className="hb-pro-map-layout">
      <section className="hb-pro-card hb-pro-map-card" aria-labelledby="hb-pro-map-title">
        <div className="hb-pro-card-heading"><h2 id="hb-pro-map-title">Brasil por região</h2><span className="hb-pro-caption">Malha cartográfica simplificada do IBGE</span></div>
        <BrazilRegionsMap selected={region} onSelect={setRegion} />
        <p className="hb-pro-map-key"><span aria-hidden="true" /> Regiões sem dados verificados · sem classificação de prioridade. Cartografia simplificada: <a href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3" target="_blank" rel="noopener noreferrer">IBGE</a>.</p>
      </section>
      <section className="hb-pro-card hb-pro-map-detail" aria-labelledby="hb-pro-map-detail-title">
        <div className="hb-pro-card-heading"><h2 id="hb-pro-map-detail-title">Detalhe da seleção</h2></div>
        <button className="hb-pro-all-regions" type="button" onClick={() => setRegion('all')} aria-pressed={region === 'all'}>Todas as regiões</button>
        <div className="hb-pro-data-empty" role="status" aria-live="polite">
          <span className="hb-pro-data-icon" aria-hidden="true">—</span>
          <strong>Sem dados verificados</strong>
          <p>{bloodType === 'Todos' ? 'Todos os tipos sanguíneos' : `Tipo ${bloodType}`} · {regionName}. Não é possível apontar a região com maior necessidade.</p>
        </div>
        <div className="hb-pro-source-note">
          <h3>Para ativar a leitura regional</h3>
          <p>Será necessária uma fonte autorizada de cada serviço de hemoterapia, com tipo sanguíneo, região atendida, critério de prioridade e data de atualização. Endereço de hospital não informa estoque de sangue.</p>
        </div>
      </section>
    </div>
  </>
}

export function ProfessionalPage({ route, navigate, role = 'doctor' }: { route: string; navigate: Navigate; role?: ProfessionalRole }) {
  const [workplaceId, setWorkplaceId] = useState<(typeof WORKPLACES)[number]['id']>('ponte')
  const workplace = WORKPLACES.find((item) => item.id === workplaceId)?.name ?? WORKPLACES[0].name
  const section = getSection(route, role)
  const allowed = role === 'doctor' ? section !== null && section !== 'needs' && section !== 'adminMap' : role === 'representative' ? section === 'needs' : section === 'adminMap'
  const panel = allowed && section ? PANELS[section] : null
  const returnRoute = role === 'representative' ? 'professional/needs' : role === 'doctor' ? 'professional' : role === 'administrator' ? 'professional/admin' : 'home'
  return <div className="hb-pro">
    <main className="hb-pro-main">
      {panel && section ? <><p className="eyebrow">{panel.marker}</p><h1 tabIndex={-1}>{panel.title}</h1><p className="hb-pro-intro">{panel.description}</p>
        {role === 'doctor' && <div className="hb-pro-workplace">
          <div><label htmlFor="hb-pro-workplace-select">Instituição de atuação</label><select id="hb-pro-workplace-select" value={workplaceId} onChange={(event) => setWorkplaceId(event.target.value as (typeof WORKPLACES)[number]['id'])}>{WORKPLACES.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
          <p>Hospitais fictícios. A escolha organiza apenas esta prévia local; não altera agenda, atendimento, exames ou dados de pacientes.</p>
        </div>}
        {section === 'agenda' && <AgendaPreview workplace={workplace} />}{section === 'attendance' && <AttendancePreview />}{section === 'exams' && <ExamPreview />}{section === 'needs' && <NeedsPreview />}{section === 'adminMap' && <AdminMapPreview />}</>
          : <><p className="eyebrow">Acesso por perfil</p><h1 tabIndex={-1}>Área indisponível para este perfil</h1><Alert tone="warning">Este perfil não tem acesso a esta área na interface. A autorização definitiva será verificada pelo servidor.</Alert><RouteLink className="button secondary hb-pro-return" to={returnRoute} navigate={navigate}>Voltar à minha área</RouteLink></>}
    </main>
  </div>
}
