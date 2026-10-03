import { hash, verify } from '@node-rs/argon2';

// RNF07: senhas armazenadas somente como hash forte (Argon2id).
export function gerarHashSenha(senha: string): Promise<string> {
  return hash(senha);
}

export function verificarSenha(hashSenha: string, senha: string): Promise<boolean> {
  return verify(hashSenha, senha);
}
