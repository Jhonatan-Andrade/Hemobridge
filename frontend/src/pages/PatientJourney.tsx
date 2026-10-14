import { useState } from 'react'
import type { ReactNode } from 'react'
import type { DemoResponse, PatientStatus } from '../data/fixtures'
import { demoJourneyNotifications } from '../data/patientJourneyFixtures'
import type { JourneyNotification } from '../data/patientJourneyFixtures'
import { Alert, Intro, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'
import './PatientJourney.css'

type Props = {
  route: string
  navigate: Navigate
  status: PatientStatus
  response: DemoResponse
  notifications?: readonly JourneyNotification[]
  onMarkNotification?: (id?: string) => void
}

const stages = [
  { to: 'external-P03', label: 'Pré-triagem e horários', code: 'P03' },
  { to: 'external-P04', label: 'Minhas consultas', code: 'P04' },
  { to: 'external-P05', label: 'Meus exames', code: 'P05' },
  { to: 'external-P06', label: 'Notificações', code: 'P06' },
  { to: 'external-P08', label: 'Locais recomendados', code: 'P08' },
] as const

function JourneyShell({ route, navigate, children }: { route: string; navigate: Navigate; children: ReactNode }) {
  return <main className="content hb-journey-content">
        {children}
        <nav className="hb-journey-stage-nav" aria-label="Etapas do acompanhamento">
          {stages.map((stage) => <RouteLink key={stage.code} to={stage.to} navigate={navigate} aria-current={route === stage.to ? 'page' : undefined}><span>{stage.code}</span>{stage.label}</RouteLink>)}
        </nav>
        <RouteLink className="button secondary hb-journey-back" to="dashboard" navigate={navigate}>Voltar ao painel</RouteLink>
  </main>
}

function PreviewState({ response, empty }: { response: DemoResponse; empty: string }) {
  if (response === 'loading') return <section className="surface state-panel" aria-busy="true"><span className="spinner" aria-hidden="true" /><p>Carregando a visualização…</p></section>
  if (response === 'loadError') return <section className="surface state-panel"><Alert tone="error">Não foi possível carregar esta visualização. Nenhum dado foi alterado.</Alert><p>Confira o estado selecionado nos controles de revisão.</p></section>
  return <section className="surface state-panel"><p className="empty">{empty}</p></section>
}

function TriageQuestion({ number, title, name, options = ['Sim', 'Não', 'Não se aplica'] }: { number: number; title: string; name: string; options?: readonly string[] }) {
  return <fieldset className="surface hb-journey-question"><legend>{number}. {title}</legend><div className="hb-journey-options">{options.map((option) => <label key={option}><input type="radio" name={name} value={option} />{option}</label>)}</div></fieldset>
}

function PreTriage({ navigate }: { navigate: Navigate }) {
  return <>
    <Intro title="P03 · Pré-triagem orientativa" description="Revise as perguntas e veja como a etapa de horários poderá aparecer." />
    <Alert tone="warning">Use apenas respostas de teste. Estas perguntas não determinam aptidão nem enviam dados; a triagem cabe ao hemocentro.</Alert>
    <div className="hb-journey-progress" aria-label="Etapa 1 de 2"><span aria-current="step">1 · Orientações</span><span>2 · Escolha de horário</span></div>
    <section className="hb-journey-questions" aria-label="Perguntas orientativas">
      <div className="surface hb-journey-question"><label htmlFor="journey-weight">1. Peso de teste (kg)</label><input id="journey-weight" type="number" min="0" step="0.1" inputMode="decimal" /></div>
      <TriageQuestion number={2} title="Houve doação de sangue nos últimos 12 meses?" name="journey-recent" options={['Sim', 'Não']} />
      <div className="surface hb-journey-question"><label htmlFor="journey-last-donation">3. Se sim, data de teste da doação mais recente</label><input id="journey-last-donation" type="date" /><p>Nenhum intervalo é calculado nesta página.</p></div>
      <div className="surface hb-journey-question"><label htmlFor="journey-count">4. Quantas doações nos últimos 12 meses? Use um número de teste.</label><input id="journey-count" type="number" min="0" step="1" inputMode="numeric" /></div>
      <TriageQuestion number={5} title="Se a pessoa tem 16 ou 17 anos, possui autorização do responsável?" name="journey-minor" />
      <TriageQuestion number={6} title="Se a pessoa tem de 61 a 69 anos, doou sangue antes dos 60?" name="journey-older" />
      <div className="surface hb-journey-question"><label className="hb-journey-ack"><input type="checkbox" />7. Entendo que esta pré-triagem é apenas orientativa e não substitui a triagem do hemocentro.</label></div>
    </section>
    <RouteLink className="button hb-journey-next" to="external-booking" navigate={navigate}>Ver etapa de horários</RouteLink>
  </>
}

const previewAppointments = [
  { id: 'manha', professional: 'Profissional a definir', day: '12/11/2026', time: '10h' },
  { id: 'tarde', professional: 'Profissional a definir', day: '13/11/2026', time: '14h' },
] as const

function Booking({ navigate }: { navigate: Navigate }) {
  const [selected, setSelected] = useState<string | null>(null)
  return <>
    <Intro title="P03 · Escolha de horário" description="Visualização prevista após as orientações iniciais." />
    <Alert tone="warning">Nenhuma agenda foi consultada. As opções abaixo mostram a disposição dos horários; a escolha não bloqueia nem confirma uma consulta.</Alert>
    <div className="hb-journey-progress" aria-label="Etapa 2 de 2"><span>1 · Orientações</span><span aria-current="step">2 · Escolha de horário</span></div>
    <section className="surface card hb-journey-booking"><h2>Escolha de horário</h2><p>Selecione um cartão para conhecer esta etapa.</p>
      <div className="hb-journey-slot-grid" role="group" aria-label="Horários apresentados para orientação">
        {previewAppointments.map((slot) => <button key={slot.id} type="button" aria-pressed={selected === slot.id} onClick={() => setSelected(slot.id)}><strong>{slot.professional}</strong><span>{slot.day}</span><b>{slot.time}</b></button>)}
      </div>
      <p role="status">{selected ? 'Horário selecionado nesta tela. A confirmação está indisponível.' : 'Nenhum horário selecionado.'}</p>
      <button className="button" type="button" disabled>Confirmar consulta · indisponível</button>
    </section>
    <div className="hb-journey-actions"><RouteLink className="button secondary" to="external-P03" navigate={navigate}>Voltar às orientações</RouteLink><RouteLink className="button secondary" to="external-P04" navigate={navigate}>Ver acompanhamento</RouteLink></div>
  </>
}

function Consultations({ status, response }: { status: PatientStatus; response: DemoResponse }) {
  const showExample = status === 'CONSULTA_AGENDADA' && response !== 'empty'
  return <>
    <Intro title="P04 · Minhas consultas" description="Acompanhe datas, acesso à sala e alterações de agenda." />
    <Alert tone="warning">Nenhuma consulta foi buscada. Datas, link, cancelamento e reagendamento estarão disponíveis quando a agenda estiver integrada.</Alert>
    {response === 'loading' || response === 'loadError' ? <PreviewState response={response} empty="" /> : showExample ? <div className="hb-journey-card-grid">
      <section className="surface card"><span className="eyebrow">Dados da consulta</span><h2>12 de novembro · 10h</h2><p>Unidade de referência · Profissional de referência. Não há reserva associada a este cartão.</p></section>
      <section className="surface card"><h2>Link da teleconsulta</h2><p>O acesso deverá aparecer somente ao titular na janela permitida pela regra confirmada. Não há sala criada nesta prévia.</p><button className="button secondary" type="button" disabled>Abrir sala · indisponível</button></section>
      <section className="surface card"><h2>Cancelar ou reagendar</h2><p>Prazo, disponibilidade e confirmação serão verificados pelo servidor antes de qualquer alteração.</p><div className="hb-journey-actions"><button className="button secondary" type="button" disabled>Reagendar · indisponível</button><button className="button secondary" type="button" disabled>Cancelar · indisponível</button></div></section>
    </div> : <PreviewState response={response} empty="Nenhuma consulta futura nesta visualização." />}
  </>
}

function Exams({ status, response }: { status: PatientStatus; response: DemoResponse }) {
  const title = status === 'REPROVADO_EXAME' ? 'Reenvio após avaliação' : status === 'EM_ANALISE' ? 'Em análise' : 'Solicitação de exame'
  return <>
    <Intro title="P05 · Meus exames" description="Solicitações, envio e acompanhamento de exames." />
    <Alert tone="warning">Nenhum exame foi consultado ou enviado. Não selecione nem compartilhe arquivos reais nesta etapa.</Alert>
    {response === 'loading' || response === 'loadError' || response === 'empty' ? <PreviewState response={response} empty="Nenhuma solicitação de exame disponível." /> : <div className="hb-journey-card-grid">
      <section className="surface card"><span className="eyebrow">Acompanhamento</span><h2>{title}</h2><p>{status === 'REPROVADO_EXAME' ? 'A orientação do profissional aparecerá aqui após validação. Nenhum motivo clínico foi carregado.' : status === 'EM_ANALISE' ? 'O envio aguardaria revisão. Nenhum arquivo é acompanhado nesta tela.' : 'A solicitação do profissional e suas orientações aparecerão aqui.'}</p></section>
      <section className="surface card"><h2>Envio de arquivo</h2><p>A solicitação informará os formatos aceitos. O envio só será concluído após confirmação de recebimento.</p><button className="button secondary" type="button" disabled>Enviar exame · indisponível</button></section>
    </div>}
  </>
}

function Notifications({ response, notifications, onMarkNotification, navigate }: { response: DemoResponse; notifications: readonly JourneyNotification[]; onMarkNotification: (id?: string) => void; navigate: Navigate }) {
  const unread = notifications.filter((item) => !item.read).length
  return <>
    <Intro title="P06 · Notificações" description="Acompanhe avisos e seus estados de leitura." />
    <Alert tone="warning">Marcar como lido altera apenas esta sessão; nenhuma mensagem é enviada ou modificada no serviço.</Alert>
    {response === 'loading' || response === 'loadError' || response === 'empty' ? <PreviewState response={response} empty="Nenhuma notificação disponível." /> : <>
      <div className="hb-journey-notification-tools"><p role="status">{unread} {unread === 1 ? 'não lida' : 'não lidas'}</p><button className="button secondary" type="button" disabled={unread === 0} onClick={() => onMarkNotification()}>Marcar todas como lidas</button></div>
      <div className="hb-journey-card-grid">{notifications.map((item) => <article key={item.id} className={`surface card hb-journey-notification${item.read ? '' : ' is-unread'}`}><span className="eyebrow">{item.read ? 'Lida' : 'Não lida'} · {item.date}</span><h2>{item.title}</h2><p>{item.summary}</p><RouteLink className="button secondary" to={item.destination} navigate={(target, options) => { onMarkNotification(item.id); navigate(target, options) }}>Abrir etapa relacionada</RouteLink></article>)}</div>
    </>}
  </>
}

function Locations({ status, response }: { status: PatientStatus; response: DemoResponse }) {
  return <>
    <Intro title="P08 · Locais recomendados" description="Saiba como serão apresentados os locais após aprovação." />
    <Alert tone="warning">Não calculamos compatibilidade, elegibilidade, data possível nem prioridade de hospitais. Nenhum estoque real foi consultado. A aprovação do cadastro não substitui a triagem do hemocentro.</Alert>
    {status !== 'APROVADO' ? <PreviewState response="empty" empty="Recomendações personalizadas ficam disponíveis somente após aprovação pela equipe." /> : response === 'loading' || response === 'loadError' ? <PreviewState response={response} empty="" /> : <div className="hb-journey-card-grid">
      <section className="surface card"><h2>Tipo sanguíneo</h2><p>Será definido pela equipe após validação. Nenhum tipo clínico é inferido nesta tela.</p></section>
      <section className="surface card"><h2>Próxima data possível</h2><p>Indisponível sem histórico e regra clínica confirmada; sempre sujeita à triagem no local.</p></section>
      <section className="surface card"><h2>Locais</h2><p>{response === 'empty' ? 'Nenhum local recomendado nesta visualização.' : 'A lista dependerá de necessidades verificadas e de critérios aprovados pela equipe.'}</p></section>
    </div>}
  </>
}

export function PatientJourneyPage({ route, navigate, status, response, notifications, onMarkNotification }: Props) {
  const [localNotifications, setLocalNotifications] = useState<JourneyNotification[]>(() => demoJourneyNotifications.map((item) => ({ ...item })))
  const shownNotifications = notifications ?? localNotifications
  const mark = (id?: string) => {
    if (onMarkNotification) { onMarkNotification(id); return }
    setLocalNotifications((current) => current.map((item) => !id || item.id === id ? { ...item, read: true } : item))
  }
  const content = route === 'external-P03' ? <PreTriage navigate={navigate} />
    : route === 'external-booking' ? <Booking navigate={navigate} />
      : route === 'external-P04' ? <Consultations status={status} response={response} />
        : route === 'external-P05' ? <Exams status={status} response={response} />
          : route === 'external-P06' ? <Notifications response={response} notifications={shownNotifications} onMarkNotification={mark} navigate={navigate} />
            : route === 'external-P08' ? <Locations status={status} response={response} />
              : <><Intro title="Etapa indisponível" description="Este destino ainda não está disponível." /><Alert>Nenhuma ação clínica ou operacional foi executada.</Alert></>
  return <JourneyShell route={route} navigate={navigate}>{content}</JourneyShell>
}
