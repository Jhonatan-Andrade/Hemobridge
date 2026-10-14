import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Identity, ProfessionalRole } from '../data/fixtures'
import type { Navigate } from './ui'
import './GuidedTour.css'

type Step = {
  title: string
  explanation: string
  example: string
  previewTitle: string
  previewText: string
  route?: string
  routeLabel?: string
  viewRoute?: string
  target?: Record<string, string>
}

const visitorSteps: Step[] = [
  {
    title: 'Conheça o HemoBridge',
    explanation: 'A página inicial apresenta o percurso. A comunidade pode ser lida sem criar conta.',
    example: 'Antes de informar seus dados, conheça as etapas e leia as conversas da comunidade.',
    previewTitle: 'Início', previewText: 'Pré-cadastro → acompanhamento → orientação para consulta',
    viewRoute: 'home',
    target: { home: '.home-hero h1' },
  },
  {
    title: 'Faça o pré-cadastro',
    explanation: 'Aqui você informa os dados para iniciar o processo. Após o envio, a confirmação orienta a entrada; ela não inicia uma sessão automaticamente.',
    example: 'Confira seus dados de contato antes de avançar; o envio só estará disponível com o serviço conectado.',
    previewTitle: 'T02 · Pré-cadastro', previewText: 'Dados pessoais e aviso antes de continuar',
    route: 'register', routeLabel: 'Abrir pré-cadastro',
    viewRoute: 'register',
    target: { home: '.home-actions a[href="#register"]', register: '.auth-layout .form-panel h1' },
  },
  {
    title: 'Confirme e entre',
    explanation: 'Depois da confirmação, T01 é a entrada. O perfil será definido pela sessão real quando houver integração.',
    example: 'A confirmação orienta a entrada. Percorrer o tour não cria uma conta.',
    previewTitle: 'Confirmação → entrada', previewText: 'A confirmação orienta a entrar; não cria uma sessão automaticamente',
    route: 'login', routeLabel: 'Abrir entrada',
    viewRoute: 'register',
    target: { register: '.auth-layout .form-panel form button[type="submit"]' },
  },
  {
    title: 'Acompanhe sua situação',
    explanation: 'No futuro painel do paciente, a situação e o próximo passo dependerão dos dados autorizados pela equipe.',
    example: 'A situação “Pré-cadastrado” aponta a etapa seguinte de acompanhamento.',
    previewTitle: 'P01 · Meu painel', previewText: 'Situação: pré-cadastrado · próximo passo: consulta',
    viewRoute: 'home',
  },
  {
    title: 'Pré-triagem e horário',
    explanation: 'P03 apresenta perguntas orientativas e uma prévia de horários. Respostas não determinam aptidão, e nenhuma escolha vira reserva.',
    example: 'Uma opção de horário só vira reserva após confirmação pelo serviço de agenda.',
    previewTitle: 'P03 · Orientação', previewText: 'Perguntas → horários disponíveis → confirmação',
    viewRoute: 'home',
  },
  {
    title: 'Acompanhe a consulta',
    explanation: 'P04 deverá mostrar uma consulta realmente agendada e seu link apenas ao titular, quando a agenda estiver integrada.',
    example: 'Após uma reserva confirmada, a data e o acesso autorizado aparecerão neste espaço.',
    previewTitle: 'P04 · Minhas consultas', previewText: 'Data → link autorizado → acompanhamento',
    viewRoute: 'home',
  },
  {
    title: 'Calendário do médico',
    explanation: 'A área médica tem uma prévia de calendário, atendimento e exames. Horários e decisões dependem de autorização e serviços da equipe.',
    example: 'O calendário mostrará horários quando a equipe os publicar.',
    previewTitle: 'M01 · Agenda médica', previewText: 'Disponibilidade e atendimento sob responsabilidade profissional',
    viewRoute: 'home',
  },
  {
    title: 'Necessidades do hospital',
    explanation: 'Um representante autorizado terá sua própria visão das necessidades do banco por tipo sanguíneo. O médico não recebe essa permissão automaticamente.',
    example: 'Cada nível deverá vir de uma fonte hospitalar autorizada.',
    previewTitle: 'H02 · Banco de sangue', previewText: 'Necessidades por tipo · atualização autorizada',
    viewRoute: 'home',
  },
]

