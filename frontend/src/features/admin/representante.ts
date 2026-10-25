import { somenteDigitos } from '../../lib/formato'
import { cpfValido, emailValido, telefoneValido, type Erros } from '../../lib/validacao'
import type { NovoRepresentante } from '../../services/admin'

export type CamposRepresentante = { nome: string; cpf: string; email: string; telefone: string; cargo: string }

export const representanteVazio: CamposRepresentante = { nome: '', cpf: '', email: '', telefone: '', cargo: '' }

export function validarRepresentante(c: CamposRepresentante): Erros<CamposRepresentante> {
  return {
    nome: c.nome.trim().length < 3 ? 'Informe o nome completo (mínimo de 3 caracteres).' : undefined,
    cpf: !c.cpf ? 'Informe o CPF.' : !cpfValido(c.cpf) ? 'CPF inválido. Confira os números.' : undefined,
    email: !c.email ? 'Informe o e-mail.' : !emailValido(c.email) ? 'Informe um e-mail válido.' : undefined,
    telefone: !telefoneValido(c.telefone) ? 'Informe o telefone com DDD.' : undefined,
  }
}

export function dadosRepresentante(c: CamposRepresentante): NovoRepresentante {
  return {
    nome: c.nome.trim(),
    cpf: somenteDigitos(c.cpf),
    email: c.email.trim(),
    telefone: somenteDigitos(c.telefone),
    cargo: c.cargo.trim() || undefined,
  }
}
