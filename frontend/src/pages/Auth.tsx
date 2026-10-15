import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { DemoResponse } from '../data/fixtures'
import { demoService } from '../services/demoService'
import { ActionButton, Alert, Intro, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'
import { validateForm } from './formModel'
import type { FormKind, Values } from './formModel'

const labels: Record<string, string> = {
  name: 'Nome completo', cpf: 'CPF', email: 'E-mail', password: 'Senha', confirm: 'Confirmar senha',
  phone: 'Telefone', birth: 'Data de nascimento', sex: 'Sexo', weight: 'Peso (kg)', city: 'Cidade', state: 'Estado',
  current: 'Senha atual', new: 'Nova senha', newconfirm: 'Confirmar nova senha',
}
const types: Record<string, string> = { email: 'email', password: 'password', confirm: 'password', phone: 'tel', birth: 'date', weight: 'number', current: 'password', new: 'password', newconfirm: 'password' }
const passwordFields = new Set(['password', 'confirm', 'current', 'new', 'newconfirm'])

export function FormField({ id, value, onChange, error, readOnly = false }: { id: string; value: string; onChange: (id: string, value: string) => void; error?: string; readOnly?: boolean }) {
  const [visible, setVisible] = useState(false)
  const type = types[id] ?? 'text'
  const help = id === 'cpf' ? 'Informe os números do seu CPF' : passwordFields.has(id) && id !== 'current' ? '8 caracteres ou mais, com letras e números' : undefined
  const input = id === 'sex' || id === 'state'
    ? <select id={id} name={id} value={value} disabled={readOnly} aria-invalid={!!error} aria-describedby={`${id}-error${help ? ` ${id}-help` : ''}`} onChange={(event) => onChange(id, event.target.value)}><option value="">Selecione</option><option value="demo">Opção de teste</option></select>
    : <input id={id} name={id} type={passwordFields.has(id) && visible ? 'text' : type} value={value} readOnly={readOnly} aria-invalid={!!error} aria-describedby={`${id}-error${help ? ` ${id}-help` : ''}`} autoComplete="off" step={id === 'weight' ? '0.1' : undefined} onChange={(event) => onChange(id, event.target.value)} />
  return <div className="field"><label htmlFor={id}>{labels[id]}{readOnly ? ' · somente leitura' : ''}</label>
    {passwordFields.has(id) ? <div className="password-wrap">{input}<button type="button" className="reveal" aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${labels[id].toLowerCase()}`} onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button></div> : input}
    {help && <span className="help" id={`${id}-help`}>{help}</span>}
    <span className="error" id={`${id}-error`}>{error}</span>
  </div>
}

function AuthLayout({ children, navigate, backTo }: { children: React.ReactNode; navigate: Navigate; backTo: string }) {
  return <><div className="auth-return"><RouteLink to={backTo} navigate={navigate} className="back-link">← {backTo.startsWith('post/') ? 'Cancelar e continuar lendo' : 'Voltar ao início'}</RouteLink></div>
    <main className="auth-layout"><aside className="story"><span className="eyebrow">Como funciona</span><h2>Do pré-cadastro às orientações da equipe.</h2><ol className="steps"><li><span className="number">1</span>Faça seu pré-cadastro</li><li><span className="number">2</span>Entre com e-mail e senha</li><li><span className="number">3</span>Consulte sua situação e o próximo passo</li></ol><p className="story-foot">O pré-cadastro inicia o processo e não confirma aprovação como doador.</p></aside><section className="surface form-panel">{children}</section></main></>
}

export function AuthPage({ route, navigate, response, onDone, onTerm, fillExample, pendingPost }: { route: string; navigate: Navigate; response: DemoResponse; onDone: (kind: FormKind) => void; onTerm: (trigger: HTMLElement) => void; fillExample: boolean; pendingPost: string | null }) {
  const [values, setValues] = useState<Values>(() => fillExample ? demoService.exampleFormValues() : {})
  const [consent, setConsent] = useState(fillExample)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState('')
  const [sending, setSending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const change = (id: string, value: string) => { setValues((current) => ({ ...current, [id]: value })); setErrors((current) => ({ ...current, [id]: '' })) }
  const kind = route as FormKind
  const isForm = ['register', 'login', 'forgot', 'reset', 'first', 'change'].includes(route)
  const titles: Record<string, [string, string]> = {
    register: ['Crie seu pré-cadastro', 'Preencha seus dados para iniciar o acompanhamento.'],
    registered: ['Pré-cadastro preenchido', 'Revise o próximo passo antes de entrar. Nenhum cadastro foi enviado ao serviço.'],
    login: ['Entrar no HemoBridge', 'Use seu e-mail e senha. Não é necessário selecionar um perfil.'],
    forgot: ['Recuperar senha', 'Conheça a recuperação usando um e-mail de teste.'],
    neutral: ['Recuperação de senha', 'Nesta versão, nenhum e-mail foi enviado. No serviço integrado, as instruções serão encaminhadas sem revelar se a conta existe.'],
    reset: ['Defina uma nova senha', 'Use uma senha com 8 caracteres ou mais, letras e números.'],
    change: ['Alterar senha', 'Use uma senha com 8 caracteres ou mais, letras e números.'],
    first: ['Primeiro acesso profissional', 'Conheça a troca da senha provisória antes de continuar.'],
    passwordSuccess: ['Etapa de senha concluída', 'Nenhuma senha de uma conta real foi alterada.'],
    professional: ['Acesso profissional', 'Cada perfil possui uma área própria.'],
    closed: ['Etapas de encerramento concluídas', 'Nenhuma conta foi encerrada.'],
  }
  const [title, description] = titles[route] ?? ['Destino de revisão', 'Selecione outro fluxo.']
  const formNotice = route === 'login' || route === 'first' || route === 'change' || route === 'reset'
    ? 'Use apenas credenciais de teste. Esta tela não acessa nem altera contas reais.'
    : route === 'register' ? 'Use apenas dados de teste. O pré-cadastro não é enviado ao serviço.'
      : 'Use apenas um e-mail de teste. Nenhuma mensagem será enviada.'
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    const nextErrors = validateForm(kind, values, consent)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors); setFeedback('Revise os campos indicados antes de continuar.')
      formRef.current?.querySelector<HTMLElement>(`#${Object.keys(nextErrors)[0]}`)?.focus()
      return
    }
    setSending(true); setFeedback('')
    try {
      await demoService.submit({ kind, fields: values, consent }, response)
      onDone(kind)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível concluir.')
      setValues((current) => ({ ...current, password: '', confirm: '', current: '', new: '', newconfirm: '' }))
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[type="password"]')?.focus())
    } finally { setSending(false) }
  }
  const fields = (ids: string[]) => ids.map((id) => <FormField key={id} id={id} value={values[id] ?? ''} onChange={change} error={errors[id]} />)
  const backTo = pendingPost ?? (route === 'change' ? 'profile' : 'home')
  return <AuthLayout navigate={navigate} backTo={backTo}><Intro title={title} description={description} />
    {isForm && <p className="demo-content-label">{formNotice} {route !== 'register' && route !== 'first' && <button className="text-button" type="button" onClick={(event) => onTerm(event.currentTarget)}>Aviso de uso e privacidade</button>}</p>}
    {feedback && <Alert tone="error">{feedback}</Alert>}
    {isForm && <form ref={formRef} noValidate onSubmit={submit}>
      {route === 'register' && <><div className="field-grid">{fields(['name', 'cpf', 'email', 'password', 'confirm', 'phone', 'birth', 'sex', 'weight', 'city', 'state'])}</div><Alert>Idade de 16 a 69 anos e peso mínimo de 50 kg. Acima de 60, é necessário ter doado antes dos 60. Para menores, a autorização do responsável depende de processo a confirmar.</Alert><div className="checkbox-row"><input type="checkbox" id="consent" checked={consent} aria-invalid={!!errors.consent} aria-describedby="consent-error" onChange={(event) => setConsent(event.target.checked)} /><span><label htmlFor="consent">Li o aviso de uso e privacidade desta versão de avaliação.</label> <button className="text-button" type="button" onClick={(event) => onTerm(event.currentTarget)}>Ler o aviso</button></span></div><span className="error" id="consent-error">{errors.consent}</span></>}
      {route === 'login' && fields(['email', 'password'])}
      {route === 'forgot' && fields(['email'])}
      {route === 'reset' && fields(['new', 'newconfirm'])}
      {route === 'change' && fields(['current', 'new', 'newconfirm'])}
      {route === 'first' && <>{fields(['new', 'newconfirm'])}<Alert>Senha provisória válida por 72 horas. A nova senha deve ser diferente da provisória.</Alert><div className="checkbox-row"><input type="checkbox" id="consent" checked={consent} aria-invalid={!!errors.consent} aria-describedby="consent-error" onChange={(event) => setConsent(event.target.checked)} /><span><label htmlFor="consent">Li o aviso de uso e privacidade desta versão de avaliação.</label> <button className="text-button" type="button" onClick={(event) => onTerm(event.currentTarget)}>Ler o aviso</button></span></div><span className="error" id="consent-error">{errors.consent}</span></>}
      <div className="actions"><button className="button" type="submit" disabled={sending} aria-busy={sending}>{sending ? 'Aguarde…' : route === 'register' ? 'Criar pré-cadastro' : route === 'login' ? 'Entrar' : route === 'forgot' ? 'Continuar' : route === 'first' ? 'Continuar' : 'Salvar nova senha'}</button></div>
    </form>}
    {route === 'registered' && <><Alert tone="success">Entre com seu e-mail e senha para acompanhar os próximos passos. Você ainda não está autenticado.</Alert><div className="actions"><RouteLink className="button" to="login" navigate={navigate}>Ir para entrar</RouteLink></div></>}
    {route === 'neutral' && <><Alert>Quando a recuperação estiver integrada, o link será de uso único e terá prazo de validade. A confirmação não revelará se o endereço está cadastrado.</Alert><div className="actions"><RouteLink className="button secondary" to="login" navigate={navigate}>Voltar para entrar</RouteLink></div></>}
    {route === 'passwordSuccess' && <div className="actions"><RouteLink className="button" to="login" navigate={navigate}>Ir para entrar</RouteLink></div>}
    {route === 'professional' && <><Alert>Use o menu para conhecer a área do seu perfil. Os recursos profissionais dependem da integração com os serviços da equipe.</Alert><div className="actions"><RouteLink className="button secondary" to="home" navigate={navigate}>Voltar ao início</RouteLink></div></>}
    {route === 'closed' && <div className="actions"><RouteLink className="button" to="home" navigate={navigate}>Voltar ao início</RouteLink></div>}
    {route === 'register' && <div className="actions"><RouteLink className="button secondary" to="login" navigate={navigate}>Já tenho conta · Entrar</RouteLink></div>}
    {route === 'login' && <div className="actions"><RouteLink className="button secondary" to="forgot" navigate={navigate}>Esqueci minha senha</RouteLink><RouteLink className="button secondary" to="register" navigate={navigate}>Criar pré-cadastro</RouteLink></div>}
    {route === 'forgot' && <div className="actions"><RouteLink className="button secondary" to="login" navigate={navigate}>Voltar para entrar</RouteLink></div>}
    {['reset', 'first', 'change'].includes(route) && <div className="actions"><ActionButton variant="secondary" onClick={() => navigate(route === 'change' ? 'profile' : 'login')}>{route === 'first' ? 'Não aceitar e sair' : 'Cancelar'}</ActionButton></div>}
  </AuthLayout>
}
