import { somenteDigitos } from '../../lib/formato'
import { cpfValido, emailValido, telefoneValido, type Erros } from '../../lib/validacao'
import type { NovoAdminHemocentro } from '../../services/admin'

export type CamposAdmin = { nome: string; cpf: string; email: string; telefone: string }

export const adminVazio: CamposAdmin = { nome: '', cpf: '', email: '', telefone: '' }

export function validarAdmin(c: CamposAdmin): Erros<CamposAdmin> {
  return {
    nome: c.nome.trim().length < 3 ? 'Informe o nome completo (mínimo de 3 caracteres).' : undefined,
    cpf: !c.cpf ? 'Informe o CPF.' : !cpfValido(c.cpf) ? 'CPF inválido. Confira os números.' : undefined,
    email: !c.email ? 'Informe o e-mail.' : !emailValido(c.email) ? 'Informe um e-mail válido.' : undefined,
    telefone: !telefoneValido(c.telefone) ? 'Informe o telefone com DDD.' : undefined,
  }
}

export function dadosAdmin(c: CamposAdmin): NovoAdminHemocentro {
  return { nome: c.nome.trim(), cpf: somenteDigitos(c.cpf), email: c.email.trim(), telefone: somenteDigitos(c.telefone) }
}
