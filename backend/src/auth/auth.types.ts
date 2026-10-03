import type { Perfil, SituacaoPaciente } from '../generated/prisma/enums.js';

export interface TokenPayload {
  sub: string;
  perfil: Perfil;
}

/** Papel exibido ao usuário: Doador é o Paciente com situação APROVADO. */
export type Papel = Perfil | 'DOADOR';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  papel: Papel;
  senhaProvisoria: boolean;
}

export function papelDe(perfil: Perfil, situacao?: SituacaoPaciente | null): Papel {
  return perfil === 'PACIENTE' && situacao === 'APROVADO' ? 'DOADOR' : perfil;
}
