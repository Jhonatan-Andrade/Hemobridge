import type { PapelEquipe, Perfil } from '../generated/prisma/enums.js';

export interface TokenPayload {
  sub: string;
  perfil: Perfil;
  /** Versão da sessão do usuário quando o token foi emitido. */
  ver: number;
}

/** Hemocentro de quem pertence à equipe (perfil EQUIPE). */
export interface HemocentroDaEquipe {
  id: string;
  nome: string;
}

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  /** Papel na equipe do hemocentro; nulo para paciente e administrador da plataforma. */
  papel: PapelEquipe | null;
  hemocentro: HemocentroDaEquipe | null;
  senhaProvisoria: boolean;
}

/** Usuário com acesso à equipe de um hemocentro (vem sempre do banco, nunca da requisição). */
export type MembroDaEquipe = UsuarioAutenticado & { papel: PapelEquipe; hemocentro: HemocentroDaEquipe };

/** Seleção do vínculo com o hemocentro, usada no login e no guard. */
export const SELECAO_EQUIPE = {
  equipe: { select: { papel: true, hemocentro: { select: { id: true, nome: true, ativo: true } } } },
} as const;

type VinculoEquipe = {
  equipe: { papel: PapelEquipe; hemocentro: HemocentroDaEquipe & { ativo: boolean } } | null;
};

/** A equipe de um hemocentro desativado perde o acesso. */
export function hemocentroDesativado(usuario: VinculoEquipe): boolean {
  return usuario.equipe !== null && !usuario.equipe.hemocentro.ativo;
}

export function vinculoDe(usuario: VinculoEquipe): Pick<UsuarioAutenticado, 'papel' | 'hemocentro'> {
  if (!usuario.equipe) return { papel: null, hemocentro: null };
  const { id, nome } = usuario.equipe.hemocentro;
  return { papel: usuario.equipe.papel, hemocentro: { id, nome } };
}