const patientSteps: Step[] = [
  {
    title: 'Seu painel',
    explanation: 'Aqui ficam a situação, o próximo passo e, quando existir, a consulta retornada pela equipe.',
    example: 'A situação “Pré-cadastrado” indica que a etapa de consulta ainda está por vir.',
    previewTitle: 'P01 · Meu painel', previewText: 'Situação e orientação em um só lugar',
    route: 'dashboard', routeLabel: 'Abrir meu painel',
    viewRoute: 'dashboard',
    target: { dashboard: '.status-card .status-title' },
  },
  {
    title: 'Próximo passo',
    explanation: 'O cartão orienta o que fazer conforme a situação. Uma prévia visual não reserva horário.',
    example: '“Agendar consulta” abre a etapa de horários; a escolha ainda exige confirmação.',
    previewTitle: 'Orientação', previewText: 'A etapa de consulta depende da agenda integrada',
    viewRoute: 'dashboard',
    target: { dashboard: '.next-step h2' },
  },
  {
    title: 'Pré-triagem orientativa',
    explanation: 'Revise as perguntas antes de conhecer os horários. As respostas não determinam aptidão; a triagem cabe ao hemocentro.',
    example: 'Confira as perguntas e o aviso antes de avançar. Nenhuma resposta é enviada nesta etapa.',
    previewTitle: 'P03 · Orientações', previewText: 'Perguntas → aviso → horários',
    route: 'external-P03', routeLabel: 'Abrir pré-triagem',
    viewRoute: 'external-P03',
    target: { 'external-P03': '.hb-journey-questions .hb-journey-question:first-child' },
  },
  {
    title: 'Escolha de horário',
    explanation: 'Conheça como os horários serão apresentados. A escolha nesta prévia não cria nem confirma uma reserva.',
    example: 'Data, horário e profissional serão mostrados quando houver disponibilidade publicada.',
    previewTitle: 'P03 · Horários', previewText: 'Orientação → opções → confirmação futura',
    viewRoute: 'external-booking',
    target: { 'external-booking': '.hb-journey-booking h2' },
  },
  {
    title: 'Minhas consultas',
    explanation: 'Quando houver uma reserva integrada, este espaço reunirá data, acesso autorizado à sala e opções de acompanhamento.',
    example: 'Antes da consulta, confira data e orientações. Alterações dependem de confirmação da agenda.',
    previewTitle: 'P04 · Minhas consultas', previewText: 'Data → acesso autorizado → acompanhamento',
    viewRoute: 'external-P04',
    target: { 'external-P04': '.hb-journey-content .state-panel .empty, .hb-journey-content .hb-journey-card-grid .card:first-child h2' },
  },
  {
    title: 'Perfil e privacidade',
    explanation: 'Consulte os dados de conta e as preferências. A persistência das alterações depende da integração de conta.',
    example: 'Revise telefone e cidade antes de solicitar alterações no perfil.',
    previewTitle: 'P02 · Perfil', previewText: 'Dados, conta e preferências de leitura',
    route: 'profile', routeLabel: 'Abrir perfil',
    viewRoute: 'profile',
    target: { profile: '.profile-layout .form-panel h2' },
  },
]

const professionalSteps: Step[] = [
  {
    title: 'Área profissional',
    explanation: 'O destino depende do papel informado pela sessão. Esta prévia mostra o percurso do médico; representante e administrador têm atribuições próprias.',
    example: 'Uma médica autorizada terá acesso à sua agenda e aos atendimentos atribuídos a ela.',
    previewTitle: 'Entrada profissional', previewText: 'Papel e instituição dependem da autenticação real',
    route: 'professional', routeLabel: 'Abrir área profissional',
    viewRoute: 'professional',
    target: { professional: '.hb-pro-main h1' },
  },
  {
    title: 'Calendário de disponibilidade',
    explanation: 'O médico poderá conferir e administrar horários quando a agenda e suas regras forem integradas.',
    example: 'Um horário só aparece como disponível depois de publicado pela equipe.',
    previewTitle: 'Agenda médica', previewText: 'Horários → consulta → retorno',
    viewRoute: 'professional',
    target: { professional: '.hb-pro-calendar h2' },
  },
  {
    title: 'Consulta e avaliação',
    explanation: 'Durante o atendimento, o médico poderá solicitar exames e registrar a avaliação conforme autorização e contrato da equipe.',
    example: 'A solicitação de exame depende do atendimento e do registro profissional autorizado.',
    previewTitle: 'Atendimento', previewText: 'Consulta → exame → decisão registrada no futuro serviço',
    viewRoute: 'professional/attendance',
    target: { 'professional/attendance': '.hb-pro-panel-grid .hb-pro-card:first-child h2' },
  },
  {
    title: 'Exames e tipo sanguíneo',
    explanation: 'O tipo sanguíneo decorre da avaliação médica. A atualização de necessidades do banco pertence ao representante autorizado.',
    example: 'O tipo sanguíneo só aparece após exame validado e acesso profissional autorizado.',
    previewTitle: 'Informação clínica', previewText: 'Exames e tipo sanguíneo sob validação profissional; estoque em outro perfil',
    viewRoute: 'professional/exams',
    target: { 'professional/exams': '.hb-pro-panel-grid .hb-pro-card:nth-child(3) h2' },
  },
]

