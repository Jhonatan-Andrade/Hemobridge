import { Throttle } from '@nestjs/throttler';

const MINUTO = 60_000;

/** Limite padrão por IP, aplicado a todas as rotas. */
export const LIMITE_PADRAO = { ttl: MINUTO, limit: 100 };

/*
 * Limites mais restritos por IP para rotas sujeitas a força bruta ou abuso.
 * Complementam o bloqueio por conta da RN07, que não impede testar muitos
 * e-mails diferentes a partir do mesmo IP.
 */
export const LimiteLogin = () => Throttle({ default: { ttl: MINUTO, limit: 10 } });
export const LimiteRecuperacaoSenha = () => Throttle({ default: { ttl: 15 * MINUTO, limit: 5 } });
export const LimiteRedefinicaoSenha = () => Throttle({ default: { ttl: MINUTO, limit: 10 } });
export const LimiteCadastro = () => Throttle({ default: { ttl: MINUTO, limit: 10 } });
