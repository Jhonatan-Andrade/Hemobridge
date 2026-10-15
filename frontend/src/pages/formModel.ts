import { exampleFormValues } from '../data/fixtures'

export type FormKind = 'register' | 'login' | 'forgot' | 'reset' | 'first' | 'change' | 'profile'
export type Values = Record<string, string>

export function validateForm(kind: FormKind, values: Values, consent: boolean): Record<string, string> {
  const errors: Record<string, string> = {}
  const required: Record<FormKind, string[]> = {
    register: ['name', 'cpf', 'email', 'password', 'confirm', 'phone', 'birth', 'sex', 'weight', 'city', 'state'],
    login: ['email', 'password'], forgot: ['email'], reset: ['new', 'newconfirm'],
    first: ['new', 'newconfirm'], change: ['current', 'new', 'newconfirm'],
    profile: ['phone', 'weight', 'city', 'state'],
  }
  for (const id of required[kind]) if (!values[id]?.trim()) errors[id] = 'Preencha este campo.'
  if (required[kind].includes('email') && values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Informe um e-mail válido.'
  const candidate = kind === 'register' ? values.password : ['reset', 'first', 'change'].includes(kind) ? values.new : ''
  if (candidate && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(candidate)) errors[kind === 'register' ? 'password' : 'new'] = 'Use pelo menos 8 caracteres, com letras e números.'
  if (kind === 'register' && values.password !== values.confirm) errors.confirm = 'As senhas devem ser iguais.'
  if (['reset', 'first', 'change'].includes(kind) && values.new !== values.newconfirm) errors.newconfirm = 'As senhas devem ser iguais.'
  if (kind === 'first' && values.new === exampleFormValues.current) errors.new = 'Use uma senha diferente da provisória.'
  if (kind === 'register') {
    if (Number(values.weight) < 50) errors.weight = 'O pré-cadastro exige peso mínimo de 50 kg.'
    if (values.birth) {
      const birth = new Date(`${values.birth}T12:00:00`)
      const now = new Date()
      let age = now.getFullYear() - birth.getFullYear()
      if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
      if (!Number.isFinite(age) || age < 16 || age > 69) errors.birth = 'O pré-cadastro aceita idade de 16 a 69 anos.'
    }
  }
  if ((kind === 'register' || kind === 'first') && !consent) errors.consent = 'Confirme a leitura do aviso desta versão de avaliação.'
  return errors
}