const representativeSteps: Step[] = [
  { title: 'Visão do hospital', explanation: 'O representante autorizado acompanha as necessidades do banco por tipo sanguíneo. Os níveis dependem de fonte hospitalar conectada.', example: 'Texto e cor ajudam a identificar cada nível quando houver dados verificados.', previewTitle: 'H02 · Necessidades', previewText: 'Níveis por tipo identificados por texto e cor', route: 'professional/needs', routeLabel: 'Abrir visão hospitalar', viewRoute: 'professional/needs', target: { 'professional/needs': '.hb-pro-needs h2' } },
  { title: 'Confirme dados antes de agir', explanation: 'Histórico, edição e avisos de necessidade dependerão de autorização e contrato da equipe.', example: 'Uma mudança de nível exige confirmação antes de aparecer no quadro.', previewTitle: 'Gestão hospitalar', previewText: 'Leitura → atualização autorizada', viewRoute: 'professional/needs', target: { 'professional/needs': '.hb-pro-needs li:first-child' } },
]

const administratorSteps: Step[] = [
  { title: 'Área administrativa', explanation: 'O administrador terá permissões próprias definidas pela equipe. Esta tela não expõe dados de pacientes ou profissionais a esse papel.', example: 'A revisão de acesso respeitará os limites do papel administrativo.', previewTitle: 'Administração', previewText: 'Permissões e auditoria dependem de contrato e autorização', route: 'professional/admin', routeLabel: 'Abrir área administrativa', viewRoute: 'professional/admin', target: { 'professional/admin': '.hb-pro-main h1' } },
]

type Spotlight = { top: number; left: number; width: number; height: number }

export type GuidedTourProps = {
  open: boolean
  identity: Identity
  professionalRole: ProfessionalRole
  route: string
  navigate: Navigate
  onClose: () => void
}

