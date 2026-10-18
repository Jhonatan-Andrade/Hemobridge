import { SetMetadata } from '@nestjs/common';

export const AUDITAR_KEY = 'auditoria:auditar';

export interface OpcoesAuditar {
  acao: string;
  entidade: string;
  /** Também registra tentativas que terminaram em erro, como ACAO_FALHA. */
  registrarFalha?: boolean;
}

/**
 * Marca a rota para gravação automática em log_auditoria (RNF05) pelo
 * AuditoriaInterceptor: usuário, ação, entidade, id, IP e instante.
 *
 * O id da entidade vem do parâmetro de rota `:id`, ou do campo `id` da
 * resposta, ou do usuário autenticado/logado, nessa ordem.
 */
export const Auditar = (opcoes: OpcoesAuditar) => SetMetadata(AUDITAR_KEY, opcoes);
