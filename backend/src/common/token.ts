import { createHash, randomBytes } from 'node:crypto';

/** Token aleatório de 256 bits, seguro para uso em URL. */
export function gerarTokenAleatorio(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash SHA-256 de um token de alta entropia. Só o hash é guardado no banco,
 * para que um vazamento da base não exponha links de uso válidos.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