export function GuidedTour({ open, identity, professionalRole, route, navigate, onClose }: GuidedTourProps) {
  const [index, setIndex] = useState(0)
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null)
  const [cardSide, setCardSide] = useState<'left' | 'right'>('right')
  const [cardTop, setCardTop] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const startingY = useRef(0)
  const startingRoute = useRef(route)
  const steps = identity === 'visitor' ? visitorSteps : identity === 'patient' ? patientSteps : professionalRole === 'representative' ? representativeSteps : professionalRole === 'administrator' ? administratorSteps : professionalSteps
  const step = steps[Math.min(index, steps.length - 1)]

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      startingY.current = window.scrollY
      startingRoute.current = route
      dialog.showModal()
      requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }))
    } else if (!open && dialog.open) {
      dialog.close()
      requestAnimationFrame(() => openerRef.current?.isConnected && openerRef.current.focus())
    }
  }, [open, route])

  useEffect(() => {
    const dialog = dialogRef.current
    return () => { if (dialog?.open) dialog.close() }
  }, [])

  useEffect(() => {
    if (!open) return
    if (step.viewRoute && route !== step.viewRoute) {
      requestAnimationFrame(() => setSpotlight(null))
      navigate(step.viewRoute, { replace: true })
      return
    }
    const selector = step.target?.[route]
    const target = selector ? document.querySelector<HTMLElement>(selector) ?? document.querySelector<HTMLElement>('main h1') : null
    if (!target) {
      requestAnimationFrame(() => setSpotlight(null))
      return
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 599px)').matches
    const positionTarget = () => {
      if (mobile) {
        // Keep the highlighted control above the bottom sheet instead of centering it behind the sheet.
        const box = target.getBoundingClientRect()
        window.scrollTo({ top: Math.max(0, window.scrollY + box.top - Math.min(88, window.innerHeight * 0.12)), behavior: reducedMotion ? 'instant' : 'smooth' })
      } else target.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'instant' : 'smooth' })
    }
    // App restores route scroll in the next frame; position the tour target after that restoration.
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => { secondFrame = requestAnimationFrame(positionTarget) })
    const update = () => {
      const box = target.getBoundingClientRect()
      if (box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth) {
        const left = Math.max(4, box.left - 6)
        const top = Math.max(4, box.top - 6)
        setSpotlight({ top, left, width: Math.max(8, Math.min(box.width + 12, window.innerWidth - left - 4)), height: Math.max(8, Math.min(box.height + 12, window.innerHeight - top - 4)) })
        setCardSide(box.left + box.width / 2 > window.innerWidth / 2 ? 'left' : 'right')
        setCardTop(box.top + box.height / 2 > window.innerHeight / 2)
      }
      else setSpotlight(null)
    }
    const timer = window.setTimeout(update, reducedMotion ? 30 : 250)
    const settle = window.setTimeout(update, reducedMotion ? 80 : 500)
    const onResize = () => { positionTarget(); update() }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', update, { passive: true })
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }))
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); window.clearTimeout(timer); window.clearTimeout(settle); window.removeEventListener('resize', onResize); window.removeEventListener('scroll', update) }
  }, [open, index, route, step, navigate])

  const move = (next: number) => {
    setIndex(next)
    requestAnimationFrame(() => {
      cardRef.current?.scrollTo(0, 0)
      headingRef.current?.focus({ preventScroll: true })
    })
  }
  const keepFocusInTour = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
      .filter((element) => element.getClientRects().length > 0)
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return
    const active = document.activeElement
    if (event.shiftKey && (active === headingRef.current || active === first || !dialog.contains(active))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault()
      first.focus()
    }
  }
  const close = (restoreContext = true) => {
    const opener = openerRef.current
    const y = startingY.current
    const origin = startingRoute.current
    if (dialogRef.current?.open) dialogRef.current.close()
    setIndex(0)
    setSpotlight(null)
    onClose()
    if (restoreContext && route !== origin) navigate(origin, { replace: true })
    window.setTimeout(() => {
      if (restoreContext) window.scrollTo(0, y)
      if (opener?.isConnected) opener.focus({ preventScroll: true })
      else document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
    }, 60)
  }
  const goTo = () => {
    if (!step.route) return
    const destination = step.route
    close(false)
    if (route !== startingRoute.current) navigate(startingRoute.current, { replace: true })
    navigate(destination)
  }

  useEffect(() => {
    if (!open) return
    const onHistory = () => { setIndex(0); setSpotlight(null); onClose() }
    window.addEventListener('popstate', onHistory)
    return () => window.removeEventListener('popstate', onHistory)
  }, [open, onClose])

  return <dialog ref={dialogRef} className="guided-tour" aria-labelledby="guided-tour-title" aria-describedby="guided-tour-explanation" onCancel={(event) => { event.preventDefault(); close() }} onKeyDown={keepFocusInTour}>
    {spotlight && <div className="guided-tour-spotlight" style={spotlight} aria-hidden="true"><span>{index + 1}</span></div>}
    {!spotlight && <div className="guided-tour-shade" aria-hidden="true" />}
    <section ref={cardRef} className={`guided-tour-card${spotlight && cardTop ? ' guided-tour-card--top' : ''}${spotlight && cardSide === 'left' ? ' guided-tour-card--left' : ''}`}>
      <div className="guided-tour-heading"><img src="/hemobridge/simbolo-1024.png" alt="" width="38" height="38" /><span>Orientação HemoBridge · {identity === 'visitor' ? 'visitante' : identity === 'patient' ? 'paciente' : professionalRole === 'doctor' ? 'médico' : professionalRole === 'representative' ? 'representante' : 'administrador'}</span></div>
      <div className="guided-tour-progress-row">
        <p className="guided-tour-progress">Etapa {index + 1} de {steps.length}</p>
        <span className="guided-tour-progress-track" aria-hidden="true"><span style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></span>
      </div>
      <h2 id="guided-tour-title" ref={headingRef} tabIndex={-1} aria-label={`Etapa ${index + 1} de ${steps.length}: ${step.title}`}>{step.title}</h2>
      <p id="guided-tour-explanation">{step.explanation}</p>
      <div className={`guided-tour-preview${spotlight ? '' : ' guided-tour-preview--focus'}`} aria-label={spotlight ? 'Resumo da etapa destacada' : 'Orientação sobre etapa futura'}><span>{spotlight ? 'Nesta tela' : 'Próxima etapa'}</span><strong>{step.previewTitle}</strong><p>{step.previewText}</p></div>
      <p className="guided-tour-example">{step.example}</p>
      {!spotlight && <p className="guided-tour-context">Esta etapa depende do perfil e dos serviços correspondentes; o tour apenas explica o percurso.</p>}
      {step.route && <button className="guided-tour-link" type="button" onClick={goTo}>{step.routeLabel}</button>}
      <div className="guided-tour-controls"><button type="button" className="guided-tour-quiet" onClick={() => close()}>{index === steps.length - 1 ? 'Fechar tour' : 'Pular tour'}</button><div><button type="button" className="guided-tour-back" disabled={index === 0} onClick={() => move(index - 1)}>Voltar</button>{index === steps.length - 1 ? <button type="button" className="guided-tour-next" onClick={() => close()}>Concluir</button> : <button type="button" className="guided-tour-next" onClick={() => move(index + 1)}>Avançar</button>}</div></div>
    </section>
  </dialog>
}
