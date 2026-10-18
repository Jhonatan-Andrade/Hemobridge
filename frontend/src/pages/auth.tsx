import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, messageOf } from '../services/api-client'
import { useResource } from '../services/use-resource'
import { LocationSelects } from '../components/location-selects'
import { Alert, Intro, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'
import { validateForm } from './form-model'
import type { FormKind, Values } from './form-model'
const labels: Record<string, string> = {
  name: 'Nome completo',
  cpf: 'CPF',
  email: 'E-mail',
  password: 'Senha',
  confirm: 'Confirmar senha',
  phone: 'Telefone',
  birth: 'Data de nascimento',
  sex: 'Sexo',
  weight: 'Peso (kg)',
  current: 'Senha atual',
  new: 'Nova senha',
  newconfirm: 'Confirmar nova senha',
}
const types: Record<string, string> = {
  email: 'email',
  password: 'password',
  confirm: 'password',
  phone: 'tel',
  birth: 'date',
  weight: 'number',
  current: 'password',
  new: 'password',
  newconfirm: 'password',
}
export function FormField({
  id,
  value,
  onChange,
  error,
  readOnly = false,
}: {
  id: string
  value: string
  onChange: (id: string, value: string) => void
  error?: string
  readOnly?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const password = types[id] === 'password'
  return (
    <div className="field">
      <label htmlFor={id}>{labels[id] ?? id}</label>
      {id === 'sex' ? (
        <select
          id={id}
          value={value}
          disabled={readOnly}
          onChange={(e) => onChange(id, e.target.value)}
          required
        >
          <option value="">Selecione</option>
          <option value="MASCULINO">Masculino</option>
          <option value="FEMININO">Feminino</option>
        </select>
      ) : (
        <div className={password ? 'password-wrap' : undefined}>
          <input
            id={id}
            value={value}
            onChange={(e) => onChange(id, e.target.value)}
            type={password && visible ? 'text' : (types[id] ?? 'text')}
            readOnly={readOnly}
            autoComplete={
              id === 'email'
                ? 'username'
                : id === 'password'
                  ? 'current-password'
                  : id === 'new' || id === 'confirm' || id === 'newconfirm'
                    ? 'new-password'
                    : id === 'name'
                      ? 'name'
                      : id === 'phone'
                        ? 'tel'
                        : 'off'
            }
            step={id === 'weight' ? '0.1' : undefined}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {password && (
            <button
              type="button"
              className="reveal"
              onClick={() => setVisible(!visible)}
              aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${labels[id]}`}
            >
              {visible ? 'Ocultar' : 'Mostrar'}
            </button>
          )}
        </div>
      )}
      {error && (
        <span className="error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  )
}
export function AuthPage({
  route,
  navigate,
  onDone,
  onTerm,
}: {
  route: string
  navigate: Navigate
  onDone: (kind: string) => Promise<void>
  onTerm: () => void
}) {
  const [values, setValues] = useState<Values>({}),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [consent, setConsent] = useState(false),
    [over60, setOver60] = useState(false),
    [sending, setSending] = useState(false),
    [feedback, setFeedback] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const kind = route as FormKind
  const term = useResource<{ versao: string; finalidade: string; texto: string }>(
    route === 'first' ? '/auth/primeiro-acesso/termo' : '/pacientes/termo-consentimento',
  )
  const change = (id: string, value: string) =>
    setValues((current) => ({ ...current, [id]: value }))
  const titles: Record<string, [string, string]> = {
    register: ['Fazer pré-cadastro', 'Comece sua jornada como paciente ou doador.'],
    login: ['Entrar', 'Acesse o acompanhamento da sua conta.'],
    forgot: ['Recuperar senha', 'Receba as orientações pelo e-mail cadastrado.'],
    reset: ['Redefinir senha', 'Crie uma senha segura para a sua conta.'],
    first: [
      'Primeiro acesso profissional',
      'Defina sua senha e aceite o termo de responsabilidade e sigilo.',
    ],
    change: ['Alterar senha', 'Confirme a senha atual e crie uma nova.'],
    registered: ['Pré-cadastro concluído', 'Entre para acompanhar as próximas etapas.'],
    neutral: [
      'Confira seu e-mail',
      'Se houver uma conta para este endereço, enviaremos as orientações de recuperação.',
    ],
    passwordSuccess: ['Senha atualizada', 'Entre novamente com a nova senha.'],
    closed: [
      'Solicitação recebida',
      'Acompanhe o pedido pelo canal de privacidade. Registros com obrigação de guarda seguem a legislação aplicável.',
    ],
  }
  const [title, description] = titles[route] ?? ['Acesso', 'Acesse sua conta para continuar.']
  const isForm = ['register', 'login', 'forgot', 'reset', 'first', 'change'].includes(route)
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (sending) return
    const nextErrors = validateForm(kind, values, consent)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setFeedback('Revise os campos indicados.')
      formRef.current?.querySelector<HTMLElement>(`#${Object.keys(nextErrors)[0]}`)?.focus()
      return
    }
    setSending(true)
    setFeedback('')
    try {
      if (kind === 'login')
        await api('/auth/sessao', {
          method: 'POST',
          body: { email: values.email.trim().toLowerCase(), senha: values.password },
        })
      else if (kind === 'register')
        await api('/pacientes', {
          method: 'POST',
          body: {
            nome: values.name,
            cpf: values.cpf.replace(/\D/g, ''),
            email: values.email,
            senha: values.password,
            confirmacaoSenha: values.confirm,
            telefone: values.phone.replace(/\D/g, ''),
            dataNascimento: values.birth,
            sexo: values.sex,
            pesoKg: Number(values.weight),
            cidade: values.city,
            estado: values.state,
            aceiteTermo: consent,
            versaoTermo: term.data?.versao,
            cienteRegraAcimaDe60: over60,
          },
        })
      else if (kind === 'forgot')
        await api('/auth/recuperar-senha', { method: 'POST', body: { email: values.email } })
      else if (kind === 'reset') {
        const token =
          new URLSearchParams(location.hash.split('?')[1] ?? location.search).get('token') ?? ''
        await api('/auth/redefinir-senha', {
          method: 'POST',
          body: { token, novaSenha: values.new, confirmacaoSenha: values.newconfirm },
        })
      } else if (kind === 'first')
        await api('/auth/primeiro-acesso', {
          method: 'POST',
          body: {
            novaSenha: values.new,
            confirmacaoSenha: values.newconfirm,
            aceiteTermo: consent,
            versaoTermo: term.data?.versao,
          },
        })
      else
        await api('/conta/senha', {
          method: 'POST',
          body: {
            senhaAtual: values.current,
            novaSenha: values.new,
            confirmacaoSenha: values.newconfirm,
          },
        })
      await onDone(kind)
    } catch (error) {
      setFeedback(messageOf(error))
      setValues((current) => ({
        ...current,
        password: '',
        confirm: '',
        current: '',
        new: '',
        newconfirm: '',
      }))
    } finally {
      setSending(false)
    }
  }
  const fields = (ids: string[]) =>
    ids.map((id) => (
      <FormField key={id} id={id} value={values[id] ?? ''} onChange={change} error={errors[id]} />
    ))
  return (
    <>
      <div className="auth-return">
        <RouteLink className="back-link" to="home" navigate={navigate}>
          ← Voltar ao início
        </RouteLink>
      </div>
      <main className="auth-page">
        <div className="auth-card surface">
          <Intro title={title} description={description} />
          {feedback && <Alert tone="error">{feedback}</Alert>}
          {isForm && (
            <form ref={formRef} onSubmit={submit} noValidate>
              {route === 'register' && (
                <>
                  <div className="field-grid">
                    {fields([
                      'name',
                      'cpf',
                      'email',
                      'password',
                      'confirm',
                      'phone',
                      'birth',
                      'sex',
                      'weight',
                    ])}
                  </div>
                  <LocationSelects
                    state={values.state ?? ''}
                    city={values.city ?? ''}
                    onChange={(state, city) => setValues((v) => ({ ...v, state, city }))}
                    required
                  />
                  {(errors.city || errors.state) && (
                    <p className="error">Selecione estado e município.</p>
                  )}
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={over60}
                      onChange={(e) => setOver60(e.target.checked)}
                    />
                    Se tenho mais de 60 anos, confirmo que já doei antes dos 60.
                  </label>
                </>
              )}
              {route === 'login' && fields(['email', 'password'])}
              {route === 'forgot' && fields(['email'])}
              {(route === 'reset' || route === 'first') && fields(['new', 'newconfirm'])}
              {route === 'change' && fields(['current', 'new', 'newconfirm'])}
              {(route === 'register' || route === 'first') && (
                <>
                  <p>{term.data?.finalidade}</p>
                  {term.data && (
                    <details className="consent-text">
                      <summary>Ler termo completo · versão {term.data.versao}</summary>
                      <p>{term.data.texto}</p>
                    </details>
                  )}
                  {term.error && (
                    <Alert tone="error">
                      {term.error}{' '}
                      <button type="button" onClick={term.reload}>
                        Tentar novamente
                      </button>
                    </Alert>
                  )}
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      {route === 'first'
                        ? 'Aceito o termo de responsabilidade e sigilo.'
                        : 'Autorizo o tratamento dos dados de saúde para avaliação e direcionamento de doação, conforme o termo apresentado.'}{' '}
                      <button type="button" className="text-button" onClick={onTerm}>
                        Ler termos e privacidade
                      </button>
                    </span>
                  </label>
                  {errors.consent && <p className="error">{errors.consent}</p>}
                </>
              )}
              <button
                className="button"
                disabled={sending || ((route === 'register' || route === 'first') && !term.data)}
              >
                {sending
                  ? 'Aguarde…'
                  : route === 'register'
                    ? 'Criar pré-cadastro'
                    : route === 'login'
                      ? 'Entrar'
                      : route === 'forgot'
                        ? 'Enviar orientações'
                        : 'Salvar nova senha'}
              </button>
            </form>
          )}
          <div className="actions">
            {route === 'login' ? (
              <>
                <RouteLink to="forgot" navigate={navigate}>
                  Esqueci minha senha
                </RouteLink>
                <RouteLink to="register" navigate={navigate}>
                  Criar pré-cadastro
                </RouteLink>
              </>
            ) : (
              <RouteLink to="login" navigate={navigate}>
                Ir para entrar
              </RouteLink>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
