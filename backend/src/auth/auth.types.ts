import type { Perfil, SituacaoPaciente } from '../generated/prisma/enums.js';

export interface TokenPayload {
  sub: string;
  perfil: Perfil;
  /** Versão da sessão do usuário quando o token foi emitido. */
  ver: number;
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

/** Seleção do vínculo institucional de médicos e representantes. */
export const SELECAO_INSTITUICAO = {
  medico: { select: { hospital: { select: { ativo: true } } } },
  representante: { select: { hospital: { select: { ativo: true } } } },
} as const;

/** RN09: médico ou representante de banco de sangue desativado perde o acesso. */
export function instituicaoDesativada(usuario: {
  medico: { hospital: { ativo: boolean } } | null;
  representante: { hospital: { ativo: boolean } } | null;
}): boolean {
  const hospital = usuario.medico?.hospital ?? usuario.representante?.hospital;
  return hospital !== undefined && !hospital.ativo;
}

export function papelDe(perfil: Perfil, situacao?: SituacaoPaciente | null): Papel {
  return perfil === 'PACIENTE' && situacao === 'APROVADO' ? 'DOADOR' : perfil;
}
