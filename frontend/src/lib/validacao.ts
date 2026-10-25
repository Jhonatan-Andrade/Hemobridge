import { calcularIdade, REGRA_SENHA, senhaValida, somenteDigitos } from './formato'

export type Erros<T> = Partial<Record<keyof T, string>>

export const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

/** Dígitos verificadores do CPF (mesma regra do backend, IsCpf). */
export function cpfValido(valor: string) {
  const cpf = somenteDigitos(valor)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digito = (base: string, pesoInicial: number) => {
    const soma = [...base].reduce((total, d, i) => total + Number(d) * (pesoInicial - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(cpf.slice(0, 9), 10) === Number(cpf[9]) && digito(cpf.slice(0, 10), 11) === Number(cpf[10])
}

/** Dígitos verificadores do CNPJ (mesma regra do backend, IsCnpj). */
export function cnpjValido(valor: string) {
  const cnpj = somenteDigitos(valor)
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
  const digito = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const resto = [...base].reduce((total, d, i) => total + Number(d) * pesos[i], 0) % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return digito(cnpj.slice(0, 12)) === Number(cnpj[12]) && digito(cnpj.slice(0, 13)) === Number(cnpj[13])
}

export const telefoneValido = (valor: string) => /^\d{10,11}$/.test(somenteDigitos(valor))

export function erroSenha(senha: string) {
  if (!senha) return 'Informe a senha.'
  if (!senhaValida(senha)) return REGRA_SENHA
  return undefined
}

export function erroConfirmacao(senha: string, confirmacao: string) {
  if (!confirmacao) return 'Repita a senha.'
  if (senha !== confirmacao) return 'A confirmação de senha não confere.'
  return undefined
}

/** Idade permitida para iniciar o processo de doação (Figma: "Idade de 16 a 69 anos"). */
export function erroDataNascimento(data: string) {
  if (!data) return 'Informe a data de nascimento.'
  const idade = calcularIdade(data)
  if (idade === null || idade < 0) return 'Data de nascimento inválida.'
  if (idade < 16 || idade > 69) return 'A doação é permitida para pessoas de 16 a 69 anos.'
  return undefined
}

export const temErros = <T,>(erros: Erros<T>) => Object.values(erros).some(Boolean)
